// Regenerates the "brain" (situation summary) for a single client.
// Reads: last ~60 messages, all open todos, pending flagged items.
// Writes: a structured brain_json to SITUATIONS with 7 sections.
//
// Usage:
//   POST /.netlify/functions/regenerate-brain
//   Body: { clientId: "aaro-001" }
//
// Response:
//   { ok: true, brain: {...}, updated_at: "2026-04-21T..." }

const { google } = require("googleapis");
const { upsertSituation } = require("./utils/sheets");

const MAX_MESSAGES = 60;

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

function parseRows(rows) {
  if (!rows || rows.length < 2) return [];
  const h = rows[0];
  return rows.slice(1).filter(r => r.length > 0).map(r => {
    const obj = {};
    h.forEach((key, i) => { obj[key] = r[i] || ""; });
    return obj;
  });
}

// ── Core: pull data for one client + ask Claude for the brain ─────
async function regenerateForClient(clientId, { sheets, sheetId, apiKey }) {
  // Fetch source data in parallel
  const [clientsRes, todosRes, flaggedRes, messagesRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: "CLIENTS!A:C" }),
    sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: "TODOS!A:I" }),
    sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: "FLAGGED!A:H" }),
    sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: "MESSAGES!A:N" }),
  ]);

  const clients = parseRows(clientsRes.data.values);
  const todos = parseRows(todosRes.data.values);
  const flagged = parseRows(flaggedRes.data.values);
  const messages = parseRows(messagesRes.data.values);

  const client = clients.find(c => c.id === clientId);
  if (!client) throw new Error(`Client "${clientId}" not found`);
  const clientName = client.name;

  // Filter + sort: messages for this client, newest first, cap
  const clientMessages = messages
    .filter(m => m.client_id === clientId)
    .sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""))
    .slice(0, MAX_MESSAGES);

  const openTodos = todos.filter(t => t.client_id === clientId && t.done !== "true");
  const pendingFlagged = flagged.filter(f => f.client_id === clientId && f.status === "pending");

  // Nothing to summarize — return empty brain
  if (clientMessages.length === 0 && openTodos.length === 0 && pendingFlagged.length === 0) {
    const emptyBrain = {
      current_focus: [],
      recent_mentions: [],
      open_threads: [],
      parked_ideas: [],
      decisions: [],
      risks: [],
      sentiment: { tone: "neutral", note: "No recent activity to analyze." },
      headline: "Quiet period — no recent messages or open work.",
    };
    const now = new Date().toISOString();
    await upsertSituation(clientId, now, 0, JSON.stringify(emptyBrain));
    return { brain: emptyBrain, updated_at: now, messageCount: 0 };
  }

  // Build compact context for Claude
  const messagesBlock = clientMessages
    .slice() // copy
    .reverse() // chronological for Claude
    .map(m => {
      const t = m.timestamp ? m.timestamp.split("T")[0] : "?";
      const cls = m.classification ? `[${m.classification}]` : "";
      const contact = m.contact || "unknown";
      const body = (m.message || "").replace(/\s+/g, " ").slice(0, 280);
      return `${t} ${cls} ${contact}: ${body}`;
    })
    .join("\n");

  const todosBlock = openTodos.length
    ? openTodos.map(t => `- [${t.urgency || "medium"}] ${t.text}`).join("\n")
    : "(none)";

  const flaggedBlock = pendingFlagged.length
    ? pendingFlagged.map(f => `- ${f.contact}: "${(f.message || "").slice(0, 140)}" — ${f.reason || f.summary || ""}`).join("\n")
    : "(none)";

  const prompt = `You are Leadly's client intelligence layer. You maintain a living "brain" for each client — a structured situation document that helps the team stay on top of the relationship without re-reading every message.

CLIENT: ${clientName}

RECENT MESSAGES (newest last, last ${clientMessages.length} messages):
${messagesBlock}

OPEN TODOS:
${todosBlock}

FLAGGED FOR REVIEW:
${flaggedBlock}

Build a fresh brain for this client. Be specific, use contact names where they matter, and be concise. Empty arrays are fine if a section genuinely has nothing.

Rules:
- Never invent facts. Only surface what's actually in the data.
- Prefer specificity over generality. "Tong Boon asked about second listing type on Apr 18" beats "considering new options".
- For current_focus, list 1–3 things the team is actively delivering on right now.
- For recent_mentions, highlight things a named contact raised that aren't todos yet but are worth remembering. Max 5.
- For open_threads, list things where the client is waiting on us, OR we're waiting on them. State who owes whom. Max 5.
- For parked_ideas, list suggestions/options raised that got deferred. Max 4.
- For decisions, list clear decisions that were made (with date if visible). Max 4.
- For risks, flag relationship risks, deadline risks, billing concerns, scope creep, frustration signals. Max 3. Empty is fine.
- For sentiment, give a one-word tone (positive, neutral, cautious, strained) and one short note (max 20 words).
- For headline, write ONE sentence (max 18 words) capturing the overall state of this client right now.

Respond ONLY with valid JSON, no markdown fences, matching this exact schema:
{
  "headline": "string",
  "current_focus": [{"title": "string", "detail": "string"}],
  "recent_mentions": [{"contact": "string", "mention": "string", "when": "string"}],
  "open_threads": [{"thread": "string", "waiting_on": "us | them | both", "since": "string"}],
  "parked_ideas": [{"idea": "string", "raised_by": "string"}],
  "decisions": [{"decision": "string", "when": "string"}],
  "risks": [{"risk": "string", "severity": "low | medium | high"}],
  "sentiment": {"tone": "positive | neutral | cautious | strained", "note": "string"}
}`;

  // Call Claude
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await r.json();
  if (!data || !data.content) throw new Error(data?.error?.message || `HTTP ${r.status}`);
  const txt = data.content.filter(b => b.type === "text").map(b => b.text).join("");

  let brain;
  try {
    brain = JSON.parse(txt.replace(/```json|```/g, "").trim());
  } catch (e) {
    throw new Error(`Claude returned invalid JSON: ${e.message}`);
  }

  // Normalize — ensure all arrays exist even if Claude omitted some
  const normalized = {
    headline: brain.headline || "",
    current_focus: Array.isArray(brain.current_focus) ? brain.current_focus : [],
    recent_mentions: Array.isArray(brain.recent_mentions) ? brain.recent_mentions : [],
    open_threads: Array.isArray(brain.open_threads) ? brain.open_threads : [],
    parked_ideas: Array.isArray(brain.parked_ideas) ? brain.parked_ideas : [],
    decisions: Array.isArray(brain.decisions) ? brain.decisions : [],
    risks: Array.isArray(brain.risks) ? brain.risks : [],
    sentiment: brain.sentiment && typeof brain.sentiment === "object"
      ? { tone: brain.sentiment.tone || "neutral", note: brain.sentiment.note || "" }
      : { tone: "neutral", note: "" },
  };

  const now = new Date().toISOString();
  await upsertSituation(clientId, now, clientMessages.length, JSON.stringify(normalized));

  return { brain: normalized, updated_at: now, messageCount: clientMessages.length };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "POST only" };

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { statusCode: 400, body: JSON.stringify({ error: "ANTHROPIC_API_KEY not set on Netlify" }) };
    }

    let body = {};
    try { body = JSON.parse(event.body || "{}"); } catch {}
    const clientId = body.clientId;
    if (!clientId) {
      return { statusCode: 400, body: JSON.stringify({ error: "clientId required in POST body" }) };
    }

    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const sheetId = process.env.LEADLY_SHEET_ID;

    const result = await regenerateForClient(clientId, { sheets, sheetId, apiKey });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, ...result }),
    };
  } catch (err) {
    console.error("regenerate-brain error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

// Export for scheduled runner
exports._internal = { regenerateForClient };
