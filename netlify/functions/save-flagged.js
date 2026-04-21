const { appendRow, updateRow, deleteRow } = require("./utils/sheets");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "POST only" };

  try {
    const { action, item } = JSON.parse(event.body);

    if (action === "add") {
      // New flagged message (from webhook or fathom)
      await appendRow("FLAGGED", [
        item.id, item.client_id, item.contact || "",
        item.message || "", item.summary || "", item.reason || "",
        item.timestamp || new Date().toISOString(), item.status || "pending",
      ]);
      return { statusCode: 200, body: JSON.stringify({ ok: true, action: "added" }) };
    }

    if (action === "confirm" || action === "dismiss") {
      await updateRow("FLAGGED", item.id, 7, action === "confirm" ? "confirmed" : "dismissed");
      return { statusCode: 200, body: JSON.stringify({ ok: true, action }) };
    }

    if (action === "revive") {
      await updateRow("FLAGGED", item.id, 7, "pending");
      return { statusCode: 200, body: JSON.stringify({ ok: true, action: "revived" }) };
    }

    if (action === "delete") {
      await deleteRow("FLAGGED", item.id);
      return { statusCode: 200, body: JSON.stringify({ ok: true, action: "deleted" }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: "Unknown action" }) };
  } catch (err) {
    console.error("save-flagged error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
