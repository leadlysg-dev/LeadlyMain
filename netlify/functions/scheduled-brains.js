// Scheduled function — regenerates the brain for every client once a day.
// Skips any client whose brain was already regenerated within the last 20 hours
// (so a manual regen earlier doesn't cause a wasteful duplicate).
//
// Scheduled via netlify.toml — see the [[scheduled.functions]] entry.

const { google } = require("googleapis");
const { _internal } = require("./regenerate-brain");
const { regenerateForClient } = _internal;

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

const STALE_HOURS = 20;

exports.handler = async () => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn("scheduled-brains: no ANTHROPIC_API_KEY, skipping");
      return { statusCode: 200, body: JSON.stringify({ skipped: "no api key" }) };
    }

    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const sheetId = process.env.LEADLY_SHEET_ID;

    // Load clients + existing situations
    const [clientsRes, sitsRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: "CLIENTS!A:C" }),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: "SITUATIONS!A:D" }),
    ]);

    const clientRows = clientsRes.data.values || [];
    const sitRows = sitsRes.data.values || [];

    const clientIds = clientRows.slice(1).filter(r => r.length > 0).map(r => r[0]);
    const lastUpdated = {};
    for (const r of sitRows.slice(1)) {
      if (r && r[0]) lastUpdated[r[0]] = r[1] || "";
    }

    const cutoff = Date.now() - STALE_HOURS * 60 * 60 * 1000;
    const results = { regenerated: [], skipped: [], errored: [] };

    for (const clientId of clientIds) {
      const last = lastUpdated[clientId];
      if (last) {
        const lastMs = new Date(last).getTime();
        if (!isNaN(lastMs) && lastMs > cutoff) {
          results.skipped.push({ clientId, last });
          continue;
        }
      }
      try {
        const out = await regenerateForClient(clientId, { sheets, sheetId, apiKey });
        results.regenerated.push({ clientId, messageCount: out.messageCount });
      } catch (err) {
        console.error(`scheduled-brains failed for ${clientId}:`, err.message);
        results.errored.push({ clientId, error: err.message });
      }
    }

    console.log("scheduled-brains done:", JSON.stringify(results));
    return { statusCode: 200, body: JSON.stringify({ ok: true, results }) };
  } catch (err) {
    console.error("scheduled-brains fatal:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
