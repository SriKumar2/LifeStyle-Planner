// Cloud Nine front end. Plain JavaScript, no build step.
import ICAL from "/vendor/ical.min.js";

const GUIDE_URL = "https://github.com/SriKumar2/LifeStyle-Planner/tree/main/docs";
const HOUR_PX = 46;
const TIMER_SECONDS = 25 * 60;

/* ============================== helpers ============================== */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const startOfWeek = (d) => addDays(dayStart(d), -((d.getDay() + 6) % 7));
const todayYmd = () => ymd(new Date());
const weekDates = (offset = 0) => { const s = addDays(startOfWeek(new Date()), offset * 7); return [...Array(7)].map((_, i) => ymd(addDays(s, i))); };
const DOW = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const fmtTime = (d) => { const h = d.getHours(), m = d.getMinutes(); return `${((h + 11) % 12) + 1}${m ? ":" + pad(m) : ""}${h >= 12 ? "pm" : "am"}`; };
const fmtDay = (d) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const daysBetween = (a, b) => Math.round((dayStart(b) - dayStart(a)) / 86400000);
const ago = (iso) => {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso)) / 1000;
  if (isNaN(s)) return "";
  if (s < 90) return "just now";
  if (s < 3600) return Math.round(s / 60) + " min ago";
  if (s < 86400) return Math.round(s / 3600) + " h ago";
  return Math.round(s / 86400) + " d ago";
};
const COLORS = ["sky", "periwinkle", "mint", "sage", "powder", "ice", "teal"];
const SUBJECT_COLOR = { "Current affairs": "periwinkle", "Legal news": "powder", "PG diploma": "sky", Certification: "teal", Research: "mint", Other: "ice" };
const PRIO = [{ k: "soft", c: "var(--sage)", l: "soft" }, { k: "important", c: "var(--asterisk)", l: "important" }, { k: "urgent", c: "var(--rose)", l: "urgent" }];
const QUOTES = [
  "Slow progress is still progress.", "Be gentle with yourself; you are doing the best you can.", "Small steps every day add up to big things.",
  "Injustice anywhere is a threat to justice everywhere. — Martin Luther King Jr.", "You are allowed to be both a masterpiece and a work in progress.",
  "Every expert was once a beginner.", "Rest is productive too.", "Bloom where you are planted.",
  "What you do every day matters more than what you do once in a while.", "Dream big, work hard, stay kind.",
  "One page, one case, one chapter at a time.", "Your future self is cheering for you.", "Be soft. Do not let the world make you hard.",
  "Discipline is choosing what you want most over what you want now.", "Be the reason someone believes in kindness today.",
];
const tick = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const appleIcon = '<svg class="apple" viewBox="0 0 24 24" aria-label="from Apple Reminders"><path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.8zM14.1 5.8c.6-.8 1.1-1.8 1-2.8-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.7-1 2.7 1 .1 2-.5 2.7-1.3z"/></svg>';
const ICONS = {
  leaf: '<svg class="ico" viewBox="0 0 24 24"><path d="M12 20v-8M12 12c0-4 3-6 7-6 0 4-3 6-7 6zM12 14c0-3-2-5-6-5 0 3 2 5 6 5z"/></svg>',
  book: '<svg class="ico" viewBox="0 0 24 24"><path d="M5 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H5zM19 5h-4a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h4z"/></svg>',
  cap: '<svg class="ico" viewBox="0 0 24 24"><path d="M12 4l8 4-8 4-8-4zM6 10v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4"/></svg>',
  star: '<svg class="ico" viewBox="0 0 24 24"><path d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4 7.2 18.9l.9-5.4-3.9-3.8 5.4-.8z"/></svg>',
};

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove("show"), 2800);
}
// Tiny, safe Markdown for AI answers: **bold**, bullet and numbered lists, paragraphs.
function md(text) {
  const lines = esc(text).split(/\r?\n/);
  let html = "", list = null;
  const close = () => { if (list) { html += `</${list}>`; list = null; } };
  for (const raw of lines) {
    const line = raw.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|\s)\*(\S.*?)\*(?=\s|$)/g, "$1<i>$2</i>");
    const ul = line.match(/^\s*[-*•]\s+(.*)/), ol = line.match(/^\s*\d+[.)]\s+(.*)/);
    if (ul) { if (list !== "ul") { close(); html += "<ul>"; list = "ul"; } html += `<li>${ul[1]}</li>`; }
    else if (ol) { if (list !== "ol") { close(); html += "<ol>"; list = "ol"; } html += `<li>${ol[1]}</li>`; }
    else if (!line.trim()) close();
    else { close(); html += `<p>${line}</p>`; }
  }
  close();
  return html;
}

/* ============================== API ============================== */
async function api(path, { method, body } = {}) {
  const res = await fetch(path, {
    method: method || (body ? "POST" : "GET"),
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  const type = res.headers.get("Content-Type") || "";
  const data = type.includes("json") ? await res.json().catch(() => ({})) : await res.text();
  if (res.status === 401 && path !== "/api/login") { showLogin(); throw new Error("Please sign in"); }
  if (!res.ok) throw new Error((data && data.error) || `Something went wrong (${res.status})`);
  return data;
}
const COLL = { todo: "todos", task: "tasks", reminder: "reminders", habit: "habits", habitlog: "habitlogs", mood: "moods", countdown: "countdowns", event: "events", item: "items", news: "news", chat: "chat" };
async function add(kind, data, id) {
  const doc = await api("/api/docs", { body: { kind, data, id } });
  const arr = S.data[COLL[kind]];
  const i = arr.findIndex((x) => x.id === doc.id);
  if (i >= 0) arr[i] = doc; else arr.push(doc);
  return doc;
}
async function patch(doc, p) {
  Object.assign(doc, p);
  try { Object.assign(doc, await api(`/api/docs/${encodeURIComponent(doc.id)}`, { method: "PUT", body: p })); }
  catch (e) { toast(e.message); await reload(); }
  return doc;
}
async function drop(kind, id) {
  const arr = S.data[COLL[kind]];
  const i = arr.findIndex((x) => x.id === id);
  if (i >= 0) arr.splice(i, 1);
  try { await api(`/api/docs/${encodeURIComponent(id)}`, { method: "DELETE" }); } catch (e) { toast(e.message); await reload(); }
}
async function saveSettings(p) {
  S.data.settings = await api("/api/settings", { method: "PUT", body: p });
  return S.data.settings;
}

/* ============================== state ============================== */
const S = {
  data: null,
  syncedAt: 0,
  cal: { range: "week", offset: 0, sources: new Map(), errors: {} },
  todo: { offset: 0, day: todayYmd() },
  newsTab: "ca",
  newsMore: false,
  showDoneRem: false,
  timer: { id: null, taskId: null, left: 0, paused: false },
};

/* ============================== boot & sign-in ============================== */
function showLogin() {
  $("#app").hidden = true;
  $("#login").hidden = false;
  setTimeout(() => $("#passcode").focus(), 50);
}
$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("#loginError").textContent = "";
  try {
    await api("/api/login", { body: { passcode: $("#passcode").value } });
    $("#passcode").value = "";
    await boot();
  } catch (err) {
    $("#loginError").textContent = err.message;
  }
});

async function reload() {
  S.data = await api("/api/bootstrap");
  S.syncedAt = Date.now();
}

async function boot() {
  try {
    await reload();
  } catch (e) {
    if ($("#login").hidden) { document.body.innerHTML = `<p style="padding:24px;font-family:sans-serif">${esc(e.message)}</p>`; }
    return;
  }
  $("#login").hidden = true;
  $("#app").hidden = false;
  renderAll();
  loadCalendars();
  maybeRefreshNews();
  maybeBrief();
}

let lastDay = todayYmd();
setInterval(() => {
  if (!S.data) return;
  if (todayYmd() !== lastDay) { lastDay = todayYmd(); S.todo.day = lastDay; renderAll(); maybeBrief(); return; }
  renderHeader();
  if (S.cal.range === "week" && S.cal.offset === 0) renderCalendar();
}, 60000);

// Pick up changes made on another device when the app comes back into view.
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState !== "visible" || !S.data || Date.now() - S.syncedAt < 60000) return;
  if (!$("#sheet").hidden || S.timer.id) return;
  try { await reload(); renderAll(); maybeRefreshNews(); } catch {}
});

function renderAll() {
  renderHeader(); renderChips(); renderStrip(); renderCalendar(); renderFocus(); renderReminders();
  renderTodo(); renderNews(); renderHabits(); renderMood(); renderProjects(); renderChat();
}

/* ============================== header ============================== */
function renderHeader() {
  const now = new Date();
  $("#today").textContent = `${now.toLocaleDateString("en-GB", { weekday: "long" })} · ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  const h = now.getHours();
  const g = h < 12 ? "good morning" : h < 17 ? "good afternoon" : "good evening";
  $("#greeting").innerHTML = `${g}, <em>${esc(S.data.settings.name || "lovely")}</em>`;
  const doy = daysBetween(new Date(now.getFullYear(), 0, 1), now);
  $("#quote").textContent = `“${QUOTES[doy % QUOTES.length]}”`;
}

function renderChips() {
  const st = S.data.status, set = S.data.settings;
  const calErr = Object.keys(S.cal.errors).length;
  const chips = [];
  chips.push(`<button class="chip${calErr ? " warn" : ""}" data-action="settings" data-tab="calendars"><span class="dot" style="background:var(--sky)"></span>${calErr ? `Calendar · ${calErr} problem${calErr > 1 ? "s" : ""}` : `Calendars · ${set.calendars.length}`}</button>`);
  chips.push(`<button class="chip" data-action="settings" data-tab="reminders">${appleIcon}Reminders · ${st.reminders ? ago(st.reminders.at) : "set up"}</button>`);
  chips.push(`<button class="chip${set.hasGeminiKey ? "" : " warn"}" data-action="settings" data-tab="ai"><span class="dot" style="background:var(--teal)"></span>Cloudy · ${set.hasGeminiKey ? "ready" : "add key"}</button>`);
  const dark = isDark();
  chips.push(`<button class="iconbtn" data-action="theme" aria-label="${dark ? "Switch to day mode" : "Switch to night mode"}" title="Day / night">${dark
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>'}</button>`);
  $("#chips").innerHTML = chips.join("");
}
const isDark = () => { const t = document.documentElement.dataset.theme; return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; };
function setTheme(t) {
  if (t === "system") { delete document.documentElement.dataset.theme; try { localStorage.removeItem("cn-theme"); } catch {} }
  else { document.documentElement.dataset.theme = t; try { localStorage.setItem("cn-theme", t); } catch {} }
  renderChips();
}

/* ============================== brief + countdowns ============================== */
function localBrief() {
  const t = todayYmd();
  const tasks = S.data.tasks.filter((x) => x.date === t && !x.done);
  const mins = tasks.reduce((a, x) => a + (+x.minutes || 0), 0);
  const due = S.data.reminders.filter((r) => !r.done && r.due && r.due.slice(0, 10) === t);
  const toRevise = S.data.news.filter((n) => n.saved && !n.revised).length;
  const parts = [];
  parts.push(tasks.length ? `${tasks.length} study block${tasks.length > 1 ? "s" : ""} left today (${Math.floor(mins / 60) ? Math.floor(mins / 60) + " h " : ""}${mins % 60} min)` : "No study blocks planned for today yet");
  if (due.length) parts.push(`${due.length} reminder${due.length > 1 ? "s" : ""} due today`);
  if (toRevise) parts.push(`${toRevise} saved headline${toRevise > 1 ? "s" : ""} to revise`);
  return parts.join(" · ");
}
function renderStrip() {
  const b = S.data.brief;
  const aiToday = b && b.date === todayYmd() && b.text;
  const brief = `<button class="brief" data-action="ai-open"><img src="/icons/icon-192.png" alt="" width="24" height="24"><span><b>${aiToday ? "Cloudy’s brief:" : "Today:"}</b> ${esc(aiToday ? b.text : localBrief())}</span><span class="by">${aiToday ? "Gemini" : S.data.settings.hasGeminiKey ? "" : "add a Gemini key for AI briefs"}</span></button>`;
  const t = new Date();
  const counts = S.data.countdowns
    .map((c) => ({ ...c, days: daysBetween(t, parseYmd(c.date)) }))
    .filter((c) => c.days >= 0)
    .sort((a, b) => a.days - b.days)
    .slice(0, 4)
    .map((c) => `<button class="count${c.days <= 7 ? " urgent" : ""}" data-action="countdown-edit" data-id="${esc(c.id)}"><div class="n num">${c.days === 0 ? "today" : c.days}${c.days ? `<small>day${c.days > 1 ? "s" : ""}</small>` : ""}</div><div class="l">${esc(c.title)}</div></button>`)
    .join("");
  $("#strip").innerHTML = brief + counts + `<button class="count add" data-action="countdown-edit">+ countdown</button>`;
}
async function maybeBrief(force = false) {
  const b = S.data.brief;
  if (!S.data.settings.hasGeminiKey) return;
  if (!force && b && b.date === todayYmd()) return;
  try {
    S.data.brief = await api("/api/ai/brief", { body: aiContext() });
    renderStrip();
  } catch (e) { console.warn("brief", e.message); }
}
function openCountdown(id) {
  const c = S.data.countdowns.find((x) => x.id === id) || { title: "", date: ymd(addDays(new Date(), 14)) };
  sheet(id ? "Edit countdown" : "New countdown", "", `
    <div class="field"><label for="cdTitle">What are you counting down to?</label><input id="cdTitle" value="${esc(c.title)}" placeholder="ILI exam, trip, birthday…"></div>
    <div class="field"><label for="cdDate">Date</label><input id="cdDate" type="date" value="${esc(c.date)}"></div>
    <div class="actions">${id ? '<button class="btn danger left" data-action="countdown-delete" data-id="' + esc(id) + '">Delete</button>' : ""}<button class="btn" data-action="countdown-save" data-id="${esc(id || "")}">Save</button></div>`);
  $("#cdTitle").focus();
}

/* ============================== calendar ============================== */
function parseICS(text) {
  const comp = new ICAL.Component(ICAL.parse(text));
  for (const vtz of comp.getAllSubcomponents("vtimezone")) {
    try { const tz = new ICAL.Timezone(vtz); if (tz.tzid && !ICAL.TimezoneService.has(tz.tzid)) ICAL.TimezoneService.register(tz); } catch {}
  }
  const exceptions = new Map(), masters = [];
  for (const ve of comp.getAllSubcomponents("vevent")) {
    if (ve.hasProperty("recurrence-id")) {
      const uid = ve.getFirstPropertyValue("uid");
      if (!exceptions.has(uid)) exceptions.set(uid, []);
      exceptions.get(uid).push(ve);
    } else masters.push(ve);
  }
  return masters.map((ve) => {
    try { return new ICAL.Event(ve, { strictExceptions: true, exceptions: exceptions.get(ve.getFirstPropertyValue("uid")) || [] }); }
    catch { return null; }
  }).filter(Boolean);
}
function occurrence(item, sDate, eDate, src) {
  const allDay = sDate.isDate;
  const start = sDate.toJSDate();
  let end = eDate ? eDate.toJSDate() : null;
  if (!end || end <= start) end = allDay ? addDays(start, 1) : new Date(+start + 3600000);
  return { title: item.summary || "(busy)", location: item.location || "", description: item.description || "", start, end, allDay, color: src.color || "sky", source: src.name, holiday: !!src.holiday, external: true };
}
function expandSource(events, src, from, to) {
  const out = [];
  for (const ev of events) {
    try {
      if (ev.isRecurring()) {
        const it = ev.iterator();
        let next, guard = 0;
        while ((next = it.next()) && guard++ < 6000) {
          if (next.toJSDate() > to) break;
          const d = ev.getOccurrenceDetails(next);
          const o = occurrence(d.item, d.startDate, d.endDate, src);
          if (o.end > from && o.start < to) out.push(o);
        }
      } else {
        const o = occurrence(ev, ev.startDate, ev.endDate, src);
        if (o.end > from && o.start < to) out.push(o);
      }
    } catch {}
  }
  return out;
}
function localEvents(from, to) {
  return S.data.events.map((e) => {
    const d = parseYmd(e.date);
    let start = d, end = addDays(d, 1), allDay = !e.start;
    if (e.start) {
      const [sh, sm] = e.start.split(":").map(Number);
      start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), sh, sm);
      const [eh, em] = (e.end || "").split(":").map(Number);
      end = e.end ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), eh, em) : new Date(+start + 3600000);
      if (end <= start) end = new Date(+start + 3600000);
    }
    return { id: e.id, title: e.title, location: e.location || "", description: e.notes || "", start, end, allDay, color: e.color || "ice", source: "My events", external: false };
  }).filter((o) => o.end > from && o.start < to);
}
function eventsBetween(from, to) {
  const out = localEvents(from, to);
  for (const src of S.data.settings.calendars) {
    const parsed = S.cal.sources.get(src.id);
    if (parsed) out.push(...expandSource(parsed.events, src, from, to));
  }
  return out.sort((a, b) => a.start - b.start);
}
async function loadCalendars(force = false) {
  const srcs = S.data.settings.calendars;
  await Promise.all(srcs.map(async (src) => {
    const cached = S.cal.sources.get(src.id);
    if (!force && cached && Date.now() - cached.at < 5 * 60000) return;
    try {
      const text = await api(`/api/feed/calendar/${encodeURIComponent(src.id)}`);
      if (typeof text !== "string" || !text.includes("BEGIN:VCALENDAR")) throw new Error("That link didn’t return a calendar file");
      S.cal.sources.set(src.id, { at: Date.now(), events: parseICS(text) });
      delete S.cal.errors[src.id];
    } catch (e) {
      S.cal.errors[src.id] = e.message;
    }
  }));
  for (const id of [...S.cal.sources.keys()]) if (!srcs.find((s) => s.id === id)) S.cal.sources.delete(id);
  renderCalendar();
  renderChips();
}
function renderLegend() {
  const srcs = S.data.settings.calendars.map((s) => `<span title="${esc(S.cal.errors[s.id] || "")}"><i class="dot" style="background:var(--${esc(s.color || "sky")})"></i>${esc(s.name)}${S.cal.errors[s.id] ? ' <span class="err">· couldn’t load</span>' : ""}</span>`);
  srcs.push(`<span><i class="dot" style="background:var(--ice);box-shadow:0 0 0 1px var(--line)"></i>My events</span>`);
  if (!S.data.settings.calendars.some((s) => !s.holiday)) srcs.push(`<button class="link" data-action="settings" data-tab="calendars">+ connect Google or Apple Calendar</button>`);
  $("#legend").innerHTML = srcs.join("");
}
function renderCalendar() {
  renderLegend();
  const c = S.cal;
  $$('[data-action="cal-range"]').forEach((b) => b.setAttribute("aria-pressed", b.dataset.range === c.range));
  $("#calWord").textContent = c.range;
  if (c.range === "week") renderWeek(); else renderMonth();
}
function renderWeek() {
  const dates = weekDates(S.cal.offset).map(parseYmd);
  const from = dates[0], to = addDays(dates[6], 1);
  const last = dates[6];
  $("#calSub").textContent = from.getMonth() === last.getMonth()
    ? `${from.getDate()} – ${last.getDate()} ${MONTHS[from.getMonth()]} ${from.getFullYear()}`
    : `${from.getDate()} ${MONTHS[from.getMonth()].slice(0, 3)} – ${last.getDate()} ${MONTHS[last.getMonth()].slice(0, 3)} ${last.getFullYear()}`;
  const evs = eventsBetween(from, to);
  const timed = evs.filter((e) => !e.allDay);
  let h0 = 7, h1 = 22;
  for (const e of timed) {
    h0 = Math.min(h0, Math.max(0, e.start.getHours()));
    h1 = Math.max(h1, Math.min(24, e.end.getHours() + (e.end.getMinutes() ? 1 : 0) || 24));
  }
  const today = todayYmd();
  let h = '<div class="week"><div></div>';
  dates.forEach((d, i) => {
    const all = evs.filter((e) => e.allDay && e.start < addDays(d, 1) && e.end > d);
    h += `<div class="dayhead${ymd(d) === today ? " today" : ""}"><div class="dn">${DOW[i]}</div><div class="dd num">${d.getDate()}</div>${all.length ? `<div class="allday">${all.map((e) => pill(e)).join("")}</div>` : ""}</div>`;
  });
  h += '<div class="hours">';
  for (let x = h0; x < h1; x++) h += `<div class="num">${x === h0 ? "" : fmtTime(new Date(2000, 0, 1, x))}</div>`;
  h += "</div>";
  S.cal.visible = [];
  dates.forEach((d) => {
    const ds = d, de = addDays(d, 1);
    const day = timed.filter((e) => e.start < de && e.end > ds).map((e) => ({ ...e, s: Math.max(+e.start, +ds), en: Math.min(+e.end, +de) }));
    layoutLanes(day);
    h += `<div class="col${ymd(d) === today ? " today" : ""}" style="height:${(h1 - h0) * HOUR_PX}px" data-action="cal-slot" data-date="${ymd(d)}" data-h0="${h0}">`;
    for (const e of day) {
      const top = ((e.s - +ds) / 3600000 - h0) * HOUR_PX;
      const height = Math.max(((e.en - e.s) / 3600000) * HOUR_PX - 3, 18);
      const idx = S.cal.visible.push(e) - 1;
      h += `<button class="ev" data-action="event-open" data-idx="${idx}" style="top:${top + 1}px;height:${height}px;left:calc(${(e.lane / e.lanes) * 100}% + 2px);width:calc(${100 / e.lanes}% - 4px);background:var(--${esc(e.color)})" title="${esc(e.title)} · ${fmtTime(e.start)} – ${fmtTime(e.end)}"><b>${esc(e.title)}</b><small class="num">${fmtTime(e.start)} – ${fmtTime(e.end)}</small></button>`;
    }
    if (ymd(d) === today) {
      const n = new Date(), pos = (n.getHours() + n.getMinutes() / 60 - h0) * HOUR_PX;
      if (pos >= 0 && pos <= (h1 - h0) * HOUR_PX) h += `<div class="now" style="top:${pos}px"></div>`;
    }
    h += "</div>";
  });
  $("#calBody").innerHTML = h + "</div>";
  // On the current week, start scrolled near the current hour on small screens.
}
function pill(e) {
  const idx = (S.cal.visible ||= []).push(e) - 1;
  return `<button class="pill${e.holiday ? " hol" : ""}" data-action="event-open" data-idx="${idx}" style="background:var(--${esc(e.color)})" title="${esc(e.title)}">${esc(e.title)}</button>`;
}
function layoutLanes(evs) {
  evs.sort((a, b) => a.s - b.s || b.en - a.en);
  let group = [], groupEnd = 0;
  const flush = () => {
    const ends = [];
    for (const e of group) {
      let l = ends.findIndex((t) => t <= e.s);
      if (l < 0) { l = ends.length; ends.push(0); }
      ends[l] = e.en;
      e.lane = l;
    }
    group.forEach((e) => (e.lanes = ends.length));
    group = [];
  };
  for (const e of evs) {
    if (group.length && e.s >= groupEnd) flush();
    group.push(e);
    groupEnd = Math.max(groupEnd, e.en);
  }
  if (group.length) flush();
}
function renderMonth() {
  const base = new Date();
  const first = new Date(base.getFullYear(), base.getMonth() + S.cal.offset, 1);
  $("#calSub").textContent = `${MONTHS[first.getMonth()]} ${first.getFullYear()}`;
  const gridStart = startOfWeek(first);
  const gridEnd = addDays(gridStart, 42);
  const evs = eventsBetween(gridStart, gridEnd);
  const today = todayYmd();
  S.cal.visible = [];
  let h = '<div class="month">' + DOW.map((d) => `<div class="mh">${d}</div>`).join("");
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i), de = addDays(d, 1);
    const day = evs.filter((e) => e.start < de && e.end > d).sort((a, b) => (b.allDay - a.allDay) || a.start - b.start);
    h += `<div class="mday${d.getMonth() !== first.getMonth() ? " out" : ""}${ymd(d) === today ? " today" : ""}" data-action="day-open" data-date="${ymd(d)}" role="button" tabindex="0"><span class="d num">${d.getDate()}</span>`;
    day.slice(0, 3).forEach((e) => (h += pill(e)));
    if (day.length > 3) h += `<span class="more">+${day.length - 3} more</span>`;
    h += "</div>";
  }
  $("#calBody").innerHTML = h + "</div>";
}
function openEvent(e) {
  const when = e.allDay
    ? (daysBetween(e.start, e.end) > 1 ? `${fmtDay(e.start)} – ${fmtDay(addDays(e.end, -1))}` : `${fmtDay(e.start)} · all day`)
    : `${fmtDay(e.start)} · ${fmtTime(e.start)} – ${fmtTime(e.end)}`;
  if (!e.external) return openEventEditor(S.data.events.find((x) => x.id === e.id));
  sheet(e.title, e.source, `
    <div class="box"><p><b>${esc(when)}</b></p>${e.location ? `<p>📍 ${esc(e.location)}</p>` : ""}${e.description ? `<p style="white-space:pre-wrap">${esc(e.description.slice(0, 1500))}</p>` : ""}</div>
    <p class="sub">This event comes from ${esc(e.source)}. Change it there and it updates here within a few minutes.</p>`);
}
function openDay(date) {
  const d = parseYmd(date);
  const evs = eventsBetween(d, addDays(d, 1));
  S.cal.visible = [];
  sheet(fmtDay(d), `${evs.length} event${evs.length === 1 ? "" : "s"}`, `
    ${evs.length ? evs.map((e) => `<button class="itemrow" data-action="event-open" data-idx="${S.cal.visible.push(e) - 1}"><div class="t"><div>${esc(e.title)}</div><div class="meta">${e.allDay ? "all day" : fmtTime(e.start) + " – " + fmtTime(e.end)} · ${esc(e.source)}</div></div><span class="dot" style="background:var(--${esc(e.color)});width:10px;height:10px"></span></button>`).join("") : '<p class="empty">Nothing planned.</p>'}
    <div class="actions"><button class="btn" data-action="event-new" data-date="${date}">+ Add an event</button></div>`);
}
function openEventEditor(ev, preset = {}) {
  const e = ev || { title: "", date: preset.date || todayYmd(), start: preset.start ?? "10:00", end: preset.end ?? "11:00", color: "ice", notes: "" };
  sheet(ev ? "Edit event" : "New event", "saved in Cloud Nine", `
    <div class="field"><label for="evTitle">Title</label><input id="evTitle" value="${esc(e.title)}" placeholder="Coffee with Priya"></div>
    <div class="grid2">
      <div class="field"><label for="evDate">Date</label><input id="evDate" type="date" value="${esc(e.date)}"></div>
      <div class="field"><label for="evStart">Starts</label><input id="evStart" type="time" value="${esc(e.start || "")}"></div>
      <div class="field"><label for="evEnd">Ends</label><input id="evEnd" type="time" value="${esc(e.end || "")}"></div>
    </div>
    <p class="sub" style="margin:-6px 0 0">Leave the times empty for an all-day event.</p>
    <div class="field"><span class="lab">Colour</span>${swatches("evColor", e.color || "ice")}</div>
    <div class="field"><label for="evNotes">Notes</label><textarea id="evNotes">${esc(e.notes || "")}</textarea></div>
    <div class="actions">${ev ? `<button class="btn danger left" data-action="event-delete" data-id="${esc(ev.id)}">Delete</button>` : ""}<button class="btn" data-action="event-save" data-id="${esc(ev?.id || "")}">Save</button></div>`);
  $("#evTitle").focus();
}
function swatches(name, current) {
  return `<div class="swatches" data-name="${name}" role="radiogroup">${COLORS.map((c) => `<button type="button" data-action="swatch" data-color="${c}" aria-pressed="${c === current}" aria-label="${c}" style="background:var(--${c})"></button>`).join("")}</div>`;
}
const swatchValue = (name) => $(`.swatches[data-name="${name}"] [aria-pressed="true"]`)?.dataset.color || "ice";

/* ============================== focus + timer ============================== */
function focusTasks() {
  const t = todayYmd();
  const today = S.data.tasks.filter((x) => x.date === t);
  const carried = S.data.tasks.filter((x) => x.date < t && !x.done && x.date >= ymd(addDays(new Date(), -7)));
  return [...today, ...carried].sort((a, b) => (a.done - b.done) || String(a.date).localeCompare(String(b.date)));
}
function renderFocus() {
  const list = focusTasks();
  const T = S.timer;
  const R = 157;
  if (T.id) {
    const task = S.data.tasks.find((x) => x.id === T.taskId);
    $("#focusTop").innerHTML = `<svg class="ring" viewBox="0 0 62 62" aria-hidden="true"><circle cx="31" cy="31" r="25" stroke="var(--line-soft)"/><circle cx="31" cy="31" r="25" stroke="var(--rose)" stroke-linecap="round" stroke-dasharray="${R}" stroke-dashoffset="${(R * T.left) / TIMER_SECONDS}" transform="rotate(-90 31 31)"/></svg>
      <div><div class="big num">${pad(Math.floor(T.left / 60))}:${pad(T.left % 60)}</div><div class="sub">focusing on ${esc((task?.title || "").toLowerCase())}</div>
      <div class="timer-btns"><button class="mini" data-action="timer-pause">${T.paused ? "Resume" : "Pause"}</button><button class="mini" data-action="timer-stop">Stop</button></div></div>`;
  } else {
    const t = todayYmd();
    const todays = list.filter((x) => x.date === t);
    const done = todays.filter((x) => x.done).length;
    const mins = list.filter((x) => !x.done).reduce((a, x) => a + (+x.minutes || 0), 0);
    const focused = S.data.tasks.filter((x) => x.date === t).reduce((a, x) => a + (+x.focusMinutes || 0), 0);
    $("#focusTop").innerHTML = `<svg class="ring" viewBox="0 0 62 62" aria-hidden="true"><circle cx="31" cy="31" r="25" stroke="var(--line-soft)"/><circle cx="31" cy="31" r="25" stroke="var(--sky)" stroke-linecap="round" stroke-dasharray="${R}" stroke-dashoffset="${todays.length ? R - (R * done) / todays.length : R}" transform="rotate(-90 31 31)"/></svg>
      <div><div class="big num">${done} / ${todays.length}</div><div class="sub num">${mins ? `${Math.floor(mins / 60) ? Math.floor(mins / 60) + " h " : ""}${mins % 60} min left` : todays.length ? "all done, lovely work" : "nothing planned yet"}${focused ? ` · ${focused} min focused` : ""}</div></div>`;
  }
  $("#focusList").innerHTML = list.length
    ? list.map((x) => `<div class="task${x.done ? " done" : ""}${T.taskId === x.id && T.id ? " running" : ""}">
        <button class="check" data-action="task-toggle" data-id="${esc(x.id)}" aria-pressed="${!!x.done}" aria-label="Mark ${esc(x.title)} done">${tick}</button>
        <div class="t"><div>${esc(x.title)}</div><div class="meta num">${x.minutes ? x.minutes + " min" : ""}${x.date !== todayYmd() ? ` <span class="overdue">· carried over from ${fmtDay(parseYmd(x.date))}</span>` : ""}</div></div>
        <span class="tag" style="background:var(--${SUBJECT_COLOR[x.subject] || "ice"})">${esc(x.subject || "Study")}</span>
        ${x.done ? "" : `<button class="play" data-action="timer-start" data-id="${esc(x.id)}" aria-label="Start a 25-minute focus timer"><svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z"/></svg></button>`}
        <button class="del" data-action="task-delete" data-id="${esc(x.id)}" aria-label="Delete">✕</button></div>`).join("")
    : `<p class="empty">Add a study task below, or let Cloudy plan your week.</p>`;
}
function startTimer(id) {
  stopTimer(false);
  Object.assign(S.timer, { taskId: id, left: TIMER_SECONDS, paused: false });
  S.timer.id = setInterval(async () => {
    if (S.timer.paused) return;
    S.timer.left--;
    document.title = `${pad(Math.floor(S.timer.left / 60))}:${pad(S.timer.left % 60)} · Cloud Nine`;
    if (S.timer.left <= 0) {
      const task = S.data.tasks.find((x) => x.id === S.timer.taskId);
      stopTimer(false);
      if (task) await patch(task, { focusMinutes: (+task.focusMinutes || 0) + 25 });
      toast("Focus session done. Take a 5-minute break ✿");
      try { if ("Notification" in window && Notification.permission === "granted") new Notification("Cloud Nine", { body: "Focus session done. Take a 5-minute break.", icon: "/icons/icon-192.png" }); } catch {}
      renderFocus();
      return;
    }
    renderFocus();
  }, 1000);
  renderFocus();
  try { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); } catch {}
}
function stopTimer(render = true) {
  clearInterval(S.timer.id);
  S.timer.id = null;
  S.timer.taskId = null;
  document.title = "Cloud Nine";
  if (render) renderFocus();
}
$("#taskForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = $("#taskTitle").value.trim();
  if (!title) return;
  $("#taskTitle").value = "";
  await add("task", { title, subject: $("#taskSubject").value, minutes: +$("#taskMinutes").value || 30, date: todayYmd(), done: false });
  renderFocus(); renderStrip();
});

/* ============================== reminders ============================== */
function dueInfo(due) {
  if (!due) return { text: "", soon: false, sort: Infinity };
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(due);
  const d = dateOnly ? parseYmd(due) : new Date(due);
  if (isNaN(d)) return { text: due, soon: false, sort: Infinity };
  const dd = daysBetween(new Date(), d);
  const day = dd === 0 ? "today" : dd === 1 ? "tomorrow" : dd === -1 ? "yesterday" : fmtDay(d);
  const overdue = dateOnly ? dd < 0 : d < new Date();
  return { text: dateOnly ? day : `${day} · ${fmtTime(d)}`, soon: overdue || dd === 0, sort: +d, overdue };
}
function renderReminders() {
  const open = S.data.reminders.filter((r) => !r.done).sort((a, b) => dueInfo(a.due).sort - dueInfo(b.due).sort);
  const done = S.data.reminders.filter((r) => r.done).sort((a, b) => b.updated - a.updated).slice(0, 10);
  const row = (r) => {
    const d = dueInfo(r.due);
    return `<div class="task${r.done ? " done" : ""}"><button class="check" data-action="rem-toggle" data-id="${esc(r.id)}" aria-pressed="${!!r.done}" aria-label="Complete ${esc(r.title)}">${tick}</button>
      <div class="t"><div>${esc(r.title)}</div><div class="meta${d.soon && !r.done ? " soon" : ""}">${d.overdue && !r.done ? "overdue · " : ""}${esc(d.text)} ${r.source === "apple" ? appleIcon : ""}</div></div>
      <button class="del" data-action="rem-delete" data-id="${esc(r.id)}" aria-label="Delete">✕</button></div>`;
  };
  $("#remList").innerHTML = (open.length ? open.map(row).join("") : '<p class="empty">All clear. Nothing to remember right now.</p>')
    + (done.length ? `<button class="link" data-action="rem-showdone" style="margin-top:8px">${S.showDoneRem ? "hide" : "show"} completed (${done.length})</button>${S.showDoneRem ? done.map(row).join("") : ""}` : "");
  const st = S.data.status.reminders;
  $("#remSub").textContent = st ? `iPhone sync ${ago(st.at)}` : "";
}
$("#remForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = $("#remTitle").value.trim();
  if (!title) return;
  const due = $("#remDue").value || "";
  $("#remTitle").value = ""; $("#remDue").value = "";
  await add("reminder", { title, due, done: false, source: "app" });
  renderReminders(); renderStrip();
});

/* ============================== weekly to-do ============================== */
function renderTodo() {
  const dates = weekDates(S.todo.offset);
  if (!dates.includes(S.todo.day)) S.todo.day = S.todo.offset === 0 ? todayYmd() : dates[0];
  const t = todayYmd();
  $("#days").innerHTML = `${dates.map((d, i) => `<button aria-pressed="${d === S.todo.day}" class="${S.data.todos.some((x) => x.date === d) ? "has" : ""}${d === t ? " today" : ""}" data-action="todo-day" data-date="${d}">${DOW[i][0]}<b class="num">${parseYmd(d).getDate()}</b><i></i></button>`).join("")}`;
  const list = S.data.todos.filter((x) => x.date === S.todo.day).sort((a, b) => (a.done - b.done) || a.created - b.created);
  $("#todoList").innerHTML = list.length
    ? list.map((x) => { const p = PRIO.find((q) => q.k === x.priority) || PRIO[0];
      return `<div class="task${x.done ? " done" : ""}"><button class="check" data-action="todo-toggle" data-id="${esc(x.id)}" aria-pressed="${!!x.done}" aria-label="Mark ${esc(x.title)} done">${tick}</button><div class="t"><span>${esc(x.title)}</span></div>
        <button class="prio" data-action="todo-prio" data-id="${esc(x.id)}" style="background:${p.c}" title="priority: ${p.l} (tap to change)" aria-label="Priority ${p.l}"></button>
        <button class="del" data-action="todo-delete" data-id="${esc(x.id)}" aria-label="Delete">✕</button></div>`; }).join("")
    : '<p class="empty">Nothing planned. A free day is allowed too.</p>';
  const week = S.data.todos.filter((x) => dates.includes(x.date));
  $("#todoSub").innerHTML = `<button class="iconbtn sm" data-action="todo-week" data-step="-1" aria-label="Previous week" style="display:inline-grid;vertical-align:middle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg></button> ${week.filter((x) => x.done).length} of ${week.length} done ${S.todo.offset === 0 ? "this week" : ""} <button class="iconbtn sm" data-action="todo-week" data-step="1" aria-label="Next week" style="display:inline-grid;vertical-align:middle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg></button>`;
}
$("#todoForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = $("#todoTitle").value.trim();
  if (!title) return;
  $("#todoTitle").value = "";
  await add("todo", { title, date: S.todo.day, done: false, priority: "soft" });
  renderTodo();
});

/* ============================== news ============================== */
function newsList() {
  const all = S.data.news;
  if (S.newsTab === "saved") return all.filter((n) => n.saved).sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  return all.filter((n) => n.section === S.newsTab).sort((a, b) => (Date.parse(b.published) || b.created) - (Date.parse(a.published) || a.created));
}
function renderNews() {
  $$('[data-action="news-tab"]').forEach((b) => b.setAttribute("aria-pressed", b.dataset.tab === S.newsTab));
  const list = newsList();
  const shown = list.slice(0, S.newsMore ? 25 : 6);
  $("#newsList").innerHTML = shown.length
    ? shown.map((n) => `<div class="news-item"><div class="src">${esc(n.source)}<span>· ${esc(ago(n.published) || "")}</span></div>
        <a class="h" href="${esc(n.link)}" target="_blank" rel="noopener">${esc(n.title)}</a>
        <div class="news-actions"><button class="mini${n.saved ? " on" : ""}" data-action="news-save" data-id="${esc(n.id)}">${n.saved ? "★ saved" : "☆ save to my log"}</button>
        ${n.saved ? `<button class="mini${n.revised ? " on" : ""}" data-action="news-revised" data-id="${esc(n.id)}">${n.revised ? "✓ revised" : "mark revised"}</button>` : ""}
        <button class="mini" data-action="news-sum" data-id="${esc(n.id)}">${n.summary ? (n.showSum ? "hide summary" : "show summary") : "✨ summarise"}</button></div>
        ${n.summary && n.showSum ? `<div class="summary">${md(n.summary)}</div>` : ""}</div>`).join("")
      + (list.length > 6 ? `<button class="link" data-action="news-more" style="margin-top:6px">${S.newsMore ? "show fewer" : `show more (${Math.min(list.length, 25) - 6})`}</button>` : "")
    : `<p class="empty">${S.newsTab === "saved" ? "Save headlines here to build your revision log." : "No headlines yet. Press Refresh."}</p>`;
  const st = S.data.status.news;
  $("#newsStatus").textContent = st ? `updated ${ago(st.at)}${st.failed?.length ? ` · ${st.failed.length} source${st.failed.length > 1 ? "s" : ""} didn’t answer` : ""}` : "";
}
function textOf(el, sel) { const x = el.querySelector(sel); return x ? x.textContent.trim() : ""; }
function parseFeed(xml, feed) {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.querySelector("parsererror")) throw new Error("not a news feed");
  return [...doc.querySelectorAll("item, entry")].slice(0, 25).map((el) => {
    let title = textOf(el, "title");
    const srcName = textOf(el, "source");
    if (srcName && title.endsWith(" - " + srcName)) title = title.slice(0, -(srcName.length + 3));
    const linkEl = el.querySelector("link");
    const link = linkEl ? (linkEl.getAttribute("href") || linkEl.textContent.trim()) : "";
    const pub = textOf(el, "pubDate") || textOf(el, "published") || textOf(el, "updated");
    const d = new Date(pub);
    return { key: `${feed.id}:${link || title}`, section: feed.section, source: feed.name, title, link, published: isNaN(d) ? "" : d.toISOString() };
  }).filter((x) => x.title);
}
async function refreshNews(manual = false) {
  const feeds = S.data.settings.newsFeeds || [];
  if (manual) $("#newsStatus").textContent = "refreshing…";
  const results = await Promise.allSettled(feeds.map(async (f) => parseFeed(await api(`/api/feed/news/${encodeURIComponent(f.id)}`), f)));
  const items = [], failed = [];
  results.forEach((r, i) => (r.status === "fulfilled" ? items.push(...r.value) : failed.push(feeds[i].name)));
  try {
    const { added } = await api("/api/news", { body: { items, status: { ok: feeds.length - failed.length, failed } } });
    S.data.status.news = { at: new Date().toISOString(), failed, added };
    S.data.news = await api("/api/docs?kind=news");
    renderNews(); renderProjects();
    if (manual) toast(added ? `${added} new headline${added > 1 ? "s" : ""}` : "No new headlines yet");
  } catch (e) { if (manual) toast(e.message); }
}
function maybeRefreshNews() {
  const st = S.data.status.news;
  if (!st || Date.now() - new Date(st.at) > 3 * 3600000) refreshNews(false);
}
async function summariseNews(n) {
  if (n.summary) { n.showSum = !n.showSum; return renderNews(); }
  if (!S.data.settings.hasGeminiKey) return openSettings("ai");
  toast("Cloudy is reading the article…");
  let text = "";
  try {
    if (!/news\.google\.com/.test(n.link)) {
      const html = await api(`/api/article/${encodeURIComponent(n.id)}`);
      const doc = new DOMParser().parseFromString(String(html), "text/html");
      const root = doc.querySelector("article") || doc.querySelector("main") || doc.body;
      text = [...root.querySelectorAll("p")].map((p) => p.textContent.trim()).filter((t) => t.length > 40).join("\n").slice(0, 14000);
    }
  } catch {}
  try {
    const { summary } = await api("/api/ai/summarize", { body: { newsId: n.id, title: n.title, source: n.source, text } });
    n.summary = summary; n.showSum = true;
    renderNews();
  } catch (e) { toast(e.message); }
}

/* ============================== habits + mood ============================== */
function renderHabits() {
  const dates = weekDates(0), t = todayYmd();
  let h = "<div></div>" + dates.map((d, i) => `<div class="dh${d === t ? " today" : ""}">${DOW[i].slice(0, 2)}</div>`).join("") + '<div class="dh">week</div>';
  for (const hb of S.data.habits) {
    h += `<div class="lbl" title="${esc(hb.name)}">${esc(hb.name)}</div>`;
    let n = 0;
    for (const d of dates) {
      const log = S.data.habitlogs.find((l) => l.id === `hl:${hb.id}:${d}`);
      const on = !!log?.done;
      if (on) n++;
      h += `<button class="hdot${on ? " on" : ""}${d > t ? " future" : ""}" style="${on ? `background:var(--${esc(hb.color || "sky")})` : ""}" data-action="habit-toggle" data-habit="${esc(hb.id)}" data-date="${d}" aria-pressed="${on}" aria-label="${esc(hb.name)} on ${d}"></button>`;
    }
    h += `<div class="streak num">${n} / 7</div>`;
  }
  $("#hgrid").innerHTML = S.data.habits.length ? h : '<p class="empty">Add habits in Settings.</p>';
}
const MOODS = [["great", "🥰 great"], ["good", "🙂 good"], ["okay", "😐 okay"], ["low", "😔 low"]];
function renderMood() {
  const m = S.data.moods.find((x) => x.id === `mood:${todayYmd()}`);
  $("#mood").innerHTML = `<span>today I feel</span>` + MOODS.map(([k, l]) => `<button aria-pressed="${m?.mood === k}" data-action="mood" data-mood="${k}">${l}</button>`).join("");
}

/* ============================== projects (second brain) ============================== */
const ROOMS = {
  library: { name: "Books, shows & movies", statusKey: "status", fields: [
    { k: "type", l: "Type", t: "select", o: ["Book", "TV show", "Movie", "Podcast"] },
    { k: "status", l: "Status", t: "select", o: ["Want to", "In progress", "Finished", "Paused"] },
    { k: "progress", l: "Progress %", t: "number" },
    { k: "rating", l: "Rating", t: "select", o: ["", "★", "★★", "★★★", "★★★★", "★★★★★"] },
    { k: "creator", l: "Author / creator", t: "text" },
    { k: "notes", l: "Favourite quote or notes", t: "textarea" }] },
  workouts: { name: "Workout log", fields: [
    { k: "date", l: "Date", t: "date" },
    { k: "type", l: "Type", t: "select", o: ["Yoga", "Pilates", "Walk", "Strength", "Cardio", "Dance", "Stretch"] },
    { k: "minutes", l: "Minutes", t: "number" },
    { k: "notes", l: "Notes", t: "textarea" }] },
  ili: { name: "ILI diploma planner", statusKey: "status", fields: [
    { k: "paper", l: "Paper / module", t: "select", o: ["Paper 1", "Paper 2", "Paper 3", "Paper 4", "Project / dissertation"] },
    { k: "date", l: "Target date", t: "date" },
    { k: "status", l: "Status", t: "select", o: ["Not started", "Reading", "Revising", "Done"] },
    { k: "progress", l: "Progress %", t: "number" },
    { k: "link", l: "Resource link", t: "url" },
    { k: "notes", l: "Notes", t: "textarea" }] },
  studylog: { name: "Saved headlines (revision log)", special: "news" },
  certs: { name: "Certifications", statusKey: "status", fields: [
    { k: "provider", l: "Provider", t: "text" },
    { k: "area", l: "Area", t: "text" },
    { k: "cost", l: "Cost", t: "select", o: ["Free", "Free to learn, paid certificate", "Paid"] },
    { k: "status", l: "Status", t: "select", o: ["Wishlist", "Enrolled", "Studying", "Completed"] },
    { k: "progress", l: "Progress %", t: "number" },
    { k: "link", l: "Link", t: "url" },
    { k: "notes", l: "Notes", t: "textarea" }] },
  ideas: { name: "Research ideas", statusKey: "status", fields: [
    { k: "type", l: "Type", t: "select", o: ["Idea", "Research question", "Source", "Quote", "Case law", "Argument", "Outline note"] },
    { k: "status", l: "Status", t: "select", o: ["Raw", "Exploring", "Use it", "Parked"] },
    { k: "link", l: "Source link", t: "url" },
    { k: "notes", l: "Notes", t: "textarea" }] },
};
const CUSTOM_FIELDS = [
  { k: "status", l: "Status", t: "select", o: ["To do", "Doing", "Done"] },
  { k: "date", l: "Date", t: "date" },
  { k: "progress", l: "Progress %", t: "number" },
  { k: "link", l: "Link", t: "url" },
  { k: "notes", l: "Notes", t: "textarea" }];
function room(id) {
  if (ROOMS[id]) return ROOMS[id];
  const c = (S.data.settings.customRooms || []).find((r) => r.id === id);
  return c ? { name: c.name, statusKey: "status", fields: CUSTOM_FIELDS } : null;
}
const items = (roomId) => S.data.items.filter((i) => i.room === roomId);
const bar = (label, val, pct, color) => `<div><div class="row"><span>${esc(label)}</span><b class="num">${esc(val)}</b></div><div class="bar"><i style="width:${Math.max(0, Math.min(100, pct))}%;background:var(--${color})"></i></div></div>`;
const rowHtml = (label, val, style = "") => `<div class="row"><span>${esc(label)}</span><b ${style}>${esc(val)}</b></div>`;
function roomSummary(id) {
  const list = items(id);
  const t = todayYmd(), wk = weekDates(0);
  if (id === "library") {
    const cur = list.filter((i) => i.status === "In progress").slice(0, 2);
    return cur.length ? cur.map((i) => bar(i.type === "Book" ? "Reading" : i.type === "Podcast" ? "Listening" : "Watching", `${i.title} · ${+i.progress || 0}%`, +i.progress || 0, "sage")).join("") : rowHtml("Books, shows & movies", `${list.length} saved`);
  }
  if (id === "workouts") {
    const w = list.filter((i) => wk.includes(i.date));
    return rowHtml("Workouts this week", `${w.length} · ${w.reduce((a, i) => a + (+i.minutes || 0), 0)} min`);
  }
  if (id === "ili") {
    const papers = [...new Set(list.map((i) => i.paper || "Paper 1"))].sort().slice(0, 2);
    const prog = (p) => { const l = list.filter((i) => (i.paper || "Paper 1") === p); return Math.round(l.reduce((a, i) => a + (i.status === "Done" ? 100 : +i.progress || 0), 0) / (l.length || 1)); };
    const next = list.filter((i) => i.status !== "Done" && i.date && i.date >= t).sort((a, b) => a.date.localeCompare(b.date))[0];
    return (papers.length ? papers.map((p, k) => bar(`ILI · ${p}`, prog(p) + "%", prog(p), k ? "powder" : "sky")).join("") : rowHtml("ILI planner", "add your syllabus"))
      + (next ? rowHtml("Next target", `${next.title} · ${fmtDay(parseYmd(next.date))}`, 'style="color:var(--rose)"') : "");
  }
  if (id === "studylog") {
    const saved = S.data.news.filter((n) => n.saved);
    return rowHtml("Saved headlines", `${saved.length} · ${saved.filter((n) => !n.revised).length} to revise`);
  }
  if (id === "certs") {
    const cur = list.filter((i) => ["Enrolled", "Studying"].includes(i.status)).slice(0, 2);
    return (cur.length ? cur.map((i) => bar(i.title, (+i.progress || 0) + "%", +i.progress || 0, "teal")).join("") : rowHtml("Up next", list.find((i) => i.status === "Wishlist")?.title || "add a certification"))
      + rowHtml("Completed", String(list.filter((i) => i.status === "Completed").length));
  }
  if (id === "ideas") return rowHtml("Research ideas", `${list.length} · ${list.filter((i) => i.status === "Exploring").length} exploring`);
  return rowHtml(room(id)?.name || "Items", `${list.length} · ${list.filter((i) => i.status === "Done").length} done`);
}
function renderProjects() {
  const ps = S.data.settings.projects || [];
  $("#projects").innerHTML = ps.map((p) => `<article class="card proj">
      <div class="ptitle"><span class="sw" style="background:var(--${esc(p.color || "ice")})">${ICONS[p.icon] || ICONS.star}</span><h3>${esc(p.name)}</h3><button class="iconbtn sm" data-action="project-edit" data-id="${esc(p.id)}" aria-label="Edit ${esc(p.name)}">⋯</button></div>
      ${(p.rooms || []).map(roomSummary).join("")}
      <div class="rooms">${(p.rooms || []).map((r) => `<button data-action="room-open" data-room="${esc(r)}">${esc(room(r)?.name || r)}</button>`).join("")}</div>
    </article>`).join("") || '<p class="empty">Add a project to start your second brain.</p>';
}
function openRoom(id) {
  const r = room(id);
  if (!r) return;
  if (r.special === "news") {
    const saved = S.data.news.filter((n) => n.saved);
    return sheet(r.name, `${saved.length} saved`, saved.length
      ? saved.map((n) => `<div class="itemrow"><div class="t"><div><a href="${esc(n.link)}" target="_blank" rel="noopener">${esc(n.title)}</a></div><div class="meta">${esc(n.source)} · ${esc(fmtDay(new Date(n.published || n.created)))}</div></div><button class="mini${n.revised ? " on" : ""}" data-action="news-revised" data-id="${esc(n.id)}" data-room="1">${n.revised ? "✓ revised" : "mark revised"}</button></div>`).join("")
      : '<p class="empty">Use “☆ save to my log” on any headline in the news desk.</p>');
  }
  const list = items(id).sort((a, b) => b.updated - a.updated);
  const order = r.statusKey ? (r.fields.find((f) => f.k === r.statusKey)?.o || []) : [];
  if (order.length) list.sort((a, b) => order.indexOf(a[r.statusKey]) - order.indexOf(b[r.statusKey]));
  sheet(r.name, `${list.length} item${list.length === 1 ? "" : "s"}`, `
    <div class="actions"><button class="btn" data-action="item-new" data-room="${esc(id)}">+ Add</button></div>
    <div>${list.map((i) => `<button class="itemrow" data-action="item-edit" data-id="${esc(i.id)}"><div class="t"><div>${esc(i.title)}</div><div class="meta">${esc(r.fields.filter((f) => f.t === "select" || f.t === "date").map((f) => i[f.k]).filter(Boolean).join(" · "))}</div>${i.progress ? `<div class="bar" style="max-width:220px"><i style="width:${Math.min(100, +i.progress)}%;background:var(--sky)"></i></div>` : ""}</div><span class="sub">edit</span></button>`).join("") || '<p class="empty">Nothing here yet.</p>'}</div>`);
}
function openItem(it, roomId) {
  const r = room(roomId || it.room);
  const v = it || { room: roomId };
  const f = (fd) => {
    const val = v[fd.k] ?? (fd.t === "select" ? fd.o[0] : "");
    if (fd.t === "select") return `<div class="field"><label for="f_${fd.k}">${fd.l}</label><select id="f_${fd.k}">${fd.o.map((o) => `<option ${o === val ? "selected" : ""}>${esc(o)}</option>`).join("")}</select></div>`;
    if (fd.t === "textarea") return `<div class="field" style="grid-column:1/-1"><label for="f_${fd.k}">${fd.l}</label><textarea id="f_${fd.k}">${esc(val)}</textarea></div>`;
    return `<div class="field"><label for="f_${fd.k}">${fd.l}</label><input id="f_${fd.k}" type="${fd.t}" value="${esc(val)}" ${fd.t === "number" ? 'min="0" max="600"' : ""}></div>`;
  };
  sheet(it ? "Edit" : "Add to " + r.name, r.name, `
    <div class="field"><label for="f_title">Title</label><input id="f_title" value="${esc(v.title || "")}"></div>
    <div class="grid2">${r.fields.map(f).join("")}</div>
    ${v.link ? `<p><a href="${esc(v.link)}" target="_blank" rel="noopener">Open link ↗</a></p>` : ""}
    <div class="actions"><button class="btn ghost left" data-action="room-open" data-room="${esc(v.room)}">← Back</button>${it ? `<button class="btn danger" data-action="item-delete" data-id="${esc(it.id)}">Delete</button>` : ""}<button class="btn" data-action="item-save" data-id="${esc(it?.id || "")}" data-room="${esc(v.room)}">Save</button></div>`);
  $("#f_title").focus();
}
function openProject(p) {
  const isNew = !p;
  p = p || { name: "", color: "sky" };
  sheet(isNew ? "New project" : "Edit project", isNew ? "a new space in your second brain" : "", `
    <div class="field"><label for="pName">Name</label><input id="pName" value="${esc(p.name)}" placeholder="Fitness, Travel, Moot court…"></div>
    <div class="field"><span class="lab">Colour</span>${swatches("pColor", p.color || "sky")}</div>
    <div class="actions">${isNew ? "" : `<button class="btn danger left" data-action="project-delete" data-id="${esc(p.id)}">Remove project</button>`}<button class="btn" data-action="project-save" data-id="${esc(p.id || "")}">Save</button></div>
    ${isNew ? "" : '<p class="sub">Removing a project hides it from the dashboard. Items inside it are kept in your backup.</p>'}`);
  $("#pName").focus();
}

/* ============================== Cloudy (AI) ============================== */
function aiContext() {
  const now = new Date();
  const from = dayStart(now), to = addDays(from, 7);
  const events = eventsBetween(from, to).slice(0, 40).map((e) => `${fmtDay(e.start)} ${e.allDay ? "all day" : fmtTime(e.start) + "–" + fmtTime(e.end)} ${e.title}${e.holiday ? " (holiday)" : ""}`);
  return { today: todayYmd(), weekday: now.toLocaleDateString("en-GB", { weekday: "long" }), weekDates: weekDates(0), events };
}
function renderChat() {
  const msgs = S.data.chat.map((c) => `<div class="msg ${c.role === "model" ? "model" : "user"}">${c.role === "model" ? md(c.text) : esc(c.text)}</div>`).join("");
  const intro = S.data.settings.hasGeminiKey
    ? `<div class="msg model"><p>Hi ${esc(S.data.settings.name || "")}! I can see your tasks, calendar, reminders and news desk. Ask me anything, or tap a suggestion below.</p></div>`
    : `<div class="msg model"><p>Hi! I’m Cloudy. To wake me up, add a free Gemini API key in Settings. It takes about two minutes.</p><p><button class="btn sm" data-action="settings" data-tab="ai">Add my key</button></p></div>`;
  $("#msgs").innerHTML = intro + msgs;
  $("#msgs").scrollTop = $("#msgs").scrollHeight;
}
function openAI() {
  $("#drawer").classList.add("open");
  $("#drawer").setAttribute("aria-hidden", "false");
  renderChat();
  setTimeout(() => $("#aiInput").focus(), 250);
}
function closeAI() { $("#drawer").classList.remove("open"); $("#drawer").setAttribute("aria-hidden", "true"); }
async function askAI(message) {
  if (!S.data.settings.hasGeminiKey) return openSettings("ai");
  if (!$("#drawer").classList.contains("open")) openAI();
  const box = $("#msgs");
  box.insertAdjacentHTML("beforeend", `<div class="msg user">${esc(message)}</div><div class="msg model thinking" id="thinking">thinking…</div>`);
  box.scrollTop = box.scrollHeight;
  try {
    const { reply } = await api("/api/ai/chat", { body: { message, ...aiContext() } });
    S.data.chat.push({ role: "user", text: message }, { role: "model", text: reply });
    renderChat();
  } catch (e) {
    $("#thinking")?.remove();
    box.insertAdjacentHTML("beforeend", `<div class="msg model"><p>${esc(e.message)}</p></div>`);
  }
}
$("#composer").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = $("#aiInput").value.trim();
  if (!v) return;
  $("#aiInput").value = "";
  askAI(v);
});
function openPlanner() {
  if (!S.data.settings.hasGeminiKey) return openSettings("ai");
  sheet("Plan my study week", "Cloudy suggests tasks; you choose which to add", `
    <div class="grid2"><div class="field"><label for="plMins">Study minutes per weekday</label><input id="plMins" type="number" min="30" max="600" step="15" value="120"></div></div>
    <div class="field"><label for="plExtra">Anything to keep in mind? (optional)</label><textarea id="plExtra" placeholder="Busy on Friday evening; exam for Paper 2 on the 20th…"></textarea></div>
    <div class="actions"><button class="btn" data-action="plan-run">Make my plan</button></div>
    <div id="planOut"></div>`);
}
async function runPlanner() {
  const out = $("#planOut");
  out.innerHTML = '<p class="sub">Cloudy is planning…</p>';
  const dates = [...Array(7)].map((_, i) => ymd(addDays(new Date(), i)));
  try {
    const plan = await api("/api/ai/plan", { body: { ...aiContext(), weekDates: dates, minutesPerDay: +$("#plMins").value || 120, extra: $("#plExtra").value } });
    S.plan = plan.tasks || [];
    out.innerHTML = `<p>${esc(plan.note || "")}</p><div class="planlist">${S.plan.map((t, i) => `<label><input type="checkbox" checked data-i="${i}"><span><b>${esc(fmtDay(parseYmd(t.date)))}</b> · ${esc(t.title)} <span class="sub">(${esc(t.subject)}, ${+t.minutes} min)</span></span></label>`).join("")}</div>
      <div class="actions"><button class="btn" data-action="plan-add">Add selected to my study plan</button></div>`;
  } catch (e) { out.innerHTML = `<p class="sub" style="color:var(--rose)">${esc(e.message)}</p>`; }
}

/* ============================== settings ============================== */
const TABS = [["general", "General"], ["calendars", "Calendars"], ["ai", "Cloudy (AI)"], ["reminders", "iPhone reminders"], ["habits", "Habits"], ["news", "News"], ["backup", "Backup"]];
async function openSettings(tab = "general") {
  closeAI();
  const s = S.data.settings;
  const tabs = `<div class="tabs seg" role="tablist" style="flex-wrap:wrap;border-radius:14px">${TABS.map(([k, l]) => `<button role="tab" aria-pressed="${k === tab}" data-action="settings" data-tab="${k}">${l}</button>`).join("")}</div>`;
  let body = "";
  if (tab === "general") {
    const theme = document.documentElement.dataset.theme || "system";
    body = `<div class="field"><label for="sName">What should Cloud Nine call you?</label><input id="sName" value="${esc(s.name || "")}"></div>
      <div class="field"><label for="sTheme">Look</label><select id="sTheme"><option value="system" ${theme === "system" ? "selected" : ""}>Match my device</option><option value="light" ${theme === "light" ? "selected" : ""}>Ocean milk (day)</option><option value="dark" ${theme === "dark" ? "selected" : ""}>Deep ocean (night)</option></select></div>
      <div class="actions"><button class="btn ghost left" data-action="logout">Sign out</button><button class="btn" data-action="save-general">Save</button></div>
      <div class="box"><h3>Install the app</h3><p><b>Windows:</b> in Edge, open the ⋯ menu → Apps → Install this site as an app. In Chrome, use the install icon at the right of the address bar.</p><p><b>iPhone:</b> open this page in Safari → Share → Add to Home Screen.</p><p><a href="${GUIDE_URL}" target="_blank" rel="noopener">Full step-by-step guide ↗</a></p></div>`;
  }
  if (tab === "calendars") {
    body = `<p class="sub">Calendars show up on your dashboard and refresh every few minutes. Paste a calendar’s private “iCal” link. <a href="${GUIDE_URL}/CALENDARS.md" target="_blank" rel="noopener">How to find it for Google and Apple ↗</a></p>
      ${s.calendars.map((c) => `<div class="box"><div class="rowline"><span class="dot" style="background:var(--${esc(c.color)});width:12px;height:12px"></span><b style="flex:1">${esc(c.name)}</b>${S.cal.errors[c.id] ? `<span class="sub" style="color:var(--rose)">${esc(S.cal.errors[c.id])}</span>` : `<span class="sub">connected</span>`}<button class="mini" data-action="cal-remove" data-id="${esc(c.id)}">Remove</button></div><code class="sub" style="overflow-wrap:anywhere">${esc(c.url.length > 90 ? c.url.slice(0, 60) + "…" + c.url.slice(-20) : c.url)}</code></div>`).join("")}
      <div class="box"><h3>Add a calendar</h3>
        <div class="field"><label for="cName">Name</label><input id="cName" placeholder="My Google Calendar"></div>
        <div class="field"><label for="cUrl">iCal link</label><input id="cUrl" placeholder="https://calendar.google.com/calendar/ical/…/basic.ics  or  webcal://p..-caldav.icloud.com/…"></div>
        <div class="field"><span class="lab">Colour</span>${swatches("cColor", "sky")}</div>
        <div class="actions"><button class="btn" data-action="cal-add">Add calendar</button></div></div>`;
  }
  if (tab === "ai") {
    body = `<div class="box"><h3>Your Gemini key</h3>
        <p>${s.hasGeminiKey ? `✓ A key is saved${s.geminiKeyFrom === "cloudflare" ? " in Cloudflare" : ""}. Paste a new one to replace it.` : "Get a free key at <a href='https://aistudio.google.com/apikey' target='_blank' rel='noopener'>aistudio.google.com/apikey</a> (sign in with Google → Create API key), then paste it here."}</p>
        <div class="field"><label for="aKey">API key</label><input id="aKey" type="password" autocomplete="off" placeholder="${s.hasGeminiKey ? "•••••••• (saved)" : "AIza…"}"></div>
        <div class="field"><label for="aModel">Model</label><input id="aModel" value="${esc(s.geminiModel || "gemini-flash-latest")}"><span class="hint">“gemini-flash-latest” always points to Google’s current fast model. If Google retires a name, pick another from the AI Studio model list.</span></div>
        <div class="actions">${s.geminiKeyFrom === "settings" ? '<button class="btn danger left" data-action="ai-removekey">Remove key</button>' : ""}<button class="btn ghost" data-action="ai-test">Test</button><button class="btn" data-action="ai-savekey">Save</button></div>
        <p class="sub" id="aiTestOut"></p></div>
      <p class="sub">Free tier: Google may use what you send to Gemini to improve its products, so keep very private details out of chats. Cloudy sends your tasks, reminders, calendar for the next 7 days and recent headlines when you ask it something.</p>`;
  }
  if (tab === "reminders") {
    body = `<p>Apple doesn’t let Windows or web apps read Reminders directly, so a small iPhone Shortcut carries them across. It sends your open reminders here and brings reminders you add in Cloud Nine back to your iPhone.</p>
      <p><a href="${GUIDE_URL}/APPLE-REMINDERS.md" target="_blank" rel="noopener">Step-by-step: build the Shortcut (about 10 minutes) ↗</a></p>
      <div class="box" id="scInfo"><p class="sub">Loading your private links…</p></div>
      <p class="sub">${S.data.status.reminders ? `Last sync from iPhone ${ago(S.data.status.reminders.at)}: ${S.data.status.reminders.received} open reminders.` : "No sync from the iPhone yet."}</p>`;
  }
  if (tab === "habits") {
    body = `<p class="sub">Changes save as you go.</p>${S.data.habits.map((h) => `<div class="rowline"><input value="${esc(h.name)}" data-action-change="habit-rename" data-id="${esc(h.id)}" aria-label="Habit name"><select data-action-change="habit-color" data-id="${esc(h.id)}" aria-label="Colour">${COLORS.map((c) => `<option ${c === h.color ? "selected" : ""}>${c}</option>`).join("")}</select><button class="mini" data-action="habit-delete" data-id="${esc(h.id)}">Remove</button></div>`).join("")}
      <div class="rowline"><input id="hNew" placeholder="New habit, e.g. 10 min revision"><button class="btn" data-action="habit-add">Add habit</button></div>`;
  }
  if (tab === "news") {
    body = `<p class="sub">Headlines are fetched when you open the app (at most every 3 hours) or when you press Refresh. Sources without their own feed are read through Google News.</p>
      ${(s.newsFeeds || []).map((f) => `<div class="rowline"><span class="tag" style="background:var(--${f.section === "legal" ? "powder" : "periwinkle"})">${f.section === "legal" ? "Legal" : "Current affairs"}</span><b style="flex:1">${esc(f.name)}</b><button class="mini" data-action="feed-remove" data-id="${esc(f.id)}">Remove</button></div>`).join("")}
      <div class="box"><h3>Add a source</h3>
        <div class="grid2"><div class="field"><label for="nName">Name</label><input id="nName" placeholder="Vedantu"></div><div class="field"><label for="nSec">Section</label><select id="nSec"><option value="ca">Current affairs</option><option value="legal">Legal</option></select></div></div>
        <div class="field"><label for="nUrl">Feed link, or a website</label><input id="nUrl" placeholder="https://… /feed   or   vedantu.com"><span class="hint">If you type just a website, Cloud Nine follows it through Google News.</span></div>
        <div class="actions"><button class="btn" data-action="feed-add">Add source</button></div></div>`;
  }
  if (tab === "backup") {
    body = `<div class="box"><h3>Download a backup</h3><p>Saves everything (tasks, habits, reminders, projects, saved news) as one file. Your Gemini key is not included.</p><div class="actions"><a class="btn" href="/api/export" style="display:inline-grid;place-items:center;text-decoration:none">Download backup</a></div></div>
      <p class="sub">Your data lives in your own Cloudflare account, not on anyone else’s server.</p>`;
  }
  sheet("Settings", "", tabs + body);
  if (tab === "reminders") loadShortcutInfo();
}
async function loadShortcutInfo() {
  try {
    const i = await api("/api/shortcut/info");
    const c = (label, v) => `<div class="field"><span class="lab">${label}</span><div class="copy"><code>${esc(v)}</code><button class="mini" data-action="copy" data-v="${esc(v)}">Copy</button></div></div>`;
    $("#scInfo").innerHTML = `<h3>Your private Shortcut details</h3>${c("Send URL", i.sendUrl)}${c("Bring-back URL", i.outboxUrl)}${c("Token (keep it secret)", i.token)}`;
  } catch (e) { $("#scInfo").innerHTML = `<p class="sub">${esc(e.message)}</p>`; }
}

/* ============================== sheet ============================== */
function sheet(title, sub, html) {
  $("#sheetTitle").textContent = title;
  $("#sheetSub").textContent = sub || "";
  $("#sheetBody").innerHTML = html;
  $("#sheet").hidden = false;
}
function closeSheet() { $("#sheet").hidden = true; }
$("#sheet").addEventListener("click", (e) => { if (e.target.id === "sheet") closeSheet(); });

/* ============================== actions ============================== */
const find = (coll, id) => S.data[coll].find((x) => x.id === id);
const ACTIONS = {
  "scroll": (b) => { const el = b.dataset.to === "top" ? document.body : $("#" + b.dataset.to); el.scrollIntoView({ behavior: "smooth", block: "start" }); },
  "theme": () => setTheme(isDark() ? "light" : "dark"),
  "logout": async () => { await api("/api/logout", { body: {} }); location.reload(); },
  "sheet-close": closeSheet,
  "copy": async (b) => { try { await navigator.clipboard.writeText(b.dataset.v); toast("Copied"); } catch { toast("Select the text and copy it"); } },
  "swatch": (b) => { $$("button", b.parentElement).forEach((x) => x.setAttribute("aria-pressed", x === b)); },

  // calendar
  "cal-range": (b) => { S.cal.range = b.dataset.range; S.cal.offset = 0; renderCalendar(); },
  "cal-prev": () => { S.cal.offset--; renderCalendar(); },
  "cal-next": () => { S.cal.offset++; renderCalendar(); },
  "cal-today": () => { S.cal.offset = 0; renderCalendar(); },
  "event-open": (b) => { const e = S.cal.visible?.[+b.dataset.idx]; if (e) openEvent(e); },
  "day-open": (b) => openDay(b.dataset.date),
  "cal-slot": (b, ev) => {
    if (ev.target !== b) return;
    const y = ev.offsetY, h = Math.floor(+b.dataset.h0 + y / HOUR_PX);
    openEventEditor(null, { date: b.dataset.date, start: `${pad(h)}:00`, end: `${pad(Math.min(23, h + 1))}:00` });
  },
  "event-new": (b) => openEventEditor(null, { date: b.dataset.date || todayYmd() }),
  "event-save": async (b) => {
    const data = { title: $("#evTitle").value.trim() || "Untitled", date: $("#evDate").value || todayYmd(), start: $("#evStart").value, end: $("#evEnd").value, color: swatchValue("evColor"), notes: $("#evNotes").value };
    if (b.dataset.id) await patch(find("events", b.dataset.id), data); else await add("event", data);
    closeSheet(); renderCalendar();
  },
  "event-delete": async (b) => { await drop("event", b.dataset.id); closeSheet(); renderCalendar(); },

  // countdowns
  "countdown-edit": (b) => openCountdown(b.dataset.id),
  "countdown-save": async (b) => {
    const data = { title: $("#cdTitle").value.trim() || "Countdown", date: $("#cdDate").value || todayYmd() };
    if (b.dataset.id) await patch(find("countdowns", b.dataset.id), data); else await add("countdown", data);
    closeSheet(); renderStrip();
  },
  "countdown-delete": async (b) => { await drop("countdown", b.dataset.id); closeSheet(); renderStrip(); },

  // focus
  "task-toggle": async (b) => { const t = find("tasks", b.dataset.id); if (S.timer.taskId === t.id) stopTimer(false); await patch(t, { done: !t.done }); renderFocus(); renderStrip(); },
  "task-delete": async (b) => { if (S.timer.taskId === b.dataset.id) stopTimer(false); await drop("task", b.dataset.id); renderFocus(); renderStrip(); },
  "timer-start": (b) => (S.timer.taskId === b.dataset.id && S.timer.id ? stopTimer() : startTimer(b.dataset.id)),
  "timer-pause": () => { S.timer.paused = !S.timer.paused; renderFocus(); },
  "timer-stop": () => stopTimer(),

  // reminders
  "rem-toggle": async (b) => {
    const r = find("reminders", b.dataset.id);
    await patch(r, { done: !r.done });
    if (r.done && r.source === "apple") toast("Done here. Tick it on your iPhone too so it stays done.");
    renderReminders(); renderStrip();
  },
  "rem-delete": async (b) => { await drop("reminder", b.dataset.id); renderReminders(); },
  "rem-showdone": () => { S.showDoneRem = !S.showDoneRem; renderReminders(); },

  // to-do
  "todo-day": (b) => { S.todo.day = b.dataset.date; renderTodo(); },
  "todo-week": (b) => { S.todo.offset += +b.dataset.step; S.todo.day = weekDates(S.todo.offset)[0]; if (S.todo.offset === 0) S.todo.day = todayYmd(); renderTodo(); },
  "todo-toggle": async (b) => { const t = find("todos", b.dataset.id); await patch(t, { done: !t.done }); renderTodo(); },
  "todo-prio": async (b) => { const t = find("todos", b.dataset.id); const i = PRIO.findIndex((p) => p.k === t.priority); await patch(t, { priority: PRIO[(i + 1) % PRIO.length].k }); renderTodo(); },
  "todo-delete": async (b) => { await drop("todo", b.dataset.id); renderTodo(); },

  // news
  "news-tab": (b) => { S.newsTab = b.dataset.tab; S.newsMore = false; renderNews(); },
  "news-more": () => { S.newsMore = !S.newsMore; renderNews(); },
  "news-refresh": () => refreshNews(true),
  "news-save": async (b) => { const n = find("news", b.dataset.id); await patch(n, n.saved ? { saved: false } : { saved: true, savedAt: new Date().toISOString() }); renderNews(); renderProjects(); },
  "news-revised": async (b) => { const n = find("news", b.dataset.id); await patch(n, { revised: !n.revised }); renderNews(); renderProjects(); if (b.dataset.room) openRoom("studylog"); },
  "news-sum": (b) => summariseNews(find("news", b.dataset.id)),

  // habits & mood
  "habit-toggle": async (b) => {
    const id = `hl:${b.dataset.habit}:${b.dataset.date}`;
    const log = S.data.habitlogs.find((l) => l.id === id);
    if (log) await patch(log, { done: !log.done }); else await add("habitlog", { habitId: b.dataset.habit, date: b.dataset.date, done: true }, id);
    renderHabits();
  },
  "mood": async (b) => { await add("mood", { date: todayYmd(), mood: b.dataset.mood }, `mood:${todayYmd()}`); renderMood(); },
  "habit-add": async () => { const n = $("#hNew").value.trim(); if (!n) return; await add("habit", { name: n, color: COLORS[S.data.habits.length % COLORS.length], order: S.data.habits.length }); renderHabits(); openSettings("habits"); },
  "habit-delete": async (b) => { await drop("habit", b.dataset.id); renderHabits(); openSettings("habits"); },

  // projects
  "room-open": (b) => openRoom(b.dataset.room),
  "item-new": (b) => openItem(null, b.dataset.room),
  "item-edit": (b) => openItem(find("items", b.dataset.id)),
  "item-save": async (b) => {
    const r = room(b.dataset.room);
    const data = { room: b.dataset.room, title: $("#f_title").value.trim() || "Untitled" };
    r.fields.forEach((f) => { const el = $(`#f_${f.k}`); data[f.k] = f.t === "number" ? (el.value === "" ? "" : +el.value) : el.value; });
    if (data.status === "Done" || data.status === "Completed" || data.status === "Finished") data.progress = 100;
    if (b.dataset.id) await patch(find("items", b.dataset.id), data); else await add("item", data);
    renderProjects(); openRoom(b.dataset.room);
  },
  "item-delete": async (b) => { const it = find("items", b.dataset.id); await drop("item", it.id); renderProjects(); openRoom(it.room); },
  "project-new": () => openProject(null),
  "project-edit": (b) => openProject((S.data.settings.projects || []).find((p) => p.id === b.dataset.id)),
  "project-save": async (b) => {
    const name = $("#pName").value.trim() || "My project", color = swatchValue("pColor");
    const s = S.data.settings;
    let projects = [...(s.projects || [])], customRooms = [...(s.customRooms || [])];
    if (b.dataset.id) projects = projects.map((p) => (p.id === b.dataset.id ? { ...p, name, color } : p));
    else {
      const rid = "custom-" + crypto.randomUUID().slice(0, 8);
      customRooms.push({ id: rid, name });
      projects.push({ id: "p-" + rid, name, color, icon: "star", rooms: [rid] });
    }
    await saveSettings({ projects, customRooms });
    closeSheet(); renderProjects();
  },
  "project-delete": async (b) => { await saveSettings({ projects: S.data.settings.projects.filter((p) => p.id !== b.dataset.id) }); closeSheet(); renderProjects(); },

  // Cloudy
  "ai-open": () => openAI(),
  "ai-close": () => closeAI(),
  "ai-ask": (b) => askAI(b.dataset.q),
  "ai-clear": async () => { await api("/api/chat", { method: "DELETE" }); S.data.chat = []; renderChat(); },
  "plan-open": () => { closeAI(); openPlanner(); },
  "plan-run": () => runPlanner(),
  "plan-add": async () => {
    const picks = $$("#planOut input[type=checkbox]:checked").map((c) => S.plan[+c.dataset.i]);
    for (const t of picks) await add("task", { title: t.title, subject: t.subject, minutes: t.minutes, date: t.date, done: false, fromCloudy: true });
    closeSheet(); renderFocus(); renderStrip(); toast(`Added ${picks.length} study task${picks.length === 1 ? "" : "s"}`);
  },

  // settings
  "settings": (b) => openSettings(b.dataset.tab),
  "save-general": async () => { await saveSettings({ name: $("#sName").value.trim() || "lovely" }); setTheme($("#sTheme").value); renderHeader(); closeSheet(); toast("Saved"); },
  "cal-add": async () => {
    const url = $("#cUrl").value.trim(), name = $("#cName").value.trim() || "My calendar";
    if (!/^(https?|webcal):\/\//i.test(url)) return toast("Paste a link that starts with https:// or webcal://");
    await saveSettings({ calendars: [...S.data.settings.calendars, { id: "cal-" + crypto.randomUUID().slice(0, 8), name, url, color: swatchValue("cColor") }] });
    await loadCalendars(true); openSettings("calendars");
  },
  "cal-remove": async (b) => { await saveSettings({ calendars: S.data.settings.calendars.filter((c) => c.id !== b.dataset.id) }); delete S.cal.errors[b.dataset.id]; await loadCalendars(); openSettings("calendars"); },
  "ai-savekey": async () => {
    const key = $("#aKey").value.trim(), model = $("#aModel").value.trim() || "gemini-flash-latest";
    await saveSettings(key ? { geminiKey: key, geminiModel: model } : { geminiModel: model });
    renderChips(); renderStrip(); toast("Saved");
    if (key) { maybeBrief(true); }
    openSettings("ai");
  },
  "ai-removekey": async () => { await saveSettings({ geminiKey: "" }); renderChips(); openSettings("ai"); },
  "ai-test": async () => {
    $("#aiTestOut").textContent = "Testing…";
    const r = await api("/api/ai/test", { body: { key: $("#aKey").value.trim() || undefined, model: $("#aModel").value.trim() } }).catch((e) => ({ ok: false, error: e.message }));
    $("#aiTestOut").textContent = r.ok ? `✓ Gemini answered using ${r.model}. You’re all set.` : `✗ ${r.error}`;
  },
  "feed-add": async () => {
    let url = $("#nUrl").value.trim();
    const name = $("#nName").value.trim() || url;
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = `https://news.google.com/rss/search?q=site:${encodeURIComponent(url.replace(/^www\./, "").replace(/\/.*$/, ""))}&hl=en-IN&gl=IN&ceid=IN:en`;
    await saveSettings({ newsFeeds: [...(S.data.settings.newsFeeds || []), { id: "feed-" + crypto.randomUUID().slice(0, 8), name, section: $("#nSec").value, url }] });
    openSettings("news"); refreshNews(true);
  },
  "feed-remove": async (b) => { await saveSettings({ newsFeeds: S.data.settings.newsFeeds.filter((f) => f.id !== b.dataset.id) }); openSettings("news"); },
};
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-action]");
  if (!b || !ACTIONS[b.dataset.action]) return;
  if (b.tagName === "A") return;
  e.preventDefault();
  Promise.resolve(ACTIONS[b.dataset.action](b, e)).catch((err) => toast(err.message));
});
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && S.data) { e.preventDefault(); openAI(); }
  if (e.key === "Escape") { closeAI(); closeSheet(); }
  if (e.key === "Enter" && e.target.matches(".mday")) openDay(e.target.dataset.date);
});
document.addEventListener("change", async (e) => {
  const el = e.target.closest("[data-action-change]");
  if (!el) return;
  const h = find("habits", el.dataset.id);
  if (el.dataset.actionChange === "habit-rename") await patch(h, { name: el.value.trim() || h.name });
  if (el.dataset.actionChange === "habit-color") await patch(h, { color: el.value });
  renderHabits();
});

/* ============================== start ============================== */
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
boot();
