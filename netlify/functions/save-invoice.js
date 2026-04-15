const { readInvoices, appendRow, updateRow, deleteRow } = require("./utils/sheets");

exports.handler = async (event) => {
  try {
    const { action, invoice } = JSON.parse(event.body || "{}");

    if (action === "list") {
      const invoices = await readInvoices();
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoices }) };
    }

    if (action === "add" && invoice) {
      // INVOICES columns: id, client_id, client_name, billing_name, invoice_no, date, due_date, period, line_items, status
      await appendRow("INVOICES", [
        invoice.id,
        invoice.client_id,
        invoice.client_name,
        invoice.billing_name,
        invoice.invoice_no,
        invoice.date,
        invoice.due_date,
        invoice.period,
        JSON.stringify(invoice.line_items),
        invoice.status || "draft",
      ]);
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    if (action === "update-status" && invoice) {
      // status is column index 9
      await updateRow("INVOICES", invoice.id, 9, invoice.status);
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    if (action === "delete" && invoice) {
      await deleteRow("INVOICES", invoice.id);
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: "Invalid action" }) };
  } catch (err) {
    console.error("save-invoice error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
