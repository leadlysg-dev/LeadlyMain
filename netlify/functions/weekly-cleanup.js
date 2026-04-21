const { google } = require("googleapis");

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

async function clearDoneRows(tab, colIndex, matchValue) {
  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  const sid = process.env.LEADLY_SHEET_ID;

  const meta = await sheets.spreadsheets.get({ spreadsheetId: sid });
  const sheetMeta = meta.data.sheets.find(s => s.properties.title === tab);
  if (!sheetMeta) return 0;
  const sheetGid = sheetMeta.properties.sheetId;

  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range: `${tab}!A:Z` });
  const rows = res.data.values || [];
  if (rows.length < 2) return 0;

  // Find rows to delete (bottom-up to keep indices stable)
  const toDelete = [];
  for (let i = rows.length - 1; i >= 1; i--) {
    if ((rows[i][colIndex] || "").toLowerCase() === matchValue.toLowerCase()) {
      toDelete.push(i);
    }
  }

  for (const idx of toDelete) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sid,
      requestBody: {
        requests: [{ deleteDimension: { range: { sheetId: sheetGid, dimension: "ROWS", startIndex: idx, endIndex: idx + 1 } } }],
      },
    });
  }

  return toDelete.length;
}

exports.handler = async () => {
  try {
    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const sid = process.env.LEADLY_SHEET_ID;

    // Read all todos
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range: "TODOS!A:I" });
    const rows = res.data.values || [];
    if (rows.length < 2) return { statusCode: 200, body: JSON.stringify({ ok: true, message: "Nothing to clean" }) };

    const meta = await sheets.spreadsheets.get({ spreadsheetId: sid });
    const todosMeta = meta.data.sheets.find(s => s.properties.title === "TODOS");
    const flaggedMeta = meta.data.sheets.find(s => s.properties.title === "FLAGGED");

    let resetCount = 0;
    let deleteCount = 0;

    // Process todos bottom-up
    for (let i = rows.length - 1; i >= 1; i--) {
      const done = (rows[i][3] || "").toLowerCase() === "true";
      const recurring = (rows[i][8] || "").toLowerCase() === "true";

      if (done && recurring) {
        // Reset recurring todo back to open
        await sheets.spreadsheets.values.update({
          spreadsheetId: sid, range: `TODOS!D${i + 1}`, valueInputOption: "RAW",
          requestBody: { values: [["false"]] },
        });
        resetCount++;
      } else if (done && !recurring) {
        // Delete non-recurring done todo
        if (todosMeta) {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: sid,
            requestBody: { requests: [{ deleteDimension: { range: { sheetId: todosMeta.properties.sheetId, dimension: "ROWS", startIndex: i, endIndex: i + 1 } } }] },
          });
        }
        deleteCount++;
      }
    }

    // Delete resolved flagged items
    let flaggedCount = 0;
    if (flaggedMeta) {
      const fRes = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range: "FLAGGED!A:H" });
      const fRows = fRes.data.values || [];
      for (let i = fRows.length - 1; i >= 1; i--) {
        const status = (fRows[i][7] || "").toLowerCase();
        if (status === "dismissed" || status === "confirmed") {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: sid,
            requestBody: { requests: [{ deleteDimension: { range: { sheetId: flaggedMeta.properties.sheetId, dimension: "ROWS", startIndex: i, endIndex: i + 1 } } }] },
          });
          flaggedCount++;
        }
      }
    }

    const msg = `Reset ${resetCount} weekly todos, deleted ${deleteCount} one-off todos, cleared ${flaggedCount} flags`;
    console.log(msg);
    return { statusCode: 200, body: JSON.stringify({ ok: true, message: msg }) };
  } catch (err) {
    console.error("weekly-cleanup error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
