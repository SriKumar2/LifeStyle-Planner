// Cloudy, the planner's AI helper, powered by the Gemini API (free tier works).
const API = "https://generativelanguage.googleapis.com/v1beta/models";

const PERSONA = `You are Cloudy, the friendly assistant inside "Cloud Nine", a soft pastel life planner.
The person using it studies law in India: an Indian Law Institute PG diploma, current affairs for government exams,
legal news, and law certifications. Be warm, encouraging and brief. Use short paragraphs or bullet points.
Only state facts about the person's schedule, tasks or news that appear in the planner data you are given.
If they ask about news that is not in the data, say you only see the headlines in their news desk.
Never invent court rulings, dates, case names or numbers. Dates are in the person's local time zone.`;

// Errors worth moving on to the next model for: busy (503/500), out of quota (429),
// model retired or not available to this key (404, some 400s), or an empty answer.
const TRY_NEXT = new Set([429, 500, 502, 503, 504, 404]);

async function callOne(key, model, contents, opts) {
  try { return await callOnce(key, model, contents, opts); }
  catch (e) { return { ok: false, status: 0, msg: "couldn’t reach Gemini", next: true }; }
}
async function callOnce(key, model, contents, { system, json, schema, temperature, maxTokens }) {
  const res = await fetch(`${API}/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        ...(json ? { responseMimeType: "application/json" } : {}),
        ...(schema ? { responseSchema: schema } : {}),
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Gemini answered ${res.status}`;
    const badKey = res.status === 400 && /api key|API_KEY/i.test(msg);
    const unsupported = res.status === 400 && /not supported|not found|unknown name|model/i.test(msg) && !badKey;
    return { ok: false, status: res.status, msg, next: TRY_NEXT.has(res.status) || unsupported, badKey };
  }
  const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
  if (!text) return { ok: false, status: 200, msg: "empty answer", next: true };
  return { ok: true, text };
}

// Try each model in ai.chain until one answers. ai.used records which one did.
async function call(ai, contents, { system = PERSONA, json = false, schema = null, temperature = 0.7, maxTokens = 4096 } = {}) {
  // Token limits are generous on purpose: newer Gemini models "think" before answering and that
  // thinking counts against maxOutputTokens, so a tight limit can produce an empty answer.
  const tried = [];
  for (const model of ai.chain) {
    const r = await callOne(ai.key, model, contents, { system, json, schema, temperature, maxTokens });
    if (r.ok) { ai.used = model; return r.text; }
    tried.push({ model, status: r.status, msg: r.msg });
    (ai.failures ||= []).push({ model, status: r.status });
    if (r.badKey) throw Object.assign(new Error("Gemini says the API key isn’t valid. Copy it again from AI Studio and save it in Settings → Cloudy (AI)."), { status: 400 });
    if (!r.next) break;
  }
  const allBusy = tried.length && tried.every((t) => [500, 503, 504].includes(t.status));
  const allQuota = tried.length && tried.every((t) => t.status === 429);
  const msg = allBusy
    ? "Gemini is very busy right now on every model I tried. Give it a minute and try again."
    : allQuota
      ? "You’ve used today’s free Gemini allowance on every model I tried. It resets overnight (US Pacific time)."
      : `Gemini couldn’t answer (${tried.map((t) => `${t.model}: ${t.msg}`).join(" · ").slice(0, 400)})`;
  throw Object.assign(new Error(msg), { status: 502, tried });
}

// ---------- choosing models ----------
const SKIP = /tts|image|live|audio|embedding|native|computer|robotics|vision|learnlm|aqa|gemma/i;
const version = (name) => { const m = name.match(/gemini-(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : 0; };

// Ask Google which models this key can use (cached by the caller for a day).
export async function listModels(key) {
  const res = await fetch(`${API}?pageSize=200`, { headers: { "x-goog-api-key": key } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data?.error?.message || `Gemini answered ${res.status}`), { status: res.status });
  return (data.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => ({ id: m.name.replace(/^models\//, ""), label: m.displayName || m.name }))
    .filter((m) => /flash/i.test(m.id) && !SKIP.test(m.id) && version(m.id) > 0);
}

// Build the order to try. "light" jobs (brief, summaries) start with Flash Lite, which has the
// biggest free daily allowance; "smart" jobs (chat, planning) start with the newest Flash.
export function buildChain(models, preferred, task = "smart") {
  const rank = (a, b) => version(b.id) - version(a.id) || (/preview|exp/.test(a.id) - /preview|exp/.test(b.id));
  const lite = models.filter((m) => /flash-lite/.test(m.id)).sort(rank).map((m) => m.id);
  const flash = models.filter((m) => !/flash-lite/.test(m.id)).sort(rank).map((m) => m.id);
  let chain = task === "light" ? [...lite.slice(0, 2), ...flash.slice(0, 2)] : [...flash.slice(0, 2), ...lite.slice(0, 2)];
  if (!chain.length) chain = task === "light"
    ? ["gemini-flash-lite-latest", "gemini-flash-latest", "gemini-2.5-flash-lite", "gemini-2.5-flash"]
    : ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
  if (preferred && preferred !== "auto") chain = [preferred, ...chain.filter((m) => m !== preferred)];
  return [...new Set(chain)].slice(0, 5);
}

// A compact, readable snapshot of the planner for the model.
function context(data, extra = {}) {
  const today = extra.today || new Date().toISOString().slice(0, 10);
  const week = extra.weekDates || [];
  const lines = [`Today: ${today} (${extra.weekday || ""}). Name to use: ${data.settings.name || "friend"}.`];
  const tasks = data.tasks.filter((t) => t.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 25);
  if (tasks.length) lines.push("Study tasks:\n" + tasks.map((t) => `- ${t.date} ${t.done ? "[done]" : "[open]"} ${t.title} (${t.subject || "study"}, ${t.minutes || "?"} min)`).join("\n"));
  const todos = data.todos.filter((t) => !week.length || week.includes(t.date));
  if (todos.length) lines.push("Weekly to-do:\n" + todos.map((t) => `- ${t.date} ${t.done ? "[done]" : "[open]"} ${t.title}`).join("\n"));
  const rem = data.reminders.filter((r) => !r.done).slice(0, 20);
  if (rem.length) lines.push("Open reminders:\n" + rem.map((r) => `- ${r.title}${r.due ? " (due " + r.due + ")" : ""}`).join("\n"));
  if (extra.events?.length) lines.push("Calendar, next 7 days:\n" + extra.events.slice(0, 40).map((e) => `- ${e}`).join("\n"));
  if (data.countdowns.length) lines.push("Countdowns:\n" + data.countdowns.map((c) => `- ${c.title}: ${c.date}`).join("\n"));
  const subjects = data.subjects || [];
  if (subjects.length) {
    const courseName = (s) => (data.courses || []).find((c) => c.id === s.courseId)?.name || "General";
    lines.push("Syllabus (by course):\n" + subjects.map((s) => {
      const ts = (data.topics || []).filter((t) => t.subjectId === s.id);
      const done = ts.filter((t) => ["done", "revised"].includes(t.status)).length;
      const open = ts.filter((t) => !["done", "revised"].includes(t.status)).slice(0, 15).map((t) => `${t.unit ? t.unit + ": " : ""}${t.title}${t.status === "reading" ? " (reading)" : ""}`);
      return `- [${courseName(s)}] ${s.name}${s.exam ? " (exam " + s.exam + ")" : ""}: ${done}/${ts.length} topics done.${open.length ? " Still to finish: " + open.join("; ") : ""}`;
    }).join("\n"));
  }
  if ((data.routine || []).length) {
    const today = extra.today || new Date().toISOString().slice(0, 10);
    const done = new Set((data.routinelogs || []).filter((l) => l.date === today && l.done).map((l) => l.stepId));
    lines.push("Daily routine (today):\n" + data.routine.map((r) => `- ${r.section}${r.time ? " " + r.time : ""}: ${r.title}${r.minutes ? " (" + r.minutes + " min)" : ""} ${done.has(r.id) ? "[done]" : "[not yet]"}`).join("\n"));
  }
  const notes = (data.notes || []).slice(0, 25);
  if (notes.length) {
    const pname = (id) => (data.settings?.projects || []).find((p) => p.id === id)?.name || "Notes";
    lines.push("Notes in the second brain (newest first):\n" + notes.map((n) => `- [${pname(n.projectId)}] ${n.title || "untitled"}: ${String(n.body || "").replace(/\s+/g, " ").slice(0, 160)}`).join("\n"));
  }
  const lists = (data.checklists || []).filter((c) => (c.items || []).some((i) => !i.done));
  if (lists.length) lines.push("To-do lists and checklists (unticked items):\n" + lists.map((c) => `- ${c.name}: ${c.items.filter((i) => !i.done).slice(0, 15).map((i) => i.t).join("; ")}`).join("\n"));
  const due = (data.assignments || []).filter((a) => !a.done);
  if (due.length) lines.push("Assignments and deadlines:\n" + due.slice(0, 20).map((a) => `- ${a.title}${a.due ? " due " + a.due : ""} (priority ${a.priority || "M"})`).join("\n"));
  const ili = data.items.filter((i) => i.room === "ili" && i.status !== "Done");
  if (ili.length) lines.push("ILI diploma topics not done:\n" + ili.slice(0, 20).map((i) => `- ${i.title}${i.date ? " (target " + i.date + ")" : ""}${i.progress ? " " + i.progress + "%" : ""}`).join("\n"));
  const certs = data.items.filter((i) => i.room === "certs" && ["Enrolled", "Studying"].includes(i.status));
  if (certs.length) lines.push("Certifications in progress:\n" + certs.map((i) => `- ${i.title} ${i.progress || 0}%`).join("\n"));
  if (data.habits.length) {
    const done = (h) => data.habitlogs.filter((l) => l.habitId === h.id && l.done && (!week.length || week.includes(l.date))).length;
    lines.push("Habits this week: " + data.habits.map((h) => `${h.name} ${done(h)}/7`).join(", "));
  }
  const news = data.news.slice(0, 20);
  if (news.length) lines.push("Latest headlines in the news desk:\n" + news.map((n) => `- [${n.section === "legal" ? "legal" : n.section === "leisure" ? "leisure reading" : "current affairs"}] ${n.source}: ${n.title}`).join("\n"));
  return lines.join("\n\n");
}

export async function chat(ai, data, input, history) {
  const ctx = context(data, input);
  const contents = [
    { role: "user", parts: [{ text: "Here is my planner right now:\n\n" + ctx }] },
    { role: "model", parts: [{ text: "Got it. I can see your planner." }] },
    ...history.map((h) => ({ role: h.role === "model" ? "model" : "user", parts: [{ text: h.text }] })),
    { role: "user", parts: [{ text: String(input.message || "").slice(0, 4000) }] },
  ];
  return call(ai, contents);
}

export async function brief(ai, data, input) {
  const ctx = context(data, input);
  return call(ai, [{ role: "user", parts: [{ text: `${ctx}\n\nWrite my brief for today in ONE line under 30 words: what to focus on, anything due, one gentle nudge. No greeting, no emoji, use " · " between parts.` }] }], { temperature: 0.5, maxTokens: 1024 });
}

export async function summarize(ai, input) {
  const article = String(input.text || "").slice(0, 14000);
  const prompt = article
    ? `Summarise this news article for a law student preparing for Indian government exams.\nHeadline: ${input.title}\nSource: ${input.source}\n\nArticle text:\n${article}\n\nGive: 3 short bullet points of key facts, then one line starting "Why it matters:" (GS paper or area of law). Use only facts from the article.`
    : `I only have this headline (no article text): "${input.title}" from ${input.source}.\nIn 2 short bullets say what it is likely about and which GS paper or area of law it relates to. Start with "From the headline only:".`;
  return call(ai, [{ role: "user", parts: [{ text: prompt }] }], { temperature: 0.3, maxTokens: 2048 });
}

export async function planWeek(ai, data, input) {
  const ctx = context(data, input);
  const schema = {
    type: "OBJECT",
    properties: {
      note: { type: "STRING" },
      tasks: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            date: { type: "STRING" },
            title: { type: "STRING" },
            subject: { type: "STRING", enum: ["Current affairs", "Legal news", "PG diploma", "Certification", "Research", "Other"] },
            minutes: { type: "INTEGER" },
          },
          required: ["date", "title", "subject", "minutes"],
        },
      },
    },
    required: ["note", "tasks"],
  };
  const ask = `${ctx}\n\nPlan my study tasks for these dates: ${(input.weekDates || []).join(", ")}.
Daily study time: about ${input.minutesPerDay || 120} minutes on weekdays and ${Math.round((input.minutesPerDay || 120) * 1.5)} on weekends.
Rules: keep my existing open tasks; add new ones only to fill time. Every day include current affairs (about 30 min) and legal news (about 20 min).
Put ILI diploma topics first, at least 2 days before any target date; then certifications in progress; then research.
Add one weekly revision of current affairs on the weekend. Dates must be from the list, format YYYY-MM-DD.
"note" is one friendly sentence about the plan.${input.extra ? "\nAlso: " + input.extra : ""}`;
  const text = await call(ai, [{ role: "user", parts: [{ text: ask }] }], { json: true, schema, temperature: 0.4, maxTokens: 8192 });
  try {
    const plan = JSON.parse(text);
    plan.tasks = (plan.tasks || []).filter((t) => (input.weekDates || []).includes(t.date)).slice(0, 40);
    return plan;
  } catch {
    throw Object.assign(new Error("Gemini sent a plan I couldn't read. Try again."), { status: 502 });
  }
}

export async function testKey(key, chain) {
  if (!key) return { ok: false, error: "No key yet. Paste your Gemini key first." };
  const ai = { key, chain };
  try {
    const text = await call(ai, [{ role: "user", parts: [{ text: "Reply with exactly: ready" }] }], { system: "Reply briefly.", temperature: 0, maxTokens: 512 });
    return { ok: true, reply: text, model: ai.used, chain };
  } catch (e) {
    return { ok: false, error: e.message, chain };
  }
}
