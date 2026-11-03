# 1. Put Cloud Nine online

You do this **once**. It takes about 10 minutes and costs nothing. At the end you get a private web link that works on any computer or phone.

## Who should do this?

Cloud Nine keeps its data in the Cloudflare account it’s set up in. So:

- **Best:** the person who will use the planner creates the accounts and follows this guide (with your help if needed). Their data then lives in their own account.
- **Also fine:** you set it up in your own Cloudflare account and send them the link and passcode. Their planner data will then sit in your account.

## What you need

- A **GitHub** account (free): [github.com/signup](https://github.com/signup)
- A **Cloudflare** account (free, no card): [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
- A **passcode** to protect the app. Use 8 or more characters that are easy for the user to type on a phone.
- Optional: a free **Gemini API key** for Cloudy. You can add this later. See [Cloudy (AI)](GEMINI.md).

## Option A: one-click setup (recommended)

1. Click this button:

   [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/SriKumar2/LifeStyle-Planner)

2. **Sign in to Cloudflare** (or create the account) when asked.
3. **Connect GitHub** when asked, and allow Cloudflare to create a repository. Cloudflare makes a copy of Cloud Nine in your GitHub account.
4. On the setup page:
   - **Project / Worker name:** keep `cloud-nine`, or choose another. It becomes part of your link.
   - **APP_PASSCODE:** type the passcode the user will sign in with.
   - **GEMINI_API_KEY:** paste a Gemini key, or type `none` to add one later inside the app.
   - Leave everything else as it is. The database (a “Durable Object”) is created for you.
5. Click **Create and deploy** and wait 1 to 2 minutes.
6. When it says the deployment succeeded, click **Visit** or copy the link. It looks like:

   ```
   https://cloud-nine.<your-account-name>.workers.dev
   ```

7. Open the link, type the passcode, and you should see the dashboard.

**Send the user two things:** the link and the passcode. Then point them to the [Windows](2-WINDOWS.md) and [iPhone](3-IPHONE.md) guides.

## Option B: set it up from a terminal

For people comfortable with a command line. You need [Node.js](https://nodejs.org) 20 or newer.

```bash
git clone https://github.com/SriKumar2/LifeStyle-Planner.git
```

```bash
cd LifeStyle-Planner
```

```bash
npm install
```

```bash
npx wrangler login
```

```bash
npx wrangler deploy
```

```bash
npx wrangler secret put APP_PASSCODE
```

Type the passcode when it asks. The last line of `wrangler deploy` shows your link.

## Changing the passcode

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → your Worker (for example **cloud-nine** or **lifestyle-planner**).
2. Open **Settings** → **Variables and Secrets**.
3. Next to **APP_PASSCODE**, choose **Edit**, type the new passcode and **Deploy**.

Every device is signed out and needs the new passcode.

## Getting updates

When Cloud Nine gets new features in [SriKumar2/LifeStyle-Planner](https://github.com/SriKumar2/LifeStyle-Planner):

- **If you used Option A:** open your copy on GitHub, replace the changed files with the new ones (or ask someone comfortable with Git to pull the changes in), and commit. Cloudflare rebuilds and updates the app by itself within a couple of minutes.
- **If you used Option B:** run `git pull` and then `npx wrangler deploy`.

Your planner data is not touched by updates.

## Your own web address (optional)

If you own a domain, open the Worker in Cloudflare → **Settings** → **Domains & Routes** → **Add** → **Custom domain**, and follow the steps.

## Is it really free?

Yes, for one person. Cloudflare’s free plan includes 100,000 requests a day and a free database. A busy day in Cloud Nine uses a few hundred.
