# Troubleshooting

## Signing in

**“That passcode doesn’t match.”**
Check capital letters and spaces. On iPhone, auto-capitalisation sometimes changes the first letter. Whoever set up the app can change the passcode: see [Setup → Changing the passcode](1-SETUP.md#changing-the-passcode).

**“Too many wrong attempts.”**
After 8 wrong tries, sign-in pauses for 15 minutes. Wait, then try again.

**“APP_PASSCODE is not set.”**
The passcode secret is missing in Cloudflare. Add it: Cloudflare dashboard → **Workers & Pages** → your Worker (for example **cloud-nine** or **lifestyle-planner**) → **Settings** → **Variables and Secrets** → **Add** → type **Secret**, name `APP_PASSCODE`, value = the passcode → **Deploy**.

**The iPhone app keeps asking for the passcode.**
The home-screen app keeps its own sign-in. Type the passcode inside the app (not in Safari). If it still forgets, check **Settings → Safari → Advanced → Block All Cookies** is off, and that you didn’t add it from a Private Browsing tab.

## Calendars

**A calendar says “couldn’t load”.**
Paste the link into a browser tab. If no file downloads, the link is wrong, was reset, or the calendar isn’t public any more. Get a fresh link: see [Calendars](CALENDARS.md). Then remove the old one in **Settings → Calendars** and add the new one.

**My new event isn’t showing yet.**
Calendars refresh every few minutes while Cloud Nine is open. Google and Apple can take a little while to publish changes.

**Times are wrong.**
Cloud Nine shows events in your device’s time zone. Check the date and time settings on the computer or phone.

## News

**“1 source didn’t answer.”**
News websites sometimes block or slow down for a while. It usually fixes itself on the next refresh. If one source never works, remove it in **Settings → News** and add it again by typing just its website (for example `barandbench.com`), which uses Google News.

**No headlines at all.**
Press **Refresh** in the news desk. If nothing comes, check the internet connection, then try again in an hour.

## Cloudy (AI)

See the table at the end of [Cloudy (AI)](GEMINI.md). Most problems are a missing key, the daily free limit, or a retired model name.

## Apple Reminders

See the questions at the end of [Apple Reminders](APPLE-REMINDERS.md).

## The app looks old after an update

Close Cloud Nine completely and open it again. On Windows, close the app window. On iPhone, swipe it away in the app switcher. The newest version loads automatically.

## I want to move to a different Cloudflare account

1. In the old app: **Settings → Backup → Download backup**.
2. Set up a new copy in the new account ([Setup](1-SETUP.md)).
3. Import isn’t built in yet. Open an issue on GitHub, or ask a developer to load the backup file through the app’s `/api/docs` endpoint.

## Still stuck?

Open an issue at [github.com/SriKumar2/LifeStyle-Planner/issues](https://github.com/SriKumar2/LifeStyle-Planner/issues) and describe what you see. A screenshot helps. Never post your passcode, calendar links, token or Gemini key.
