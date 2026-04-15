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

async function ensureSetup() {
  const sheets = getSheets();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID() });
  const existing = meta.data.sheets.map(s => s.properties.title);

  const tabs = {
    CLIENTS: ["id", "name", "contacts", "billing_name", "monthly", "services", "address"],
    TODOS: ["id", "client_id", "text", "done", "source", "date", "urgency", "category", "recurring"],
    FLAGGED: ["id", "client_id", "contact", "message", "summary", "reason", "timestamp", "status"],
    SERVICES: ["id", "name", "category"],
    INVOICES: ["id", "client_id", "client_name", "billing_name", "invoice_no", "date", "due_date", "period", "line_items", "status"],
    MESSAGES: ["id", "client_id", "client_name", "contact", "message", "group_name", "timestamp", "outcome"],
  };

  for (const [tab, headers] of Object.entries(tabs)) {
    if (!existing.includes(tab)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID(),
        requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID(), range: `${tab}!A1:${String.fromCharCode(64 + headers.length)}1`,
        valueInputOption: "RAW", requestBody: { values: [headers] },
      });
    }
  }
}

function parse(rows) {
  if (!rows || rows.length < 2) return [];
  const h = rows[0];
  return rows.slice(1).filter(r => r.length > 0).map(r => {
    const obj = {};
    h.forEach((key, i) => { obj[key] = r[i] || ""; });
    return obj;
  });
}

async function readAll() {
  const sheets = getSheets();
  await ensureSetup();
  const [clientsRes, todosRes, flaggedRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: "CLIENTS!A:G" }),
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: "TODOS!A:I" }),
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: "FLAGGED!A:H" }),
  ]);
  const clients = parse(clientsRes.data.values);
  const todos = parse(todosRes.data.values);
  const flagged = parse(flaggedRes.data.values);
  return clients.map(c => ({
    id: c.id, name: c.name,
    contacts: c.contacts ? JSON.parse(c.contacts) : [],
    billing_name: c.billing_name || "",
    monthly: c.monthly ? Number(c.monthly) : 0,
    services: c.services ? JSON.parse(c.services) : [],
    address: c.address || "",
    todos: todos.filter(t => t.client_id === c.id).map(t => ({ ...t, done: t.done === "true" })),
    flagged: flagged.filter(f => f.client_id === c.id),
  }));
}

async function readServices() {
  const sheets = getSheets();
  await ensureSetup();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: "SERVICES!A:C" });
  return parse(res.data.values);
}

async function readInvoices() {
  const sheets = getSheets();
  await ensureSetup();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: "INVOICES!A:J" });
  return parse(res.data.values).map(inv => ({
    ...inv,
    line_items: inv.line_items ? JSON.parse(inv.line_items) : [],
  }));
}

async function appendRow(tab, values) {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID(), range: `${tab}!A:Z`,
    valueInputOption: "RAW", insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] },
  });
}

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

async function updateFullRow(tab, id, values) {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: `${tab}!A:A` });
  const rows = res.data.values || [];
  const rowIdx = rows.findIndex(r => r[0] === id);
  if (rowIdx === -1) return false;
  const endCol = String.fromCharCode(64 + values.length);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID(), range: `${tab}!A${rowIdx + 1}:${endCol}${rowIdx + 1}`,
    valueInputOption: "RAW", requestBody: { values: [values] },
  });
  return true;
}

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

module.exports = { readAll, readServices, readInvoices, appendRow, updateRow, updateFullRow, deleteRow, ensureSetup, SHEET_ID };
