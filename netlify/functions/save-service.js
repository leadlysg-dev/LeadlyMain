const { readServices, appendRow, updateFullRow, deleteRow, updateRow } = require("./utils/sheets");

exports.handler = async (event) => {
  try {
    const { action, service, client } = JSON.parse(event.body || "{}");

    if (action === "list") {
      const services = await readServices();
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ services }) };
    }

    if (action === "add" && service) {
      // SERVICES columns: id, name, category
      await appendRow("SERVICES", [service.id, service.name, service.category]);
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    if (action === "update" && service) {
      await updateFullRow("SERVICES", service.id, [service.id, service.name, service.category]);
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    if (action === "delete" && service) {
      await deleteRow("SERVICES", service.id);
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    // Update client billing/services info
    // CLIENTS columns: id(0), name(1), contacts(2), billing_name(3), monthly(4), services(5), address(6)
    if (action === "update-client" && client) {
      if (client.billing_name !== undefined) await updateRow("CLIENTS", client.id, 3, client.billing_name);
      if (client.monthly !== undefined) await updateRow("CLIENTS", client.id, 4, String(client.monthly));
      if (client.services !== undefined) await updateRow("CLIENTS", client.id, 5, JSON.stringify(client.services));
      if (client.address !== undefined) await updateRow("CLIENTS", client.id, 6, client.address);
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: "Invalid action" }) };
  } catch (err) {
    console.error("save-service error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
