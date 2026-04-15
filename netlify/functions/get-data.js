const { readAll, readServices, readInvoices } = require("./utils/sheets");

exports.handler = async () => {
  try {
    const [clients, services, invoices] = await Promise.all([
      readAll(),
      readServices(),
      readInvoices(),
    ]);
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clients, services, invoices }) };
  } catch (err) {
    console.error("get-data error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
