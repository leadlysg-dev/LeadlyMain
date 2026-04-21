const { ensureSetup, appendRow, readAll } = require("./utils/sheets");

const SEED = [
  { id: "aaro-001", name: "AARO", contacts: [{ name: "Joann", role: "Main POC" }, { name: "Mavis", role: "Alt" }, { name: "Carrin", role: "Alt" }] },
  { id: "aether-001", name: "Aether Athletics", contacts: [{ name: "Dave", role: "Main POC" }] },
  { id: "homeup-001", name: "HomeUp", contacts: [{ name: "Tong Boon", role: "Main POC" }, { name: "Matt", role: "Alt" }, { name: "Deevik", role: "Alt" }, { name: "Marcus", role: "Alt" }] },
  { id: "axis-001", name: "Axis Collective", contacts: [{ name: "Damien", role: "Main POC" }, { name: "Matt", role: "Alt" }, { name: "Joel", role: "Alt" }] },
];

exports.handler = async () => {
  try {
    await ensureSetup();
    const existing = await readAll();
    if (existing.length > 0) {
      return { statusCode: 200, body: JSON.stringify({ message: "Already seeded", clients: existing.length }) };
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
