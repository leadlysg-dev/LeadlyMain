// Reprocesses existing messages that never got classified.
// Processes a BATCH per call (default 8 messages) to stay within Netlify's
// 10-second function timeout. Frontend loops calling this until done === true.
//
// Usage:
//   POST /.netlify/functions/reprocess-messages  (body optional: { batchSize: 8 })
//
// Response:
//   { done: false, processed: 8, remaining: 50, totalPending: 58, results: {todo, important, noise, unrouted, errored} }
//   { done: true, processed: 2, remaining: 0, totalPending: 2, ... }

const { google } = require("googleapis");
const { appendRow } = require("./utils/sheets");

const DEFAULT_BATCH = 8; // 8 parallel Claude calls fits comfortably in 10s

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

function buildPrompt(clientName, contactName, conversationName, messageBody) {
  return `You are a marketing agency assistant for Leadly (Singapore). Client "${clientName}" — contact "${contactName}" sent this WhatsApp message${conversationName ? ` in group "${conversationName}"` : ""}:

"${messageBody}"

Classify this message into ONE of three buckets:

1. "todo" — a clear, actionable task the Leadly team needs to do
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
      model: "claude-sonnet-4-20250514", max_tokens: 512,
      messages: [{ role: "user", content: buildPrompt(clientName, contactName, conversationName, messageBody) }],
    }),
  });
  const data = await r.json();
  if (!data || !data.content) throw new Error(data?.error?.message || `HTTP ${r.status}`);
  const txt = data.content.filter(b => b.type === "text").map(b => b.text).join("");
  return JSON.parse(txt.replace(/```json|```/g, "").trim());
}

exports.handler = async (event) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { statusCode: 400, body: JSON.stringify({
        error: "ANTHROPIC_API_KEY not set on Netlify. Add it in Site configuration → Environment variables, redeploy, then try again.",
      })};
    }

    // Parse batch size from body if provided
    let batchSize = DEFAULT_BATCH;
    if (event.body) {
      try {
        const parsed = JSON.parse(event.body);
        if (parsed.batchSize && parsed.batchSize > 0 && parsed.batchSize <= 20) {
          batchSize = parsed.batchSize;
        }
      } catch {}
    }

    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const sid_ = process.env.LEADLY_SHEET_ID;

    const res = await sheets.spreadsheets.values.get({ spreadsheetId: sid_, range: "MESSAGES!A:N" });
    const rows = res.data.values || [];
    if (rows.length < 2) {
      return {
        statusCode: 200,
        body: JSON.stringify({ done: true, processed: 0, remaining: 0, totalPending: 0, message: "No messages to reprocess" }),
      };
    }

    // Columns: 0:id 1:timestamp 2:client_id 3:client_name 4:contact 5:phone
    //          6:conversation 7:direction 8:message 9:classification
    //          10:reasoning 11:todo_ids 12:flagged_id 13:status
    const pending = [];
    for (let i = 1; i < rows.length; i++) {
      const cls = (rows[i][9] || "").trim();
      if (cls === "" || cls === "unclassified") {
        pending.push({ rowIndex: i, sheetRow: i + 1, row: rows[i] });
      }
    }

    const totalPending = pending.length;
    if (totalPending === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          done: true, processed: 0, remaining: 0, totalPending: 0,
          message: "All messages already classified",
        }),
      };
    }

    // Take up to batchSize
    const batch = pending.slice(0, batchSize);
    const results = { todo: 0, important: 0, noise: 0, unrouted: 0, errored: 0 };

    // Process batch in parallel — each item does its Claude call + sheet updates independently
    await Promise.all(batch.map(async ({ sheetRow, row }) => {
      const clientId = row[2];
      const clientName = row[3];
      const contactName = row[4];
      const conversationName = row[6];
      const messageBody = row[8];
      const existingTimestamp = row[1] || new Date().toISOString();
      const today = existingTimestamp.split("T")[0];

      // No client_id → mark as unrouted, skip Claude
      if (!clientId) {
        const reason = `Unknown contact "${contactName}"${conversationName ? ` in "${conversationName}"` : ""} — no matching client`;
        await sheets.spreadsheets.values.update({
          spreadsheetId: sid_,
          range: `MESSAGES!J${sheetRow}:K${sheetRow}`,
          valueInputOption: "RAW",
          requestBody: { values: [["unrouted", reason]] },
        });
        results.unrouted++;
        return;
      }

      try {
        const result = await classifyOne(messageBody, clientName || clientId, contactName, conversationName, apiKey);
        const classification = result.classification || "important";
        const reasoning = result.reasoning || "";
        const todoIds = [];
        let flaggedId = "";

        // Create todos (serial within this message — usually 1 todo anyway)
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

        if (classification === "important") {
          flaggedId = sid("f");
          await appendRow("FLAGGED", [
            flaggedId, clientId, contactName, messageBody,
            result.summary || "", result.flagReason || reasoning || "Unclear intent",
            existingTimestamp, "pending",
          ]);
        }

        await sheets.spreadsheets.values.update({
          spreadsheetId: sid_,
          range: `MESSAGES!J${sheetRow}:M${sheetRow}`,
          valueInputOption: "RAW",
          requestBody: { values: [[classification, reasoning, todoIds.join(","), flaggedId]] },
        });

        results[classification] = (results[classification] || 0) + 1;
      } catch (err) {
        console.error(`Reprocess error on row ${sheetRow}:`, err.message);
        // Fallback: mark important so user can review
        try {
          await sheets.spreadsheets.values.update({
            spreadsheetId: sid_,
            range: `MESSAGES!J${sheetRow}:K${sheetRow}`,
            valueInputOption: "RAW",
            requestBody: { values: [["important", `Reprocess error: ${err.message.slice(0, 80)}`]] },
          });
          results.important++;
        } catch {
          results.errored++;
        }
      }
    }));

    const processed = batch.length;
    const remaining = totalPending - processed;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        done: remaining === 0,
        processed,
        remaining,
        totalPending,
        results,
        message: remaining === 0
          ? `All ${totalPending} messages classified ✓`
          : `Processed ${processed}, ${remaining} remaining…`,
      }),
    };
  } catch (err) {
    console.error("reprocess-messages fatal:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message, done: false }) };
  }
};
