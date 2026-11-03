// Cloud Nine Worker: serves the app, guards it with a passcode, stores data, talks to Gemini,
// and relays calendar/news feeds (the browser does the parsing, so the server stays within
// Cloudflare's free-plan CPU limits).
import { PlannerStore } from "./store.js";
import { chat, brief, summarize, planWeek, testKey, listModels, buildChain } from "./ai.js";

export { PlannerStore };

const SESSION_DAYS = 180;
const DOC_KINDS = new Set(["todo", "task", "reminder", "habit", "habitlog", "mood", "countdown", "event", "item", "news", "chat", "subject", "topic", "weekplan", "assignment", "sticker", "stickerimg"]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    try {
      return await route(request, env, url);
    } catch (err) {
      console.error(err);
      return json({ error: err.message || "Something went wrong" }, err.status || 500);
    }
  },
};

function store(env) {
  return env.STORE.get(env.STORE.idFromName("main"));
}

async function route(request, env, url) {
  const p = url.pathname;
  const m = request.method;
  const db = store(env);

  if (!env.APP_PASSCODE || String(env.APP_PASSCODE).length < 4) {
    return json({ error: "APP_PASSCODE is not set. Add it in Cloudflare: Workers & Pages → your Worker → Settings → Variables and Secrets." }, 503);
  }

  // ---------- public routes ----------
  if (p === "/api/login" && m === "POST") {
    if (!(await db.loginAllowed())) return json({ error: "Too many wrong attempts. Try again in 15 minutes." }, 429);
    const { passcode } = await body(request);
    const ok = typeof passcode === "string" && (await safeEqual(passcode, String(env.APP_PASSCODE)));
    await db.loginResult(ok);
    if (!ok) return json({ error: "That passcode doesn’t match." }, 401);
    const token = await makeSession(env);
    return json({ ok: true }, 200, { "Set-Cookie": cookie(token, SESSION_DAYS * 86400) });
  }
  if (p === "/api/logout" && m === "POST") {
    return json({ ok: true }, 200, { "Set-Cookie": cookie("", 0) });
  }

  // iPhone Shortcut endpoints use a bearer token instead of the browser cookie.
  if (p.startsWith("/api/shortcut/") && p !== "/api/shortcut/info") {
    const auth = request.headers.get("Authorization") || "";
    const given = auth.replace(/^Bearer\s+/i, "").trim() || url.searchParams.get("token") || "";
    if (!(await safeEqual(given, await shortcutToken(env)))) return json({ error: "Wrong or missing token" }, 401);
    if (p === "/api/shortcut/reminders" && m === "POST") {
      const incoming = await parseShortcutReminders(request);
      return json(await db.syncAppleReminders(incoming));
    }
    if (p === "/api/shortcut/outbox" && m === "GET") {
      const out = await db.takeReminderOutbox();
      // Plain text is easiest to loop over in Shortcuts: one reminder per line, "title || due".
      if (url.searchParams.get("format") === "text") {
        return new Response(out.map((r) => [r.title, r.due || ""].join(" || ")).join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
      return json({ reminders: out.map((r) => ({ title: r.title, due: r.due || "", notes: r.notes || "" })) });
    }
    return json({ error: "Not found" }, 404);
  }

  // ---------- everything below needs a session ----------
  if (!(await validSession(request, env))) return json({ error: "Please sign in" }, 401);

  if (p === "/api/me") return json({ ok: true });
  if (p === "/api/bootstrap") return json(await db.bootstrap());

  if (p === "/api/settings" && m === "PUT") {
    const patch = await body(request);
    const allowed = ["name", "timezone", "theme", "geminiModel", "geminiKey", "calendars", "newsFeeds", "projects", "customRooms"];
    const clean = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)));
    if (clean.calendars) clean.calendars = clean.calendars.map((c) => ({ ...c, url: normaliseFeedUrl(c.url) }));
    if (clean.newsFeeds) clean.newsFeeds = clean.newsFeeds.map((c) => ({ ...c, url: normaliseFeedUrl(c.url) }));
    await db.updateSettings(clean);
    if ("geminiKey" in clean) { await db.deleteKV("gemini_models"); await db.deleteKV("gemini_cooldown"); }
    return json((await db.bootstrap()).settings);
  }

  // Generic records
  if (p === "/api/docs" && m === "GET") {
    const kind = url.searchParams.get("kind");
    if (!DOC_KINDS.has(kind)) return json({ error: "Unknown kind" }, 400);
    return json(await db.list(kind));
  }
  if (p === "/api/docs" && m === "POST") {
    const { kind, data, id } = await body(request);
    if (!DOC_KINDS.has(kind)) return json({ error: "Unknown kind" }, 400);
    return json(id ? await db.upsert(kind, String(id), data || {}) : await db.create(kind, data || {}));
  }
  const docMatch = p.match(/^\/api\/docs\/([^/]+)$/);
  if (docMatch) {
    const id = decodeURIComponent(docMatch[1]);
    if (m === "PUT") return json((await db.update(id, await body(request))) || { error: "Not found" });
    if (m === "DELETE") return json(await db.remove(id));
  }

  // News: the browser parses feeds and posts the headlines here.
  if (p === "/api/news" && m === "POST") {
    const { items = [], status } = await body(request);
    const safe = items.slice(0, 300).map((it) => ({
      key: String(it.key || it.link || it.title).slice(0, 300),
      section: it.section === "legal" ? "legal" : "ca",
      source: String(it.source || "").slice(0, 80),
      title: String(it.title || "").slice(0, 400),
      link: String(it.link || "").slice(0, 1000),
      published: String(it.published || ""),
      saved: false,
    }));
    const added = await db.saveNews(safe);
    if (status) await db.setKV("news_status", { ...status, at: new Date().toISOString(), added });
    return json({ added });
  }

  // Feed relay: only for URLs the user saved in Settings (never an open proxy).
  const feedMatch = p.match(/^\/api\/feed\/(calendar|news)\/([^/]+)$/);
  if (feedMatch && m === "GET") {
    const settings = await db.getSettings();
    const list = feedMatch[1] === "calendar" ? settings.calendars : settings.newsFeeds;
    const src = (list || []).find((s) => s.id === decodeURIComponent(feedMatch[2]));
    if (!src) return json({ error: "Unknown feed" }, 404);
    return relay(src.url, feedMatch[1] === "calendar" ? 300 : 900);
  }
  const articleMatch = p.match(/^\/api\/article\/(.+)$/);
  if (articleMatch && m === "GET") {
    const item = await db.get(decodeURIComponent(articleMatch[1]));
    if (!item || item.kind !== "news" || !/^https?:\/\//.test(item.link)) return json({ error: "Unknown article" }, 404);
    return relay(item.link, 3600);
  }

  // Gemini
  if (p.startsWith("/api/ai/") && m === "POST") {
    const settings = await db.getSettings();
    const input = await body(request);
    const key = input.key || settings.geminiKey || (env.GEMINI_API_KEY && env.GEMINI_API_KEY !== "none" ? env.GEMINI_API_KEY : "");
    // "gemini-flash-latest" was the old default; treat it as Automatic.
    const preferred = input.model || (settings.geminiModel && settings.geminiModel !== "gemini-flash-latest" ? settings.geminiModel : "auto");
    if (!key) return json({ error: "Add your free Gemini API key in Settings → Cloudy (AI) first." }, 400);

    const models = await knownModels(db, key, !!input.key || p === "/api/ai/models");
    const cool = (await db.getKV("gemini_cooldown")) || {};
    const chainFor = (task) => {
      const full = buildChain(models, preferred, task);
      const ready = full.filter((m) => !(cool[m] > Date.now()));
      return ready.length ? ready : full;
    };
    const remember = async (ai) => {
      const now = Date.now();
      const next = Object.fromEntries(Object.entries(cool).filter(([, t]) => t > now));
      for (const f of ai.failures || []) next[f.model] = now + (f.status === 429 ? 60 : 2) * 60000;
      if (ai.used) delete next[ai.used];
      await db.setKV("gemini_cooldown", next);
    };
    const run = async (task, fn) => {
      const ai = { key, chain: chainFor(task), tz: settings.timezone, name: settings.name };
      try { return { ai, out: await fn(ai) }; }
      finally { await remember(ai); }
    };

    if (p === "/api/ai/models") {
      return json({ models, preferred, smart: buildChain(models, preferred, "smart"), light: buildChain(models, preferred, "light"), cooling: Object.keys(cool).filter((m) => cool[m] > Date.now()) });
    }
    if (p === "/api/ai/test") {
      const r = await testKey(key, chainFor("light"));
      return json(r);
    }
    const data = await db.bootstrap();
    if (p === "/api/ai/chat") {
      const history = data.chat.slice(-12);
      const { ai, out: reply } = await run("smart", (ai) => chat(ai, data, input, history));
      await db.create("chat", { role: "user", text: String(input.message || "").slice(0, 4000) });
      const saved = await db.create("chat", { role: "model", text: reply, model: ai.used });
      return json({ reply, id: saved.id, model: ai.used });
    }
    if (p === "/api/ai/brief") {
      const { ai, out: text } = await run("light", (ai) => brief(ai, data, input));
      const b = { text, date: input.today, at: new Date().toISOString(), model: ai.used };
      await db.setKV("brief", b);
      return json(b);
    }
    if (p === "/api/ai/summarize") {
      const { ai, out: text } = await run("light", (ai) => summarize(ai, input));
      if (input.newsId) await db.update(input.newsId, { summary: text });
      return json({ summary: text, model: ai.used });
    }
    if (p === "/api/ai/plan") {
      const { ai, out: plan } = await run("smart", (ai) => planWeek(ai, data, input));
      return json({ ...plan, model: ai.used });
    }
  }
  if (p === "/api/chat" && m === "DELETE") {
    await db.removeWhere("chat", () => true);
    return json({ ok: true });
  }

  if (p === "/api/shortcut/info") {
    const origin = url.origin;
    return json({ token: await shortcutToken(env), sendUrl: `${origin}/api/shortcut/reminders`, outboxUrl: `${origin}/api/shortcut/outbox?format=text` });
  }

  if (p === "/api/export") {
    const data = await db.exportAll();
    return new Response(JSON.stringify(data, null, 2), {
      headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="cloud-nine-backup-${new Date().toISOString().slice(0, 10)}.json"` },
    });
  }

  return json({ error: "Not found" }, 404);
}

// ---------- helpers ----------
// Which Gemini models this key can use, refreshed once a day.
async function knownModels(db, key, fresh = false) {
  const tag = key.slice(-6);
  const cached = await db.getKV("gemini_models");
  if (!fresh && cached && cached.tag === tag && Date.now() - cached.at < 86400000 && cached.models.length) return cached.models;
  try {
    const models = await listModels(key);
    await db.setKV("gemini_models", { tag, at: Date.now(), models });
    return models;
  } catch {
    return cached?.models || [];
  }
}
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers } });
}
async function body(request) {
  try { return await request.json(); } catch { return {}; }
}
function normaliseFeedUrl(u) {
  return String(u || "").trim().replace(/^webcal:\/\//i, "https://");
}
async function relay(target, maxAge) {
  let res;
  try {
    res = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CloudNinePlanner/1.0)", Accept: "text/calendar, application/rss+xml, application/xml, text/html, */*" },
      redirect: "follow",
    });
  } catch {
    return json({ error: "Couldn’t reach that link. Check it opens in your browser." }, 502);
  }
  if (res.status === 404 || res.status === 403) return json({ error: `The link was refused (${res.status}). It may be private or mistyped.` }, 502);
  if (!res.ok) return json({ error: `The source answered ${res.status}` }, 502);
  return new Response(res.body, {
    headers: { "Content-Type": res.headers.get("Content-Type") || "text/plain", "Cache-Control": `private, max-age=${maxAge}` },
  });
}

// Sessions: "<issuedAt>.<hmac>" signed with the passcode, so changing the passcode signs everyone out.
async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function makeSession(env) {
  const issued = Date.now().toString();
  return `${issued}.${await hmac(String(env.APP_PASSCODE), "session:" + issued)}`;
}
async function validSession(request, env) {
  const c = (request.headers.get("Cookie") || "").split(/;\s*/).find((x) => x.startsWith("cn_session="));
  if (!c) return false;
  const [issued, sig] = c.slice("cn_session=".length).split(".");
  if (!issued || !sig) return false;
  if (Date.now() - Number(issued) > SESSION_DAYS * 86400 * 1000) return false;
  return safeEqual(sig, await hmac(String(env.APP_PASSCODE), "session:" + issued));
}
async function shortcutToken(env) {
  return (await hmac(String(env.APP_PASSCODE), "shortcut-token")).slice(0, 32);
}
function cookie(value, maxAge) {
  return `cn_session=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
async function safeEqual(a, b) {
  const [x, y] = await Promise.all([hmac("cmp", String(a)), hmac("cmp", String(b))]);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.min(x.length, y.length); i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

// The Shortcut can send JSON ({reminders:[...]}) or plain text, one reminder per line:
//   Title || 2026-11-03T18:00:00+05:30 || 2026-10-30T09:12:00+05:30
//   (title, due date, creation date). Due and creation date may be empty.
async function parseShortcutReminders(request) {
  const type = request.headers.get("Content-Type") || "";
  let rows = [];
  if (type.includes("application/json")) {
    const b = await body(request);
    rows = Array.isArray(b) ? b : b.reminders || [];
    if (typeof b.lines === "string") rows = linesToRows(b.lines);
  } else if (type.includes("form")) {
    const f = await request.formData();
    rows = linesToRows(String(f.get("lines") || f.get("text") || ""));
  } else {
    rows = linesToRows(await request.text());
  }
  return rows
    .map((r) => ({
      title: String(r.title || "").trim().slice(0, 300),
      due: String(r.due || "").trim(),
      notes: String(r.notes || "").slice(0, 2000),
      list: String(r.list || "").slice(0, 100),
      key: String(r.key || `${String(r.title || "").trim()}|${String(r.created || "").trim()}`).slice(0, 400),
    }))
    .filter((r) => r.title);
}
function linesToRows(text) {
  return String(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [title, due, created] = l.split("||").map((s) => (s || "").trim());
      return { title, due, created };
    });
}
