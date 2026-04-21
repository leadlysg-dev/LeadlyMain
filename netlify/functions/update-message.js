const { appendRow, updateRow } = require("./utils/sheets");

// Columns in MESSAGES tab (0-indexed):
// 0:id 1:timestamp 2:client_id 3:client_name 4:contact 5:phone
// 6:conversation 7:direction 8:message 9:classification 10:reasoning
// 11:todo_ids 12:flagged_id 13:status

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "POST only" };

  try {
    const { action, id, message } = JSON.parse(event.body);

    if (action === "review") {
      // Mark as reviewed (status column = 13)
      await updateRow("MESSAGES", id, 13, "reviewed");
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    if (action === "reclassify") {
      // message: { classification }
      await updateRow("MESSAGES", id, 9, message.classification);
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    if (action === "promote_to_todo") {
      // message: { client_id, text }
      const todoId = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      const today = new Date().toISOString().split("T")[0];
      await appendRow("TODOS", [
        todoId, message.client_id, message.text, "false",
        "whatsapp", today, "medium", "general", "false",
      ]);
      // Link it back on the message
      await updateRow("MESSAGES", id, 11, todoId);
      await updateRow("MESSAGES", id, 9, "todo");
      await updateRow("MESSAGES", id, 13, "reviewed");
      return { statusCode: 200, body: JSON.stringify({ ok: true, todoId }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: "Unknown action: " + action }) };
  } catch (err) {
    console.error("update-message error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
