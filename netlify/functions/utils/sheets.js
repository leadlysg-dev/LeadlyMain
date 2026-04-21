const { google } = require("googleapis");

function getAuth() {
  const raw = process.env.GOOGLE_SA_PRIVATE_KEY;
  let privateKey;
  if (raw.includes("BEGIN PRIVATE KEY")) {
    privateKey = raw.replace(/\\n/g, "\n");
  } else if (raw.includes("MIIEv") || raw.includes("MIIE")) {
    privateKey = `-----BEGIN PRIVATE KEY-----\n${raw}\n-----END PRIVATE KEY-----\n`;
  } else {
    privateKey = Buffer.from(raw, "base64").toString("utf8");
  }
  return new google.auth.GoogleAuth({
    credentials: { client_email: process.env.GOOGLE_SA_EMAIL, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheets() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

const SHEET_ID = () => process.env.LEADLY_SHEET_ID;

// Message cap — only return the latest N messages to keep the UI snappy
const MESSAGES_LIMIT = 400;

// ── Ensure tabs exist with headers ────────────────────────────
async function ensureSetup() {
  const sheets = getSheets();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID() });
  const existing = meta.data.sheets.map(s => s.properties.title);

  const tabs = {
    CLIENTS: ["id", "name", "contacts"],
    TODOS: ["id", "client_id", "text", "done", "source", "date", "urgency", "category", "recurring"],
    FLAGGED: ["id", "client_id", "contact", "message", "summary", "reason", "timestamp", "status"],
    // Every inbound WhatsApp message logged here with Claude's classification
    MESSAGES: [
      "id", "timestamp", "client_id", "client_name",
      "contact", "phone", "conversation", "direction",
      "message", "classification", "reasoning",
      "todo_ids", "flagged_id", "status",
    ],
    // Client "brain" — one row per client, regenerated daily + on demand.
    // brain_json contains the structured situation document.
    SITUATIONS: [
      "client_id", "updated_at", "message_count_at_update", "brain_json",
    ],
  };

  for (const [tab, headers] of Object.entries(tabs)) {
    if (!existing.includes(tab)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID(),
        requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
      });
      const lastCol = String.fromCharCode(64 + headers.length);
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID(), range: `${tab}!A1:${lastCol}1`,
        valueInputOption: "RAW", requestBody: { values: [headers] },
      });
    }
  }
}

// ── Read all data (clients + todos + flagged + latest messages) ──
async function readAll() {
  const sheets = getSheets();
  await ensureSetup();

  const [clientsRes, todosRes, flaggedRes, messagesRes, situationsRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: "CLIENTS!A:C" }),
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: "TODOS!A:I" }),
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: "FLAGGED!A:H" }),
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: "MESSAGES!A:N" }),
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: "SITUATIONS!A:D" }),
  ]);

  const parse = (rows) => {
    if (!rows || rows.length < 2) return [];
    const h = rows[0];
    return rows.slice(1).filter(r => r.length > 0).map(r => {
      const obj = {};
      h.forEach((key, i) => { obj[key] = r[i] || ""; });
      return obj;
    });
  };

  const clients = parse(clientsRes.data.values);
  const todos = parse(todosRes.data.values);
  const flagged = parse(flaggedRes.data.values);
  const situations = parse(situationsRes.data.values);
  let messages = parse(messagesRes.data.values);

  // Sort messages newest first, cap to latest N
  messages.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
  messages = messages.slice(0, MESSAGES_LIMIT);

  // Parse each situation's brain_json safely
  const situationByClient = {};
  for (const sit of situations) {
    let brain = null;
    try {
      brain = sit.brain_json ? JSON.parse(sit.brain_json) : null;
    } catch { brain = null; }
    situationByClient[sit.client_id] = {
      updated_at: sit.updated_at || "",
      message_count_at_update: parseInt(sit.message_count_at_update || "0", 10) || 0,
      brain,
    };
  }

  const clientsOut = clients.map(c => ({
    id: c.id,
    name: c.name,
    contacts: c.contacts ? JSON.parse(c.contacts) : [],
    todos: todos.filter(t => t.client_id === c.id).map(t => ({ ...t, done: t.done === "true" })),
    flagged: flagged.filter(f => f.client_id === c.id),
    messages: messages.filter(m => m.client_id === c.id),
    situation: situationByClient[c.id] || null,
  }));

  return { clients: clientsOut, messages };
}

// ── Append row ────────────────────────────────────────────────
async function appendRow(tab, values) {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID(), range: `${tab}!A:Z`,
    valueInputOption: "RAW", insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] },
  });
}

// ── Update cell by finding row with matching ID ───────────────
async function updateRow(tab, id, colIndex, newValue) {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: `${tab}!A:A` });
  const rows = res.data.values || [];
  const rowIdx = rows.findIndex(r => r[0] === id);
  if (rowIdx === -1) return false;
  const cell = `${tab}!${String.fromCharCode(65 + colIndex)}${rowIdx + 1}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID(), range: cell, valueInputOption: "RAW",
    requestBody: { values: [[newValue]] },
  });
  return true;
}

// ── Delete row by ID ──────────────────────────────────────────
async function deleteRow(tab, id) {
  const sheets = getSheets();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID() });
  const sheetMeta = meta.data.sheets.find(s => s.properties.title === tab);
  if (!sheetMeta) return false;
  const sheetGid = sheetMeta.properties.sheetId;

  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: `${tab}!A:A` });
  const rows = res.data.values || [];
  const rowIdx = rows.findIndex(r => r[0] === id);
  if (rowIdx === -1) return false;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID(),
    requestBody: {
      requests: [{ deleteDimension: { range: { sheetId: sheetGid, dimension: "ROWS", startIndex: rowIdx, endIndex: rowIdx + 1 } } }],
    },
  });
  return true;
}

// ── Upsert a situation row for a given client_id ─────────────
// If row exists (matched on col A = client_id), update cols B-D.
// If not, append a new row.
async function upsertSituation(clientId, updatedAt, messageCount, brainJson) {
  const sheets = getSheets();
  await ensureSetup();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: "SITUATIONS!A:A" });
  const rows = res.data.values || [];
  const rowIdx = rows.findIndex(r => r[0] === clientId);
  const payload = [clientId, updatedAt, String(messageCount), brainJson];

  if (rowIdx === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID(), range: "SITUATIONS!A:D",
      valueInputOption: "RAW", insertDataOption: "INSERT_ROWS",
      requestBody: { values: [payload] },
    });
  } else {
    // rowIdx is 0-indexed including header; sheet rows are 1-indexed
    const sheetRow = rowIdx + 1;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID(), range: `SITUATIONS!A${sheetRow}:D${sheetRow}`,
      valueInputOption: "RAW",
      requestBody: { values: [payload] },
    });
  }
  return true;
}

module.exports = { readAll, appendRow, updateRow, deleteRow, ensureSetup, SHEET_ID, upsertSituation };
