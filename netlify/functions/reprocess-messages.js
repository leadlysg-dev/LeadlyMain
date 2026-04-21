// Reprocesses existing messages that never got classified.
// Call this after adding ANTHROPIC_API_KEY to Netlify (or any time you
// see "unclassified" rows in MESSAGES). It's idempotent — only touches
// rows where classification is empty or "unclassified".
//
// Trigger: open /.netlify/functions/reprocess-messages in browser, or
// click the "Reprocess" button in the Live Feed header.

const { google } = require("googleapis");
const { appendRow } = require("./utils/sheets");

function getAuth() {
  const raw = process.env.GOOGLE_SA_PRIVATE_KEY;
  let privateKey;
  if (raw.includes("BEGIN PRIVATE KEY")) privateKey = raw.replace(/\\n/g, "\n");
  else if (raw.includes("MIIEv") || raw.includes("MIIE")) privateKey = `-----BEGIN PRIVATE KEY-----\n${raw}\n-----END PRIVATE KEY-----\n`;
  else privateKey = Buffer.from(raw, "base64").toString("utf8");
  return new google.auth.GoogleAuth({
    credentials: { client_email: process.env.GOOGLE_SA_EMAIL, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

const sid = (suffix = "") =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 5) + suffix;

// Same prompt as the webhook, kept in sync.
function buildPrompt(clientName, contactName, conversationName, messageBody) {
  return `You are a marketing agency assistant for Leadly (Singapore). Client "${clientName}" — contact "${contactName}" sent this WhatsApp message${conversationName ? ` in group "${conversationName}"` : ""}:

"${messageBody}"

Classify this message into ONE of three buckets:

1. "todo" — a clear, actionable task the Leadly team needs to do (e.g. "Can you update the ad copy?", "Please send the report", "Add this to the website")
2. "important" — not a clear todo, but something that needs a human to review: questions, concerns, complaints, strategic feedback, decisions to be made, pricing/billing mentions, ambiguity worth checking
3. "noise" — chitchat, thanks, emoji, confirmations like "ok", "got it", "sounds good", greetings, small talk

When in doubt between important and noise, pick important.

Respond ONLY valid JSON, no markdown:
{
  "classification": "todo" | "important" | "noise",
  "reasoning": "one short sentence explaining why (max 15 words)",
  "todos": [{"text":"...","urgency":"high|medium|low","category":"ads|reporting|website|billing|general"}],
  "summary": "short summary if important (empty if todo or noise)",
  "flagReason": "why it needs review if important (empty otherwise)"
}`;
}

async function classifyOne(messageBody, clientName, contactName, conversationName, apiKey) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens: 1024,
      messages: [{ role: "user", content: buildPrompt(clientName, contactName, conversationName, messageBody) }],
    }),
  });
  const data = await r.json();
  if (!data || !data.content) throw new Error(data?.error?.message || `HTTP ${r.status}`);
  const txt = data.content.filter(b => b.type === "text").map(b => b.text).join("");
  return JSON.parse(txt.replace(/```json|```/g, "").trim());
}

exports.handler = async () => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { statusCode: 400, body: JSON.stringify({
        error: "ANTHROPIC_API_KEY not set on Netlify. Add it in Site configuration → Environment variables, redeploy, then try again.",
      })};
    }

    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const sid_ = process.env.LEADLY_SHEET_ID;

    const res = await sheets.spreadsheets.values.get({ spreadsheetId: sid_, range: "MESSAGES!A:N" });
    const rows = res.data.values || [];
    if (rows.length < 2) {
      return { statusCode: 200, body: JSON.stringify({ message: "No messages to reprocess", processed: 0 }) };
    }

    // Columns: 0:id 1:timestamp 2:client_id 3:client_name 4:contact 5:phone
    //          6:conversation 7:direction 8:message 9:classification
    //          10:reasoning 11:todo_ids 12:flagged_id 13:status
    const toProcess = [];
    for (let i = 1; i < rows.length; i++) {
      const cls = (rows[i][9] || "").trim();
      if (cls === "" || cls === "unclassified") {
        toProcess.push({ rowIndex: i, row: rows[i] });
      }
    }

    if (toProcess.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ message: "Nothing to reprocess — all messages already classified", processed: 0 }) };
    }

    let processed = 0, errored = 0, unrouted = 0, noClient = 0;
    const results = { todo: 0, important: 0, noise: 0, unrouted: 0 };

    // Process sequentially to avoid hammering Claude
    for (const { rowIndex, row } of toProcess) {
      const sheetRow = rowIndex + 1; // sheets are 1-indexed
      const messageId = row[0];
      const clientId = row[2];
      const clientName = row[3];
      const contactName = row[4];
      const conversationName = row[6];
      const messageBody = row[8];
      const existingTimestamp = row[1] || new Date().toISOString();

      // No client_id → mark as unrouted without calling Claude
      if (!clientId) {
        const reason = `Unknown contact "${contactName}"${conversationName ? ` in "${conversationName}"` : ""} — no matching client`;
        await sheets.spreadsheets.values.update({
          spreadsheetId: sid_,
          range: `MESSAGES!J${sheetRow}:K${sheetRow}`,
          valueInputOption: "RAW",
          requestBody: { values: [["unrouted", reason]] },
        });
        results.unrouted++;
        unrouted++;
        processed++;
        continue;
      }

      // Client exists → classify with Claude
      try {
        const result = await classifyOne(messageBody, clientName || clientId, contactName, conversationName, apiKey);
        const classification = result.classification || "important";
        const reasoning = result.reasoning || "";
        const todoIds = [];
        let flaggedId = "";
        const today = existingTimestamp.split("T")[0];

        // Create todos
        if (classification === "todo" && Array.isArray(result.todos) && result.todos.length > 0) {
          for (const t of result.todos) {
            const tid = sid();
            todoIds.push(tid);
            await appendRow("TODOS", [
              tid, clientId, t.text, "false", "whatsapp", today,
              t.urgency || "medium", t.category || "general", "false",
            ]);
          }
        }

        // Create flagged entry
        if (classification === "important") {
          flaggedId = sid("f");
          await appendRow("FLAGGED", [
            flaggedId, clientId, contactName, messageBody,
            result.summary || "", result.flagReason || reasoning || "Unclear intent",
            existingTimestamp, "pending",
          ]);
        }

        // Update the MESSAGES row: classification, reasoning, todo_ids, flagged_id
        await sheets.spreadsheets.values.update({
          spreadsheetId: sid_,
          range: `MESSAGES!J${sheetRow}:M${sheetRow}`,
          valueInputOption: "RAW",
          requestBody: { values: [[classification, reasoning, todoIds.join(","), flaggedId]] },
        });

        results[classification] = (results[classification] || 0) + 1;
        processed++;
      } catch (err) {
        console.error(`Reprocess error on row ${sheetRow}:`, err.message);
        // Mark as important so user can review manually
        await sheets.spreadsheets.values.update({
          spreadsheetId: sid_,
          range: `MESSAGES!J${sheetRow}:K${sheetRow}`,
          valueInputOption: "RAW",
          requestBody: { values: [["important", `Reprocess error: ${err.message.slice(0, 80)}`]] },
        });
        errored++;
        processed++;
      }

      // Small delay between Claude calls to avoid rate limits
      await new Promise(r => setTimeout(r, 150));
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Reprocessed ${processed} messages`,
        processed, errored, unrouted, results,
      }),
    };
  } catch (err) {
    console.error("reprocess-messages fatal:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
