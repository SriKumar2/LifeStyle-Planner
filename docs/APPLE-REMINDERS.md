# Bring Apple Reminders into Cloud Nine

Apple doesn’t let web or Windows apps read Reminders directly. An iPhone **Shortcut** carries them across instead. You build it once, and then it runs by itself.

**Time needed:** about 20 minutes the first time. Take it slowly; every tap is written out below.

**What the finished shortcut does each time it runs:**

1. **Cloud Nine → iPhone:** reminders you added in Cloud Nine are created in Apple Reminders, so your iPhone alerts you on time.
2. **iPhone → Cloud Nine:** every open (not completed) Apple reminder is sent to Cloud Nine. Reminders you’ve completed on the iPhone get ticked off in Cloud Nine too.

In Cloud Nine, reminders that came from the iPhone show a small Apple logo next to their date.

---

## Before you start

You need:

- An **iPhone (or iPad) on iOS 17 or newer**: **Settings → General → About → iOS Version**.
- **Reminders in iCloud** turned on: **Settings → [your name] → iCloud → Reminders** (switch on).
- The **Shortcuts** app. It comes with the iPhone. If you deleted it, get it free from the App Store.
- Cloud Nine open on a **computer** (easiest) or the iPhone, at **Settings → iPhone reminders**.

That screen shows three things you’ll copy into the shortcut:

| Name in Cloud Nine | What it looks like | Used in |
|---|---|---|
| **Send URL** | `https://<your-link>/api/shortcut/reminders` | Part 2 |
| **Bring-back URL** | `https://<your-link>/api/shortcut/outbox?format=text` | Part 1 |
| **Token** | 32 letters and numbers | Parts 1 and 2 |

> **Tip:** Getting long text onto the iPhone is the fiddly part. Easiest: open Cloud Nine on the iPhone itself (**Settings → iPhone reminders**), tap **Copy** next to each item, and paste straight into Shortcuts. Or email the three items to yourself from the computer.

The **token is secret**, like a password. Anyone with it could read your reminders. If it ever leaks, change the app’s passcode in Cloudflare (that gives you a new token) and update the shortcut.

### How to add an action in Shortcuts

You’ll do this many times, so here it is once:

1. Tap the **search bar at the bottom** that says **Search Actions**.
2. Type the action’s name, for example `Get Contents of URL`.
3. Tap the action in the results. It’s added to the bottom of your shortcut.

**Blue words** inside an action are fields you can tap and change. If an action has a small **›** or **Show More**, tap it to see extra options.

**Variables** (like *Repeat Item* or *Contents of URL*) are the results of earlier actions. To insert one, tap a field, then pick it from the bar above the keyboard, or tap **Select Variable**.

---

## Step 0: a 2-minute connection test (recommended)

This checks that your iPhone can reach Cloud Nine with your token before you build the real thing.

1. Open **Shortcuts** → tap **+** (top right).
2. Tap the name at the top, choose **Rename**, and call it `Cloud Nine Test`.
3. Add **Get Contents of URL**.
   - Tap the blue **URL** and paste your **Bring-back URL**.
   - Tap **›** (or **Show More**).
   - **Method**: leave as **GET**.
   - **Headers**: tap **Add new header**.
     - **Key:** `Authorization`
     - **Text:** `Bearer` then **one space**, then your token. Example: `Bearer 0F3VmVWzt8cMeZsMKkYjf8a47np0Qgui`
4. Add **Show Result**. It should say *Show* **Contents of URL**.
5. Tap **▶︎ (Play)** at the bottom right.

**What you should see:**

- The first time, iOS asks *“Allow Cloud Nine Test to connect to …workers.dev?”* Tap **Always Allow**.
- Then either an **empty result** (nothing waiting, which is fine) or one line per reminder you added in Cloud Nine. ✅ The connection works.
- If you see **“Wrong or missing token”**, the header is wrong. Check it says exactly `Authorization` and `Bearer `, a single space, then the token, with no space at the end.

You can delete the test shortcut afterwards: press and hold it → **Delete**.

---

## Build the real shortcut

In **Shortcuts**, tap **+** and rename the new shortcut to `Cloud Nine Sync`.

### Part 1: bring Cloud Nine reminders to the iPhone

1. **Get Contents of URL**
   - **URL:** your **Bring-back URL**
   - **›** → **Method:** GET
   - **Headers** → **Add new header** → Key `Authorization`, Text `Bearer <your token>` (same as the test)
2. **Split Text**
   - It should read: *Split* **Contents of URL** *by* **New Lines**.
   - If it shows something else, tap the first blue field and choose **Contents of URL**.
3. **Repeat with Each**
   - It should read: *Repeat with each item in* **Split Text**.
   - You’ll see **Repeat with each** and **End Repeat**. The next actions go **between** them. If one lands below **End Repeat**, press and hold it and drag it up.
4. Inside the repeat: **Split Text**
   - Tap the first field → choose **Repeat Item**.
   - Tap **New Lines** → choose **Custom**, then type ` || ` (space, two vertical bars, space). On the iPhone keyboard, `|` is under **123 → #+=**.
5. Inside the repeat: **Get Item from List**
   - It should read: *Get* **First Item** *from* **Split Text**.
6. Inside the repeat: **If**
   - Tap **Condition** → choose **has any value**. It should read: *If* **Item from List** *has any value*.
   - This skips the blank line you get when there’s nothing new.
7. Inside the **If** (between **If** and **Otherwise**): **Add New Reminder**
   - Tap the reminder text placeholder and choose the variable **Item from List**.
   - Optional: tap **›** and choose which **List** these reminders go into, for example *Reminders* or *Cloud Nine*.
   - Leave the **Otherwise** part empty.

**Check Part 1:** in Cloud Nine, add a reminder called `Test from Cloud Nine`. On the iPhone, tap **▶︎** on the shortcut. Open **Reminders**: `Test from Cloud Nine` is there. ✅

> Cloud Nine sends each new reminder to the iPhone **once**. If you run the shortcut again, it won’t be added twice.

### Part 2: send iPhone reminders to Cloud Nine

Add these at the **very bottom**, below the last **End Repeat** and **End If** from Part 1.

8. **Find Reminders**
   - Tap **Add Filter**. Set it to **Is Completed** · **is** · and leave the switch **off** (that means “not completed”).
   - Leave **Sort by**, **Limit** and the rest as they are.
9. **Repeat with Each**
   - It should read: *Repeat with each item in* **Reminders**.
10. Inside this repeat: **Text**. Build this line exactly, using variables:
    1. Tap inside the text box. In the bar above the keyboard tap **Repeat Item**. Tap the **Repeat Item** bubble you just added and choose **Title**.
    2. Type ` || ` (space, two bars, space).
    3. Insert **Repeat Item** again. Tap it → choose **Due Date**. Tap it again → **Date Format** → **ISO 8601**.
    4. Type ` || ` again.
    5. Insert **Repeat Item** once more → choose **Creation Date** → **Date Format** → **ISO 8601**.

    The text box should now show: `Title || Due Date || Creation Date` (as three blue bubbles with ` || ` between them).
11. After the **End Repeat** of this second loop: **Combine Text**
    - It should read: *Combine* **Repeat Results** *with* **New Lines**.
12. **Get Contents of URL**
    - **URL:** your **Send URL**
    - **›** → **Method:** **POST**
    - **Headers** → Key `Authorization`, Text `Bearer <your token>`
    - **Request Body:** **Form**
    - Tap **Add new field** → **Text**. **Key:** `lines`. **Text:** choose the variable **Combined Text**.
13. Optional: **Show Notification** with the text `Cloud Nine synced ☁️`. Turn this off later if it gets annoying.

Tap **Done** (top right).

**Check Part 2:** tap **▶︎** on the shortcut. The first time, iOS asks:

- *“Allow Cloud Nine Sync to access your reminders?”* → **Allow** (or **Allow Full Access**).
- *“Allow Cloud Nine Sync to send items to …workers.dev?”* → **Always Allow**.

Now look in Cloud Nine: your open iPhone reminders appear in the **Reminders** card with the Apple logo, and **Settings → iPhone reminders** says *Last sync from iPhone: just now*. ✅

---

## Make it run by itself

1. In **Shortcuts**, open the **Automation** tab at the bottom.
2. Tap **+** (or **New Automation**).
3. Choose a trigger. Good ones (add several, one at a time):
   - **Time of Day** → pick a time, for example 7:00 → **Daily**. Repeat for 1:00 pm and 9:00 pm.
   - **App** → **Choose** → **Reminders** → tick **Is Closed** (untick *Is Opened*). Now it syncs every time you leave the Reminders app.
4. Tap **Next**. Choose **Run Immediately** and turn **Notify When Run** off.
5. Choose **Cloud Nine Sync** → **Done**.

The automations run in the background. You can always tap the shortcut yourself for an instant sync, or add it to your Home Screen: open the shortcut → **ⓘ** (bottom) → **Add to Home Screen**.

---

## How syncing behaves

| You do this | What happens |
|---|---|
| Add a reminder **in Cloud Nine** | Created in Apple Reminders at the next sync |
| Add a reminder **on the iPhone** | Appears in Cloud Nine at the next sync |
| Complete a reminder **on the iPhone** | Ticked off in Cloud Nine at the next sync |
| Complete an iPhone reminder **in Cloud Nine** | Ticked off in Cloud Nine only. Tick it on the iPhone too; Apple doesn’t let the shortcut find one exact reminder to complete it. |
| Rename a reminder on the iPhone | Cloud Nine updates the title at the next sync |

Due dates from the iPhone show in Cloud Nine. Reminders sent from Cloud Nine to the iPhone arrive without a time; tap them on the iPhone to set an alert.

---

## If something goes wrong

**“Wrong or missing token” (or error 401)**
The **Authorization** header must be exactly `Bearer`, one space, then the token, in **both** Get Contents of URL actions. If you changed the app passcode, the token changed too. Copy the new one from **Settings → iPhone reminders**.

**“The request timed out” / “Could not connect to the server”**
Check the iPhone is online. Open the Bring-back URL in Safari: it should show a short message, not “page not found”. If it says *page not found*, the start of the URL (your Cloud Nine link) is mistyped.

**“Get Contents of URL failed because Shortcuts couldn’t convert from Dictionary to Text”** (or similar)
In step 12, **Request Body** must be **Form**, the field must be a **Text** field named `lines`, and its value must be **Combined Text**.

**The shortcut runs, but nothing shows in Cloud Nine**
- Step 8’s filter must be **Is Completed is off**. If it’s on, you’re sending only completed reminders.
- In step 10, all three bubbles must say **Title**, **Due Date** and **Creation Date**, not just “Repeat Item”. Tap each to check.
- Open **Settings → Privacy & Security → Reminders** and make sure **Shortcuts** has **Full Access**.

**A blank reminder appears on the iPhone**
Step 6 (**If … has any value**) is missing, or **Add New Reminder** is outside the If. Drag it between **If** and **Otherwise**.

**I see a reminder twice in Cloud Nine**
Run the shortcut once more; Cloud Nine matches reminders it already sent to the iPhone. If you renamed it on the iPhone before the first sync, delete the extra copy in Cloud Nine.

**Automation doesn’t run**
Open **Automation**, tap the automation, and check **Run Immediately** is selected. Low Power Mode can delay automations; they run when the phone is next unlocked.

**Does this work on Android or Windows phones?**
No. It needs an iPhone or iPad with the Shortcuts app.
