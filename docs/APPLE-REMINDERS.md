# Bring Apple Reminders into Cloud Nine

Apple doesn’t let web or Windows apps read Reminders directly. An iPhone **Shortcut** carries them across instead. You build it once (about 10 to 15 minutes), and it runs on its own afterwards.

**What it does each time it runs:**

1. Copies reminders you added **in Cloud Nine** into Apple Reminders, so your iPhone alerts you on time.
2. Sends all your **open Apple reminders** to Cloud Nine. Reminders you’ve completed on the iPhone get ticked off in Cloud Nine too.

Reminders that came from the iPhone show a small  logo in Cloud Nine. If you tick one off in Cloud Nine, tick it on the iPhone as well.

## Before you start

1. In Cloud Nine (on the iPhone or a computer), open **Settings** → **iPhone reminders**.
2. Keep that screen open. It shows three things you’ll copy into the Shortcut:
   - **Send URL**
   - **Bring-back URL**
   - **Token**, a secret code. Treat it like a password.

On the iPhone, open the **Shortcuts** app (it’s built in; search for it if you can’t see it).

---

## Build the Shortcut

Tap **+** (top right) to make a new shortcut. Name it **Cloud Nine Sync** (tap the name at the top).

To add each action below, tap **Search Actions** at the bottom, type the action’s name, and tap it.

### Part 1: bring Cloud Nine reminders to the iPhone

1. **Get Contents of URL**
   - Tap **URL** and paste your **Bring-back URL**.
   - Tap the **›** arrow to show more options.
   - **Method:** GET
   - **Headers:** tap **Add new header**. Key: `Authorization`. Text: `Bearer ` followed by your token, with one space after “Bearer”. Example: `Bearer 0F3VmVWzt8cMeZsM…`
2. **Split Text**
   - It should say *Split* **Contents of URL** *by* **New Lines**.
3. **Repeat with Each**
   - It should say *Repeat with each item in* **Split Text**.
   - Put the next actions **inside** the repeat (between “Repeat with each” and “End Repeat”). Drag them there if needed.
4. Inside the repeat, **Split Text**
   - Tap the first field and choose **Repeat Item**.
   - Tap **New Lines** and change it to **Custom**, then type ` || ` (space, two vertical bars, space).
5. Inside the repeat, **Get Item from List**
   - *Get* **First Item** *from* **Split Text**.
6. Inside the repeat, **If**
   - *If* **Item from List** **has any value**. (This skips the empty line you get when there’s nothing new.)
7. Inside the **If** (before “Otherwise”), **Add New Reminder**
   - Tap the reminder text and choose **Item from List** (from step 5).
   - Optional: tap the **›** arrow, pick the **List** you want these reminders in.
   - You can leave the date empty. Cloud Nine keeps the due date, and you can set an alert on the iPhone.
   - Leave the **Otherwise** part empty.

### Part 2: send iPhone reminders to Cloud Nine

Add these **after** the “End Repeat” of Part 1, at the bottom of the shortcut.

8. **Find Reminders**
   - Tap **Add Filter**. Set it to **Is Completed** · **is** · **false** (the switch off).
9. **Repeat with Each**
   - *Repeat with each item in* **Reminders**.
10. Inside this repeat, **Text**. Build this line exactly, using variables:
   - Tap in the text box, then tap **Repeat Item** above the keyboard and choose **Title**.
   - Type ` || ` (space, two bars, space).
   - Insert **Repeat Item** again, tap it, choose **Due Date**, then set **Date Format** to **ISO 8601**.
   - Type ` || ` again.
   - Insert **Repeat Item** once more, choose **Creation Date**, and set **Date Format** to **ISO 8601**.

   The finished line looks like:
   `Title || Due Date || Creation Date`
11. After the **End Repeat**, add **Combine Text**
    - *Combine* **Repeat Results** *with* **New Lines**.
12. **Get Contents of URL**
    - **URL:** paste your **Send URL**.
    - **Method:** POST
    - **Headers:** Key `Authorization`, Text `Bearer ` + your token (same as step 1).
    - **Request Body:** **Form**. Tap **Add new field** → **Text**. Key: `lines`. Value: choose **Combined Text**.
13. Optional: **Show Notification** with the text “Cloud Nine synced ☁️”.

Tap **Done**. Then tap the shortcut once to run it. The first time, iOS asks for permission to use Reminders and to connect to your Cloud Nine link. Tap **Allow** for both.

Check Cloud Nine: your iPhone reminders now appear in the **Reminders** card, and **Settings → iPhone reminders** shows when the last sync happened.

---

## Make it run by itself

Open the **Shortcuts** app → **Automation** tab → **+** (or **New Automation**).

Good triggers to add (you can add several):

- **Time of Day**: for example 7:00 am, 1:00 pm and 9:00 pm. Choose **Daily**.
- **App**: choose **Reminders** → **Is Closed**. It then syncs each time you leave the Reminders app.

For each one: choose **Run Immediately** (and turn off **Notify When Run** if you like), then pick **Cloud Nine Sync**.

---

## Questions

**Can a reminder I complete in Cloud Nine be completed on the iPhone too?**
Not automatically. Apple doesn’t let the Shortcut find a specific reminder reliably. Tick it on the iPhone as well. The next sync keeps both sides tidy.

**I see a reminder twice.**
Run the shortcut again. Cloud Nine matches reminders it already sent to the iPhone by title. If you renamed one on the iPhone before the sync, delete the extra copy in Cloud Nine.

**The shortcut says “Wrong or missing token”.**
The **Authorization** header must be `Bearer`, one space, then the token, with no extra spaces. If you changed the app’s passcode, the token changed too. Copy the new one from **Settings → iPhone reminders**.

**Does this work with Android or Windows?**
No. It needs an iPhone or iPad with the Shortcuts app.
