const { ensureSetup, appendRow, readAll, readServices } = require("./utils/sheets");

const SEED_CLIENTS = [
  { id: "aaro-001", name: "AARO", contacts: [{ name: "Joann", role: "Main POC" }, { name: "Mavis", role: "Alt" }, { name: "Carrin", role: "Alt" }], billing_name: "Asian Alliance Radiation & Oncology Pte Ltd", monthly: 2000, services: ["s1","s2","s3","s4","s6","s9","s10","s11","s12"], address: "Singapore" },
  { id: "aether-001", name: "Aether Athletics", contacts: [{ name: "Dave", role: "Main POC" }], billing_name: "Aether Athletics Pte Ltd", monthly: 550, services: ["s1","s3","s4","s5","s6"], address: "Singapore" },
  { id: "homeup-001", name: "HomeUp", contacts: [{ name: "Tong Boon", role: "Main POC" }, { name: "Matt", role: "Alt" }, { name: "Deevik", role: "Alt" }, { name: "Marcus", role: "Alt" }], billing_name: "C & H Properties Pte. Ltd.", monthly: 3000, services: ["s13","s1","s8","s7"], address: "Singapore" },
  { id: "axis-001", name: "Axis Collective", contacts: [{ name: "Damien", role: "Main POC" }, { name: "Matt", role: "Alt" }, { name: "Joel", role: "Alt" }], billing_name: "Tan Jun Liong (Axis Collective)", monthly: 1500, services: ["s1","s8","s7"], address: "Singapore" },
];

const SEED_SERVICES = [
  { id: "s1", name: "Meta Ads Management", category: "Ads" },
  { id: "s2", name: "Google Ads Management", category: "Ads" },
  { id: "s3", name: "CRM Lead Management", category: "CRM" },
  { id: "s4", name: "CRM Automations", category: "CRM" },
  { id: "s5", name: "CRM Calendar", category: "CRM" },
  { id: "s6", name: "WhatsApp API", category: "Automation" },
  { id: "s7", name: "WhatsApp AI Chatbot", category: "Automation" },
  { id: "s8", name: "Leadly CRM Lite", category: "CRM" },
  { id: "s9", name: "Tracking — GA4", category: "Tracking" },
  { id: "s10", name: "Tracking — Meta CAPI", category: "Tracking" },
  { id: "s11", name: "Tracking — GTM", category: "Tracking" },
  { id: "s12", name: "Reporting Dashboard", category: "Reporting" },
  { id: "s13", name: "Videography", category: "Creative" },
  { id: "s14", name: "Landing Page (Build & Host)", category: "Web" },
  { id: "s15", name: "SEO", category: "Web" },
];

exports.handler = async () => {
  try {
    await ensureSetup();
    const existing = await readAll();
    const existingServices = await readServices();

    const results = [];

    if (existing.length === 0) {
      for (const c of SEED_CLIENTS) {
        // CLIENTS: id, name, contacts, billing_name, monthly, services, address
        await appendRow("CLIENTS", [c.id, c.name, JSON.stringify(c.contacts), c.billing_name, String(c.monthly), JSON.stringify(c.services), c.address]);
      }
      results.push("Seeded " + SEED_CLIENTS.length + " clients");
    } else {
      results.push("Clients already exist (" + existing.length + ")");
    }

    if (existingServices.length === 0) {
      for (const svc of SEED_SERVICES) {
        await appendRow("SERVICES", [svc.id, svc.name, svc.category]);
      }
      results.push("Seeded " + SEED_SERVICES.length + " services");
    } else {
      results.push("Services already exist (" + existingServices.length + ")");
    }

    return { statusCode: 200, body: JSON.stringify({ message: results.join(". ") }) };
  } catch (err) {
    console.error("seed error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
