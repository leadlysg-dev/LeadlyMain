# Leadly Dashboard v3 — Live WhatsApp Feed

Everything still lives in Google Sheets. Dashboard now shows every WhatsApp message streaming in, with Claude's classification for each one (todo / important / noise / unrouted) and the reasoning behind the call.

---

## What's new in v3

- **Live Feed tab** — every inbound WA message shown chronologically with a colored classification badge, auto-refreshes every 30s
- **MESSAGES sheet tab** — every message now logged (not just ones that produced todos). You have a full audit trail
- **Claude reasoning saved** — one-line explanation of why a message got classified as todo vs important vs noise, visible inline
- **Per-client Messages section** — each client page now shows their recent WA messages with the same filters
- **Reclassify & promote** — if Claude got a call wrong, one click changes the classification; one input promotes any message into a todo
- **Unrouted handling** — when the webhook can't match a contact to a client, it still gets logged and you can assign it from the UI

The four classifications:

| Class | Meaning | Example |
|---|---|---|
| **Todo** (green) | Clear actionable task | "Can you update the ad copy?" |
| **Important** (amber) | Needs human review | "Why did leads drop last week?" |
| **Noise** (grey) | Chitchat, confirmations | "ok thanks!" |
| **Unrouted** (red) | Can't match to a client | Unknown contact name |

---

## Step 1: Create the master Google Sheet

1. Go to https://sheets.google.com
2. Click **Blank spreadsheet**
3. Name it **Leadly Dashboard**
4. Copy the Sheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/THIS_PART_IS_THE_ID/edit`
5. Share the sheet with your service account as **Editor**:
   `aaro-reporting@aaro-reporting.iam.gserviceaccount.com`

**If you already had v2 running, you can reuse the same sheet.** The new MESSAGES tab will be auto-created when the app first loads.

---

## Step 2: Replace your local files

```bash
rm -rf ~/leadly-app
cd ~/Downloads
unzip leadly-app-v3.zip -d ~/leadly-app
cd ~/leadly-app
npm install
```

---

## Step 3: Add env vars to Netlify

Go to your Netlify site → **Site configuration** → **Environment variables**.

Add these 6 variables:

| Variable | Value | Where to find it |
|---|---|---|
| `GOOGLE_SA_EMAIL` | `aaro-reporting@aaro-reporting.iam.gserviceaccount.com` | Same as your AARO pipeline |
| `GOOGLE_SA_PRIVATE_KEY` | (long base64 string) | Same as your AARO pipeline |
| `LEADLY_SHEET_ID` | (from Step 1) | The Sheet ID you just copied |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Your Anthropic key |
| `TELEGRAM_BOT_TOKEN` | (your bot token) | Same @Leadly_sg_bot token |
| `TELEGRAM_CHAT_ID` | (group chat ID) | For high-urgency alerts |

---

## Step 4: Push to GitHub and deploy

```bash
cd ~/leadly-app
git add .
git commit -m "v3 live feed"
git push
```

Wait for Netlify to finish deploying.

---

## Step 5: Seed your clients (first-time only)

If this is a fresh sheet, open this URL once:

```
https://YOUR-SITE.netlify.app/.netlify/functions/seed
```

You should see: `{"message":"Seeded 4 clients"}`

---

## Step 6: Open the dashboard

Go to your Netlify URL. The **Live Feed** is now the default view.

As WhatsApp messages come in through your GHL webhook, they'll appear here within 30 seconds (or hit Refresh for instant).

---

## How it works now

```
Client sends WhatsApp
  → GHL workflow fires webhook to /.netlify/functions/ghl-webhook
  → Router matches contact/group to a client (or flags as unrouted)
  → Claude classifies: todo / important / noise
  → EVERY message written to MESSAGES sheet tab (with reasoning)
  → If todo → also written to TODOS
  → If important → also written to FLAGGED
  → If high-urgency todo → Telegram alert fires
  → Live Feed in the app shows it within 30s
```

---

## Live Feed UI

The sidebar now has three levels:

- **Live Feed** — all messages, all clients (with new-message counter badge)
- **Dashboard** — merged view of todos and flagged across clients
- **Per client** — contacts, flagged, todos, recent messages, archive

### In the Live Feed

Top strip shows stat tiles: **All / Todos / Important / Noise / Unrouted**. Click any tile to filter.

Client dropdown + type dropdown let you slice further (e.g. "show only AARO's important messages").

Each message card has a colored left border matching its classification. Click to expand → see the full message, Claude's reasoning, any linked todos/flags, and action buttons:

- **✓ Mark reviewed** — hides it from "new" counts without deleting
- **→ Todo** — types a custom todo text and promotes the message into TODOS
- **Assign client** — for unrouted messages, pick the client and create a todo in one step
- **→ Todo / → Important / → Noise** — if Claude misclassified, override it

---

## Env vars summary

| Variable | Purpose |
|---|---|
| `GOOGLE_SA_EMAIL` | Service account for Sheets API |
| `GOOGLE_SA_PRIVATE_KEY` | Private key (base64) for auth |
| `LEADLY_SHEET_ID` | The master dashboard Sheet |
| `ANTHROPIC_API_KEY` | Claude API for WhatsApp classification + Fathom |
| `TELEGRAM_BOT_TOKEN` | Telegram alerts for urgent todos |
| `TELEGRAM_CHAT_ID` | Target group for alerts |

---

## GHL Webhook setup (unchanged from v2)

After the dashboard is working:

1. In each GHL sub-account → **Automations** → **Workflows**
2. New workflow → trigger: **Customer Reply**
3. Add action: **Custom Webhook** → POST
4. URL: `https://YOUR-SITE.netlify.app/.netlify/functions/ghl-webhook`
5. Body:
```json
{
  "locationId": "{{location.id}}",
  "contactName": "{{contact.name}}",
  "contactPhone": "{{contact.phone}}",
  "conversationName": "{{conversation.name}}",
  "messageBody": "{{message.body}}",
  "direction": "inbound"
}
```
6. Turn on and publish

The routing table in `netlify/functions/ghl-webhook.js` maps contact names and group chat names to client IDs — update it when you add new clients or contacts.

---

## Tuning the classifier

The Claude prompt lives in `netlify/functions/ghl-webhook.js`. Current rules:

- **Todo** = clear, actionable task
- **Important** = question, concern, complaint, strategic feedback, billing mention, ambiguity
- **Noise** = small talk, thanks, emoji, "ok", "got it", confirmations

When in doubt between important and noise → important wins. When in doubt between todo and important → important wins (you can promote it with one click in the UI).

If you want Claude to be more aggressive about creating todos, edit the prompt and tighten the noise rules. If too many things get flagged as important, add more examples of what counts as noise.
