// PlannerStore: one private SQLite database holding everything in the planner.
// Every record is a "doc" with a kind (todo, task, reminder, habit, ...) and a JSON body.
import { DurableObject } from "cloudflare:workers";
import { SEED_CERTIFICATIONS, DEFAULT_HABITS, DEFAULT_SETTINGS } from "./seed.js";

const now = () => Date.now();

export class PlannerStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    ctx.blockConcurrencyWhile(async () => this.#migrate());
  }

  #migrate() {
    this.sql.exec(`CREATE TABLE IF NOT EXISTS docs (
      id TEXT PRIMARY KEY, kind TEXT NOT NULL, data TEXT NOT NULL,
      created INTEGER NOT NULL, updated INTEGER NOT NULL)`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS docs_kind ON docs(kind, updated)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)`);
    if (!this.getKV("seeded")) this.#seed();
  }

  #seed() {
    this.setKV("settings", DEFAULT_SETTINGS);
    DEFAULT_HABITS.forEach((h, i) => this.create("habit", { ...h, order: i }));
    SEED_CERTIFICATIONS.forEach((c) => this.create("item", { room: "certs", ...c }));
    this.setKV("seeded", { at: now() });
  }

  // ---------- key/value ----------
  getKV(k) {
    const row = this.sql.exec(`SELECT v FROM kv WHERE k = ?`, k).toArray()[0];
    return row ? JSON.parse(row.v) : null;
  }
  setKV(k, v) {
    this.sql.exec(`INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v`, k, JSON.stringify(v));
    return v;
  }
  deleteKV(k) {
    this.sql.exec(`DELETE FROM kv WHERE k = ?`, k);
  }

  // ---------- settings ----------
  getSettings() {
    return { ...DEFAULT_SETTINGS, ...(this.getKV("settings") || {}) };
  }
  updateSettings(patch) {
    const next = { ...this.getSettings(), ...patch };
    this.setKV("settings", next);
    return next;
  }

  // ---------- docs ----------
  #row(r) {
    return { id: r.id, kind: r.kind, created: r.created, updated: r.updated, ...JSON.parse(r.data) };
  }
  list(kind, limit = 2000) {
    return this.sql
      .exec(`SELECT * FROM docs WHERE kind = ? ORDER BY created ASC LIMIT ?`, kind, limit)
      .toArray()
      .map((r) => this.#row(r));
  }
  listRecent(kind, limit = 60) {
    return this.sql
      .exec(`SELECT * FROM docs WHERE kind = ? ORDER BY updated DESC LIMIT ?`, kind, limit)
      .toArray()
      .map((r) => this.#row(r));
  }
  get(id) {
    const r = this.sql.exec(`SELECT * FROM docs WHERE id = ?`, id).toArray()[0];
    return r ? this.#row(r) : null;
  }
  create(kind, data, id = crypto.randomUUID()) {
    const t = now();
    const clean = stripMeta(data);
    this.sql.exec(`INSERT INTO docs (id, kind, data, created, updated) VALUES (?, ?, ?, ?, ?)`, id, kind, JSON.stringify(clean), t, t);
    return { id, kind, created: t, updated: t, ...clean };
  }
  upsert(kind, id, data) {
    const existing = this.get(id);
    if (!existing) return this.create(kind, data, id);
    return this.update(id, data);
  }
  update(id, patch) {
    const cur = this.get(id);
    if (!cur) return null;
    const merged = { ...stripMeta(cur), ...stripMeta(patch) };
    const t = now();
    this.sql.exec(`UPDATE docs SET data = ?, updated = ? WHERE id = ?`, JSON.stringify(merged), t, id);
    return { id, kind: cur.kind, created: cur.created, updated: t, ...merged };
  }
  remove(id) {
    this.sql.exec(`DELETE FROM docs WHERE id = ?`, id);
    return { ok: true };
  }
  removeWhere(kind, predicate) {
    const victims = this.list(kind).filter(predicate);
    victims.forEach((d) => this.remove(d.id));
    return victims.length;
  }

  // Everything the dashboard needs, in one round trip.
  bootstrap() {
    const settings = this.getSettings();
    return {
      settings: publicSettings(settings, this.env),
      todos: this.list("todo"),
      tasks: this.list("task"),
      reminders: this.list("reminder"),
      habits: this.list("habit").sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      habitlogs: this.list("habitlog"),
      moods: this.list("mood"),
      countdowns: this.list("countdown"),
      events: this.list("event"),
      items: this.list("item"),
      subjects: this.list("subject").sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      topics: this.list("topic"),
      weekplans: this.list("weekplan"),
      assignments: this.list("assignment"),
      stickers: this.list("sticker"),
      stickerimgs: this.list("stickerimg"),
      news: this.listRecent("news", 120),
      chat: this.listRecent("chat", 40).reverse(),
      status: {
        reminders: this.getKV("reminders_sync") || null,
        news: this.getKV("news_status") || null,
        calendars: this.getKV("calendar_status") || null,
      },
      brief: this.getKV("brief") || null,
    };
  }

  // Full export for backups.
  exportAll() {
    const docs = this.sql.exec(`SELECT * FROM docs ORDER BY created`).toArray().map((r) => this.#row(r));
    const settings = this.getSettings();
    delete settings.geminiKey;
    return { app: "cloud-nine", version: 1, exportedAt: new Date().toISOString(), settings, docs };
  }

  // ---------- news ----------
  saveNews(items) {
    let added = 0;
    for (const it of items) {
      const id = "news:" + it.key;
      if (this.get(id)) continue;
      this.create("news", it, id);
      added++;
    }
    // Keep the newest 400 unsaved headlines, and everything that was saved to the log.
    const all = this.listRecent("news", 5000);
    all.filter((n) => !n.saved).slice(400).forEach((n) => this.remove(n.id));
    return added;
  }

  // ---------- login throttle ----------
  loginAllowed() {
    const s = this.getKV("login_throttle") || { fails: 0, until: 0 };
    return now() > s.until;
  }
  loginResult(ok) {
    if (ok) return this.deleteKV("login_throttle");
    const s = this.getKV("login_throttle") || { fails: 0, until: 0 };
    s.fails += 1;
    if (s.fails >= 8) {
      s.until = now() + 15 * 60 * 1000;
      s.fails = 0;
    }
    this.setKV("login_throttle", s);
  }

  // ---------- Apple Reminders via iPhone Shortcut ----------
  // `incoming` = every reminder that is still open on the iPhone.
  syncAppleReminders(incoming) {
    const existing = this.list("reminder").filter((r) => r.source === "apple");
    const seen = new Set();
    let added = 0, updated = 0, completed = 0;
    for (const r of incoming) {
      const key = r.key;
      seen.add(key);
      const match = existing.find((e) => e.appleKey === key);
      const body = { title: r.title, due: r.due || "", notes: r.notes || "", list: r.list || "", source: "apple", appleKey: key, done: false };
      // A reminder made in Cloud Nine and already sent to the iPhone comes back here once:
      // link it instead of creating a duplicate.
      const fromApp = !match && this.list("reminder").find((e) => e.source !== "apple" && e.sentToPhone && !e.done && e.title.trim() === body.title.trim());
      if (match) {
        if (match.title !== body.title || match.due !== body.due || match.done) { this.update(match.id, body); updated++; }
      } else if (fromApp) {
        this.update(fromApp.id, { ...body, due: body.due || fromApp.due });
        existing.push({ ...fromApp, ...body });
        updated++;
      } else { this.create("reminder", body); added++; }
    }
    // Anything that vanished from the iPhone's open list was completed (or deleted) there.
    for (const e of existing) {
      if (!seen.has(e.appleKey) && !e.done) { this.update(e.id, { done: true, completedOnPhone: true }); completed++; }
    }
    const status = { at: new Date().toISOString(), received: incoming.length, added, updated, completed };
    this.setKV("reminders_sync", status);
    return status;
  }
  // Reminders created inside Cloud Nine that the iPhone has not picked up yet.
  takeReminderOutbox() {
    const out = this.list("reminder").filter((r) => r.source !== "apple" && !r.done && !r.sentToPhone);
    out.forEach((r) => this.update(r.id, { sentToPhone: true }));
    return out;
  }
}

function stripMeta(d) {
  const { id, kind, created, updated, ...rest } = d || {};
  return rest;
}

export function publicSettings(s, env) {
  const { geminiKey, ...rest } = s;
  const envKey = env && env.GEMINI_API_KEY && !["none", ""].includes(String(env.GEMINI_API_KEY).trim());
  return { ...rest, hasGeminiKey: Boolean(geminiKey) || Boolean(envKey), geminiKeyFrom: geminiKey ? "settings" : envKey ? "cloudflare" : "" };
}
