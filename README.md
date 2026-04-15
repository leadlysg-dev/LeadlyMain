# Leadly Dashboard v2 — Sheets-backed

Everything lives in Google Sheets. Dashboard reads/writes via Netlify Functions.

---

## Step 1: Create the master Google Sheet

1. Go to https://sheets.google.com
2. Click **Blank spreadsheet**
3. Name it **Leadly Dashboard**
4. Look at the URL — copy the Sheet ID:
   `https://docs.google.com/spreadsheets/d/THIS_PART_IS_THE_ID/edit`
5. Share the sheet with your service account as **Editor**:
   `aaro-reporting@aaro-reporting.iam.gserviceaccount.com`

Save that Sheet ID — you need it in Step 3.

---

## Step 2: Replace your local files

Delete your old `leadly-app` folder and unzip this new one:

```bash
rm -rf ~/leadly-app
cd ~/Downloads
unzip leadly-app.zip -d ~/leadly-app
cd ~/leadly-app
npm install
```

---

## Step 3: Add env vars to Netlify

Go to your Netlify site → **Site configuration** → **Environment variables**.

Add these 5 variables:

| Variable | Value | Where to find it |
|---|---|---|
| `GOOGLE_SA_EMAIL` | `aaro-reporting@aaro-reporting.iam.gserviceaccount.com` | Same as your AARO pipeline |
| `GOOGLE_SA_PRIVATE_KEY` | (long base64 string) | Same as your AARO pipeline |
| `LEADLY_SHEET_ID` | (from Step 1) | The Sheet ID you just copied |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Your Anthropic key |
| `TELEGRAM_BOT_TOKEN` | (your bot token) | Same @Leadly_sg_bot token |

---

## Step 4: Push to GitHub and deploy

```bash
cd ~/leadly-app
git init
git add .
git commit -m "v2 sheets backend"
git remote add origin https://github.com/YOUR_USERNAME/leadly-dashboard.git
git push -u origin main --force
```

Wait for Netlify to finish deploying (check the Deploys tab).

---

## Step 5: Seed your clients

Once deployed, open this URL in your browser:

```
https://YOUR-SITE.netlify.app/.netlify/functions/seed
```

You should see: `{"message":"Seeded 4 clients"}`

This creates the CLIENTS, TODOS, and FLAGGED tabs in your Google Sheet and populates your 4 clients (AARO, Aether Athletics, HomeUp, Axis Collective).

---

## Step 6: Open the dashboard

Go to your Netlify URL. You should see your 4 clients with their contacts loaded from the sheet.

---

## Running locally (for development)

You need Netlify CLI to run the functions locally:

```bash
npm install -g netlify-cli
```

Create a `.env` file (copy from the example):

```bash
cp .env.example .env
```

Edit `.env` and fill in your real values. Then run:

```bash
netlify dev
```

This runs BOTH the frontend AND the Netlify Functions locally. Opens at `http://localhost:8888`. Your functions work at `http://localhost:8888/.netlify/functions/...`

Regular `npm run dev` only runs the frontend — the API calls won't work locally without `netlify dev`.

---

## How it all connects

```
You add a todo manually
  → Dashboard calls /.netlify/functions/save-todo
  → Function writes to Google Sheet TODOS tab
  → Dashboard refreshes from sheet

Client sends WhatsApp
  → GHL workflow fires webhook to /.netlify/functions/ghl-webhook
  → Function sends message to Claude
  → Claude extracts todos → written to TODOS tab
  → Unclear messages → written to FLAGGED tab
  → High urgency → Telegram alert

You paste Fathom transcript
  → Dashboard calls /.netlify/functions/process-fathom
  → Function sends transcript to Claude
  → Todos + flagged written directly to sheet
  → Dashboard refreshes
```

---

## Env vars summary

| Variable | Purpose |
|---|---|
| `GOOGLE_SA_EMAIL` | Service account for Sheets API |
| `GOOGLE_SA_PRIVATE_KEY` | Private key (base64) for auth |
| `LEADLY_SHEET_ID` | The master dashboard Sheet |
| `ANTHROPIC_API_KEY` | Claude API for Fathom + WhatsApp processing |
| `TELEGRAM_BOT_TOKEN` | Telegram alerts for urgent todos |

---

## GHL Webhook setup (per client)

After the dashboard is working, set up the WhatsApp automation:

1. In each GHL sub-account → **Automations** → **Workflows**
2. New workflow → trigger: **Customer Reply**
3. Add action: **Custom Webhook** → POST
4. URL: `https://YOUR-SITE.netlify.app/.netlify/functions/ghl-webhook`
5. Body:
```json
{
  "locationId": "{{location.id}}",
  "contactName": "{{contact.name}}",
  "messageBody": "{{message.body}}",
  "direction": "inbound"
}
```
6. Turn on and publish

Update the `LOCATION_MAP` in `netlify/functions/ghl-webhook.js` with each client's real GHL location ID.
