const { ensureSetup, appendRow, readAll } = require("./utils/sheets");

// Mirrors the CLIENTS memory in ghl-webhook.js.
// Only the canonical contacts show up as chips in the UI.
const SEED = [
  { id: "axis-001",   name: "Axis Collective",   contacts: [
    { name: "Legacy Planners", role: "Company" },
    { name: "Joel",            role: "Main POC" },
    { name: "Damien",          role: "Alt" },
  ]},
  { id: "homeup-001", name: "HomeUp",            contacts: [
    { name: "Tong Boon", role: "Main POC" },
    { name: "Deevak",    role: "Alt" },
  ]},
  { id: "aaro-001",   name: "AARO",              contacts: [
    { name: "Joann",  role: "Main POC" },
    { name: "Mavis",  role: "Alt" },
    { name: "Carrin", role: "Alt" },
  ]},
  { id: "aether-001", name: "Aether Athletics",  contacts: [
    { name: "Dave", role: "Main POC" },
  ]},
];

exports.handler = async () => {
  try {
    await ensureSetup();
    const { clients: existing } = await readAll();
    if (existing.length > 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Already seeded — edit the CLIENTS tab in your sheet if you need to update contacts",
          clients: existing.length,
        }),
      };
    }
    for (const c of SEED) {
      await appendRow("CLIENTS", [c.id, c.name, JSON.stringify(c.contacts)]);
    }
    return { statusCode: 200, body: JSON.stringify({ message: "Seeded " + SEED.length + " clients" }) };
  } catch (err) {
    console.error("seed error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
