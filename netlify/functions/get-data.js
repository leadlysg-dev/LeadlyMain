const { readAll } = require("./utils/sheets");

exports.handler = async () => {
  try {
    const { clients, messages } = await readAll();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clients, messages }),
    };
  } catch (err) {
    console.error("get-data error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
