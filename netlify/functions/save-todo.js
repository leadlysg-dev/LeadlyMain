const { appendRow, updateRow, deleteRow } = require("./utils/sheets");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "POST only" };

  try {
    const { action, todo } = JSON.parse(event.body);

    if (action === "add") {
      await appendRow("TODOS", [
        todo.id, todo.client_id, todo.text, "false",
        todo.source || "manual", todo.date || new Date().toISOString().split("T")[0],
        todo.urgency || "medium", todo.category || "general", todo.recurring ? "true" : "false",
      ]);
      return { statusCode: 200, body: JSON.stringify({ ok: true, action: "added" }) };
    }

    if (action === "toggle") {
      // todo: { id, done }
      await updateRow("TODOS", todo.id, 3, String(todo.done));
      return { statusCode: 200, body: JSON.stringify({ ok: true, action: "toggled" }) };
    }

    if (action === "delete") {
      await deleteRow("TODOS", todo.id);
      return { statusCode: 200, body: JSON.stringify({ ok: true, action: "deleted" }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: "Unknown action: " + action }) };
  } catch (err) {
    console.error("save-todo error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
