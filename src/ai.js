// Cloudy, the planner's AI helper, powered by the Gemini API (free tier works).
const API = "https://generativelanguage.googleapis.com/v1beta/models";

const PERSONA = `You are Cloudy, the friendly assistant inside "Cloud Nine", a soft pastel life planner.
The person using it studies law in India: an Indian Law Institute PG diploma, current affairs for government exams,
legal news, and law certifications. Be warm, encouraging and brief. Use short paragraphs or bullet points.
Only state facts about the person's schedule, tasks or news that appear in the planner data you are given.
If they ask about news that is not in the data, say you only see the headlines in their news desk.
Never invent court rulings, dates, case names or numbers. Dates are in the person's local time zone.`;

async function call(ai, contents, { system = PERSONA, json = false, schema = null, temperature = 0.7, maxTokens = 1200 } = {}) {
  const res = await fetch(`${API}/${encodeURIComponent(ai.model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": ai.key },
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
    const hint = res.status === 404 ? " Try another model name in Settings → Cloudy (AI)." : res.status === 429 ? " You have hit today’s free limit; it resets overnight (Pacific time)." : "";
    const e = new Error(msg + hint);
    e.status = 502;
    throw e;
  }
  const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
  if (!text) throw Object.assign(new Error("Gemini sent an empty answer. Try again."), { status: 502 });
  return text;
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
  const ili = data.items.filter((i) => i.room === "ili" && i.status !== "Done");
  if (ili.length) lines.push("ILI diploma topics not done:\n" + ili.slice(0, 20).map((i) => `- ${i.title}${i.date ? " (target " + i.date + ")" : ""}${i.progress ? " " + i.progress + "%" : ""}`).join("\n"));
  const certs = data.items.filter((i) => i.room === "certs" && ["Enrolled", "Studying"].includes(i.status));
  if (certs.length) lines.push("Certifications in progress:\n" + certs.map((i) => `- ${i.title} ${i.progress || 0}%`).join("\n"));
  if (data.habits.length) {
    const done = (h) => data.habitlogs.filter((l) => l.habitId === h.id && l.done && (!week.length || week.includes(l.date))).length;
    lines.push("Habits this week: " + data.habits.map((h) => `${h.name} ${done(h)}/7`).join(", "));
  }
  const news = data.news.slice(0, 20);
  if (news.length) lines.push("Latest headlines in the news desk:\n" + news.map((n) => `- [${n.section === "legal" ? "legal" : "current affairs"}] ${n.source}: ${n.title}`).join("\n"));
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
  return call(ai, [{ role: "user", parts: [{ text: `${ctx}\n\nWrite my brief for today in ONE line under 30 words: what to focus on, anything due, one gentle nudge. No greeting, no emoji, use " · " between parts.` }] }], { temperature: 0.5, maxTokens: 200 });
}

export async function summarize(ai, input) {
  const article = String(input.text || "").slice(0, 14000);
  const prompt = article
    ? `Summarise this news article for a law student preparing for Indian government exams.\nHeadline: ${input.title}\nSource: ${input.source}\n\nArticle text:\n${article}\n\nGive: 3 short bullet points of key facts, then one line starting "Why it matters:" (GS paper or area of law). Use only facts from the article.`
    : `I only have this headline (no article text): "${input.title}" from ${input.source}.\nIn 2 short bullets say what it is likely about and which GS paper or area of law it relates to. Start with "From the headline only:".`;
  return call(ai, [{ role: "user", parts: [{ text: prompt }] }], { temperature: 0.3, maxTokens: 500 });
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
  const text = await call(ai, [{ role: "user", parts: [{ text: ask }] }], { json: true, schema, temperature: 0.4, maxTokens: 2500 });
  try {
    const plan = JSON.parse(text);
    plan.tasks = (plan.tasks || []).filter((t) => (input.weekDates || []).includes(t.date)).slice(0, 40);
    return plan;
  } catch {
    throw Object.assign(new Error("Gemini sent a plan I couldn't read. Try again."), { status: 502 });
  }
}

export async function testKey(key, model) {
  if (!key) return { ok: false, error: "No key yet. Paste your Gemini key first." };
  try {
    const text = await call({ key, model }, [{ role: "user", parts: [{ text: "Reply with exactly: ready" }] }], { system: "Reply briefly.", temperature: 0, maxTokens: 20 });
    return { ok: true, reply: text, model };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
