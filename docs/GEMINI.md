# Turn on Cloudy, the AI helper

Cloudy runs on Google’s **Gemini**. A free Gemini key is enough for everyday use. Getting one takes about two minutes.

## What Cloudy can do

- Write a **one-line brief** at the top of your day.
- Answer questions about your week: “What should I focus on today?”
- **Plan your study week**: it suggests tasks for the next 7 days and you tick the ones to add.
- **Summarise** a headline in the news desk, with why it matters for exams.
- **Quiz you** on the week’s headlines.

## 1. Get a free key

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and sign in with a Google account.
2. Accept the terms if asked.
3. Click **Create API key**. If it asks for a project, choose the default or create one called “Cloud Nine”.
4. **Copy** the key. It starts with `AIza`.

Treat the key like a password. Don’t post it anywhere.

## 2. Add it to Cloud Nine

1. In Cloud Nine, open **Settings** → **Cloudy (AI)**.
2. Paste the key into **API key**.
3. Click **Test**. You should see “✓ Gemini answered…”.
4. Click **Save**.

The key is stored in your own Cloud Nine database and never shown again. You can replace or remove it on the same screen.

<p align="center"><img src="images/settings-ai.png" alt="Cloudy settings" width="720"></p>

## The free tier, honestly

- **It’s free**, with daily limits. Your current limits are shown in [AI Studio](https://aistudio.google.com) under your project’s rate limits. They reset every night (US Pacific time).
- **Privacy:** on the free tier, Google may use what you send to improve its products. Cloudy sends your tasks, reminders, the next 7 days of your calendar and recent headlines when you ask it something. Keep very private details out of chats. On a paid Gemini plan, Google doesn’t use your data this way.
- **No Google Search on the free tier.** That’s fine here: Cloud Nine fetches the news itself and gives Cloudy the headlines.

## Which model Cloudy uses

Leave **Settings → Cloudy (AI) → Model** on **Automatic**. Cloud Nine asks Google which models your key can use and keeps a back-up order:

- **Briefs and news summaries** start with the newest **Flash Lite** model, which has the most free requests a day (hundreds).
- **Chat and week planning** start with the newest **Flash** model (smarter, but only about 20 free requests a day each).

If a model says it’s **busy** (“high demand”), is **out of free requests**, or has been **retired**, Cloudy quietly tries the next one. A busy model rests for 2 minutes and a used-up one for an hour before Cloudy tries it again. Each model has its own daily allowance, so switching also stretches your free quota.

The settings screen shows the exact order. You can also pick one model to always try first; the others stay as back-ups.

## Errors you might see

| Message | What to do |
|---|---|
| “Add your free Gemini API key…” | No key saved yet. Follow the steps above. |
| “Gemini is very busy right now…” | Every model was overloaded at once. Wait a minute and try again. |
| “…used today’s free Gemini allowance…” | Every model is out of free requests. It resets overnight (US Pacific time). |
| “API key not valid” | Copy the key again from AI Studio and save it. |
