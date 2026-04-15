import { useState, useEffect, useCallback } from "react";

const API = "/.netlify/functions";
const todayStr = () => new Date().toISOString().split("T")[0];
const uid = () => Math.random().toString(36).slice(2, 10);
const fmtMoney = (n) => `$${Number(n).toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => new Date(d).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
const invNum = (date, seq) => {
  const dt = new Date(date);
  const yy = String(dt.getFullYear()).slice(2);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `INV${yy}${mm}${String(seq).padStart(3, "0")}`;
};

const api = async (fn, body) => {
  const r = await fetch(`${API}/${fn}`, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {});
  return r.json();
};

const Icon = ({ d, size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const I = {
  plus: "M12 5v14M5 12h14", check: "M20 6L9 17l-5-5",
  trash: "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",
  chat: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  video: "M23 7l-7 5 7 5V7zM1 5h15v14H1z",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7",
  x: "M18 6L6 18M6 6l12 12",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8",
  user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  clipboard: "M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M9 2h6v4H9z",
  refresh: "M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15",
  file: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6",
  dollar: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
};

const s = {
  bg: "#0a0e17", sf: "#111827", bd: "#1e293b", bl: "#2a3a52",
  ac: "#22d3ee", ad: "rgba(34,211,238,0.12)",
  gn: "#34d399", gd: "rgba(52,211,153,0.12)",
  am: "#fbbf24", amd: "rgba(251,191,36,0.12)",
  rs: "#f43f5e", rd: "rgba(244,63,94,0.12)",
  pr: "#a78bfa", pd: "rgba(167,139,250,0.12)",
  or: "#f97316", od: "rgba(249,115,22,0.12)",
  tx: "#e2e8f0", tm: "#94a3b8", td: "#64748b",
  f: "'DM Sans','Segoe UI',sans-serif",
};

const card = { background: s.sf, border: `1px solid ${s.bd}`, borderRadius: 12, padding: 20, marginBottom: 16 };
const inp = { background: s.bg, border: `1px solid ${s.bd}`, borderRadius: 8, padding: "9px 14px", color: s.tx, fontSize: 13, fontFamily: s.f, outline: "none", width: "100%", boxSizing: "border-box" };
const btn = { background: s.ac, color: s.bg, border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: s.f };
const ghost = { background: "transparent", color: s.tm, border: `1px solid ${s.bd}`, borderRadius: 8, padding: "9px 18px", fontSize: 13, cursor: "pointer", fontFamily: s.f };

const srcMap = {
  whatsapp: { l: "WhatsApp", bg: "#25D36610", c: "#25D366", i: I.chat },
  zoom: { l: "Zoom", bg: "#2D8CFF10", c: "#2D8CFF", i: I.video },
  ghl: { l: "GHL", bg: s.pd, c: s.pr, i: I.zap },
  manual: { l: "Manual", bg: s.ad, c: s.ac, i: I.edit },
};
const Badge = ({ source }) => { const x = srcMap[source] || srcMap.manual; return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, padding: "2px 8px", borderRadius: 6, background: x.bg, color: x.c, fontWeight: 500 }}><Icon d={x.i} size={11} color={x.c} />{x.l}</span>; };

const CATEGORIES = ["Ads", "CRM", "Automation", "Tracking", "Reporting", "Creative", "Web", "Other"];
const CAT_COLORS = { Ads: "#f97316", CRM: "#3b82f6", Automation: "#a855f7", Tracking: "#22c55e", Reporting: "#eab308", Creative: "#ec4899", Web: "#06b6d4", Other: "#94a3b8" };

const COMPANY = { name: "ELEPHANT & OSTRICH LLP", uen: "T24LL0768A", bank: "072-119162-8", bankName: "DBS Bank", email: "hello@leadly.sg", phone: "+65 8087 7015" };

// ── PDF Generation ──────────────────────────────────────────
function printInvoice(inv) {
  const total = inv.line_items.reduce((sum, li) => sum + Number(li.amount), 0);
  const gst = total * 0.09;
  const grand = total + gst;
  const rows = inv.line_items.map((li, i) => `<tr><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">${i+1}</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">${li.description}</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right">${fmtMoney(li.amount)}</td></tr>`).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${inv.invoice_no}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'DM Sans',sans-serif;color:#111;background:#fff;padding:48px 56px;max-width:800px;margin:0 auto}.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:24px;border-bottom:2px solid #111}.logo{font-size:22px;font-weight:700;letter-spacing:-.5px}.logo-s{font-size:11px;color:#666;margin-top:4px}.badge{background:#111;color:#fff;padding:6px 16px;border-radius:6px;font-size:12px;font-weight:600;letter-spacing:.5px}.mg{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:36px}.mb h4{font-size:10px;text-transform:uppercase;letter-spacing:1.2px;color:#888;margin-bottom:8px;font-weight:600}.mb p{font-size:13px;line-height:1.7;color:#333}.mb strong{color:#111}table{width:100%;border-collapse:collapse;margin-bottom:24px}thead th{background:#f8f8f8;padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#666;font-weight:600;border-bottom:2px solid #e5e7eb}thead th:last-child{text-align:right}.tots{display:flex;justify-content:flex-end;margin-bottom:40px}.tb{width:260px}.tr{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#555}.tr.g{border-top:2px solid #111;padding-top:10px;margin-top:6px;font-weight:700;color:#111;font-size:15px}.ft{border-top:1px solid #e5e7eb;padding-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:32px}.ft h4{font-size:10px;text-transform:uppercase;letter-spacing:1.2px;color:#888;margin-bottom:8px;font-weight:600}.ft p{font-size:12px;line-height:1.7;color:#555}.tc{margin-top:32px;padding-top:20px;border-top:1px solid #eee}.tc h4{font-size:10px;text-transform:uppercase;letter-spacing:1.2px;color:#888;margin-bottom:8px;font-weight:600}.tc p{font-size:11px;color:#999;line-height:1.6}@media print{body{padding:32px 40px}@page{margin:.5in}}</style></head><body>
<div class="hdr"><div><div class="logo">${COMPANY.name}</div><div class="logo-s">UEN: ${COMPANY.uen}</div></div><div class="badge">INVOICE</div></div>
<div class="mg"><div class="mb"><h4>Bill To</h4><p><strong>${inv.billing_name}</strong><br>${inv.address || "Singapore"}</p></div><div class="mb" style="text-align:right"><h4>Invoice Details</h4><p><strong>${inv.invoice_no}</strong><br>Date: ${fmtDate(inv.date)}<br>Due: ${fmtDate(inv.due_date)}<br>Period: ${inv.period}</p></div></div>
<table><thead><tr><th style="width:40px">#</th><th>Description</th><th style="text-align:right;width:120px">Amount (SGD)</th></tr></thead><tbody>${rows}</tbody></table>
<div class="tots"><div class="tb"><div class="tr"><span>Subtotal</span><span>${fmtMoney(total)}</span></div><div class="tr"><span>GST (9%)</span><span>${fmtMoney(gst)}</span></div><div class="tr g"><span>Total</span><span>${fmtMoney(grand)}</span></div></div></div>
<div class="ft"><div><h4>Payment Details</h4><p><strong>${COMPANY.bankName}</strong><br>Account: ${COMPANY.bank}<br>PayNow UEN: ${COMPANY.uen}</p></div><div style="text-align:right"><h4>Contact</h4><p>${COMPANY.email}<br>${COMPANY.phone}</p></div></div>
<div class="tc"><h4>Terms & Conditions</h4><p>Payment is due within 14 days of invoice date. Late payments may incur a 1.5% monthly interest charge. All fees are non-refundable once services have been rendered for the billing period.</p></div>
</body></html>`;
  const w = window.open("", "_blank", "width=800,height=1100");
  w.document.write(html); w.document.close();
  setTimeout(() => w.print(), 400);
}

// ═══════════════════════════════════════════════════════════════
// ═══ MAIN APP ═════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [todo, setTodo] = useState("");
  const [src, setSrc] = useState("manual");
  const [isWeekly, setIsWeekly] = useState(false);
  const [showFathom, setShowFathom] = useState(false);
  const [fathomText, setFathomText] = useState("");
  const [fathomBusy, setFathomBusy] = useState(false);
  const [fathomRes, setFathomRes] = useState(null);
  const [fathomClientId, setFathomClientId] = useState(null);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api("get-data");
      if (data.clients) {
        setClients(data.clients);
        if (!activeId && data.clients.length > 0) setActiveId(data.clients[0].id);
      }
      if (data.services) setServices(data.services);
      if (data.invoices) setInvoices(data.invoices);
    } catch (e) { console.error("Load failed:", e); }
    setLoading(false);
  }, [activeId]);

  useEffect(() => { load(); }, []);

  const cl = clients.find(x => x.id === activeId);

  // ── Todo CRUD ──
  const addTodo = async () => {
    if (!todo.trim() || !cl) return;
    const t = { id: Date.now().toString(36), client_id: cl.id, text: todo.trim(), source: src, date: todayStr(), recurring: isWeekly };
    setSaving(true); await api("save-todo", { action: "add", todo: t }); setTodo(""); setIsWeekly(false); await load(); setSaving(false);
  };
  const toggleTodo = async (id, done) => { setSaving(true); await api("save-todo", { action: "toggle", todo: { id, done: !done } }); await load(); setSaving(false); };
  const delTodo = async (id) => { setSaving(true); await api("save-todo", { action: "delete", todo: { id } }); await load(); setSaving(false); };
  const confirmFlag = async (id, text) => {
    if (!cl) return; setSaving(true); await api("save-flagged", { action: "confirm", item: { id } });
    if (text) await api("save-todo", { action: "add", todo: { id: Date.now().toString(36), client_id: cl.id, text, source: "whatsapp", date: todayStr() } });
    await load(); setSaving(false);
  };
  const dismissFlag = async (id) => { setSaving(true); await api("save-flagged", { action: "dismiss", item: { id } }); await load(); setSaving(false); };
  const processFathom = async () => {
    const fc = clients.find(x => x.id === fathomClientId);
    if (!fathomText.trim() || !fc) return; setFathomBusy(true); setFathomRes(null);
    const res = await api("process-fathom", { transcript: fathomText, clientId: fc.id, clientName: fc.name, contacts: (fc.contacts || []).map(x => x.name).join(", ") });
    setFathomRes(res); setFathomBusy(false);
  };
  const applyFathom = async () => { setShowFathom(false); setFathomText(""); setFathomRes(null); await load(); };

  // ── Service CRUD ──
  const addService = async (svc) => { setSaving(true); await api("save-service", { action: "add", service: { id: uid(), ...svc } }); await load(); setSaving(false); };
  const updateService = async (svc) => { setSaving(true); await api("save-service", { action: "update", service: svc }); await load(); setSaving(false); };
  const deleteService = async (id) => { setSaving(true); await api("save-service", { action: "delete", service: { id } }); await load(); setSaving(false); };
  const updateClientServices = async (client) => { setSaving(true); await api("save-service", { action: "update-client", client }); await load(); setSaving(false); };

  // ── Invoice CRUD ──
  const addInvoice = async (inv) => { setSaving(true); await api("save-invoice", { action: "add", invoice: inv }); await load(); setSaving(false); };
  const deleteInvoice = async (id) => { setSaving(true); await api("save-invoice", { action: "delete", invoice: { id } }); await load(); setSaving(false); };

  if (loading) return (
    <div style={{ background: s.bg, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: s.f, color: s.ac }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1 }}>leadly</div>
        <div style={{ color: s.td, fontSize: 13, marginTop: 8 }}>Loading from Sheets…</div>
      </div>
    </div>
  );

  const pending = (cl?.flagged || []).filter(x => x.status === "pending").length;
  const open = (cl?.todos || []).filter(x => !x.done).length;
  const isSpecial = ["dashboard", "services", "invoices"].includes(activeId);

  return (
    <div style={{ fontFamily: s.f, background: s.bg, color: s.tx, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: `1px solid ${s.bd}`, background: s.sf }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: s.ac, letterSpacing: -1.2 }}>leadly</span>
          <span style={{ fontSize: 11, color: s.td, background: s.ad, padding: "2px 8px", borderRadius: 6 }}>v2</span>
          {saving && <span style={{ fontSize: 11, color: s.am }}>saving…</span>}
        </div>
        <button onClick={() => { setLoading(true); load(); }} style={{ ...ghost, fontSize: 12, padding: "4px 12px", display: "flex", alignItems: "center", gap: 5 }}>
          <Icon d={I.refresh} size={13} color={s.tm} /> Refresh
        </button>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ── SIDEBAR ── */}
        <aside style={{ width: 220, minWidth: 220, borderRight: `1px solid ${s.bd}`, background: s.sf, padding: "16px 0", overflowY: "auto" }}>
          <div style={{ padding: "0 16px" }}>
            {/* Dashboard */}
            <SideBtn active={activeId === "dashboard"} onClick={() => setActiveId("dashboard")} icon="⊞" label="Dashboard"
              badge={(() => { const t = clients.reduce((n, c) => n + (c.todos || []).filter(t => !t.done).length, 0); return t > 0 ? t : null; })()} badgeColor={s.ac} />

            {/* Services */}
            <SideBtn active={activeId === "services"} onClick={() => setActiveId("services")} icon={<Icon d={I.layers} size={14} color={activeId === "services" ? s.or : s.td} />} label="Services" />

            {/* Invoices */}
            <SideBtn active={activeId === "invoices"} onClick={() => setActiveId("invoices")} icon={<Icon d={I.file} size={14} color={activeId === "invoices" ? s.gn : s.td} />} label="Invoices"
              badge={invoices.length > 0 ? invoices.length : null} badgeColor={s.gn} />

            {/* Separator */}
            <div style={{ height: 1, background: s.bd, margin: "12px 0" }} />
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: s.td, marginBottom: 12 }}>Clients</div>

            {clients.map(x => {
              const active = activeId === x.id;
              const pf = (x.flagged || []).filter(m => m.status === "pending").length;
              return (
                <button key={x.id} onClick={() => setActiveId(x.id)} style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: 8, border: "none", background: active ? s.ad : "transparent", color: active ? s.ac : s.tm, fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer", fontFamily: s.f, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: active ? s.ac : s.td, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{x.name}</span>
                  {pf > 0 && <span style={{ fontSize: 10, background: s.am, color: s.bg, padding: "1px 6px", borderRadius: 8, fontWeight: 700 }}>{pf}</span>}
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {activeId === "services" ? (
            <ServicesView services={services} clients={clients} addService={addService} updateService={updateService} deleteService={deleteService} updateClientServices={updateClientServices} setModal={setModal} />
          ) : activeId === "invoices" ? (
            <InvoicesView invoices={invoices} clients={clients} services={services} addInvoice={addInvoice} deleteInvoice={deleteInvoice} setModal={setModal} />
          ) : activeId === "dashboard" ? (
            <DashboardView clients={clients} toggleTodo={toggleTodo} confirmFlag={confirmFlag} dismissFlag={dismissFlag} setActiveId={setActiveId} />
          ) : !cl ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, color: s.td }}>
              <Icon d={I.users} size={48} color={s.td} />
              <div style={{ fontSize: 18, fontWeight: 600 }}>No clients found</div>
              <div style={{ fontSize: 13 }}>Hit the seed endpoint first: <code style={{ color: s.ac }}>/.netlify/functions/seed</code></div>
            </div>
          ) : (
            <ClientView cl={cl} open={open} pending={pending} todo={todo} setTodo={setTodo} src={src} setSrc={setSrc} isWeekly={isWeekly} setIsWeekly={setIsWeekly} addTodo={addTodo} toggleTodo={toggleTodo} delTodo={delTodo} confirmFlag={confirmFlag} dismissFlag={dismissFlag} setShowFathom={setShowFathom} setFathomRes={setFathomRes} setFathomText={setFathomText} setFathomClientId={setFathomClientId} load={load} setSaving={setSaving} />
          )}
        </main>
      </div>

      {/* ── Fathom Modal ── */}
      {showFathom && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div style={{ background: s.sf, borderRadius: 16, border: `1px solid ${s.bd}`, padding: 28, maxWidth: 600, width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}><Icon d={I.video} size={20} color={s.ac} /> Upload Meeting Notes</h3>
              <button onClick={() => { setShowFathom(false); setFathomRes(null); }} style={{ background: "transparent", border: "none", cursor: "pointer" }}><Icon d={I.x} size={20} color={s.tm} /></button>
            </div>
            <div style={{ fontSize: 13, color: s.tm, marginBottom: 12 }}>Select client and paste transcript.</div>
            {!fathomRes ? (
              <>
                <select value={fathomClientId || ""} onChange={e => setFathomClientId(e.target.value)} style={{ ...inp, marginBottom: 12, cursor: "pointer" }}>
                  {clients.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
                <textarea value={fathomText} onChange={e => setFathomText(e.target.value)} placeholder="Paste transcript here…" style={{ ...inp, minHeight: 200, resize: "vertical", lineHeight: 1.6 }} />
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button onClick={() => setShowFathom(false)} style={{ ...ghost, flex: 1 }}>Cancel</button>
                  <button onClick={processFathom} disabled={fathomBusy || !fathomText.trim()} style={{ ...btn, flex: 1, opacity: fathomBusy || !fathomText.trim() ? 0.5 : 1 }}>
                    {fathomBusy ? "Claude is reading…" : "Extract Todos"}
                  </button>
                </div>
              </>
            ) : fathomRes.error ? (
              <div>
                <div style={{ background: s.rd, borderRadius: 10, padding: 16, color: s.rs, fontSize: 13, marginBottom: 16 }}>Error: {fathomRes.error}</div>
                <button onClick={() => setFathomRes(null)} style={{ ...ghost, width: "100%" }}>Try Again</button>
              </div>
            ) : (
              <div>
                {fathomRes.summary && <div style={{ background: s.bg, borderRadius: 10, padding: 14, marginBottom: 16, border: `1px solid ${s.bd}` }}><div style={{ fontSize: 11, color: s.td, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Summary</div><div style={{ fontSize: 13, lineHeight: 1.6 }}>{fathomRes.summary}</div></div>}
                {(fathomRes.todos || []).length > 0 && <div style={{ marginBottom: 16 }}><div style={{ fontSize: 12, fontWeight: 600, color: s.gn, marginBottom: 8 }}>{fathomRes.todos.length} todo{fathomRes.todos.length !== 1 ? "s" : ""} added</div>
                  {fathomRes.todos.map((t, i) => <div key={i} style={{ padding: "8px 12px", borderRadius: 8, background: s.bg, border: `1px solid ${s.bd}`, marginBottom: 6, fontSize: 13, display: "flex", gap: 8 }}><span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: t.urgency === "high" ? s.rd : t.urgency === "low" ? s.gd : s.amd, color: t.urgency === "high" ? s.rs : t.urgency === "low" ? s.gn : s.am, fontWeight: 600, flexShrink: 0 }}>{t.urgency}</span><span>{t.text}</span></div>)}
                </div>}
                {(fathomRes.flagged || []).length > 0 && <div style={{ marginBottom: 16 }}><div style={{ fontSize: 12, fontWeight: 600, color: s.am, marginBottom: 8 }}>{fathomRes.flagged.length} flagged</div>
                  {fathomRes.flagged.map((f, i) => <div key={i} style={{ padding: "8px 12px", borderRadius: 8, background: s.bg, border: `1px solid ${s.am}30`, marginBottom: 6, fontSize: 13, borderLeft: `3px solid ${s.am}` }}><div>"{f.message}"</div><div style={{ fontSize: 11, color: s.am, marginTop: 4 }}>⚠ {f.reason}</div></div>)}
                </div>}
                <button onClick={applyFathom} style={{ ...btn, width: "100%" }}>Done — refresh dashboard</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Generic Modal ── */}
      {modal && <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: s.sf, border: `1px solid ${s.bd}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 560, maxHeight: "85vh", overflow: "auto" }}>
          {modal}
        </div>
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ═══ SIDEBAR BUTTON ═══════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
function SideBtn({ active, onClick, icon, label, badge, badgeColor }) {
  return (
    <button onClick={onClick} style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: 8, border: "none", background: active ? s.ad : "transparent", color: active ? s.ac : s.tm, fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer", fontFamily: s.f, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 14, display: "flex", alignItems: "center" }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && <span style={{ fontSize: 10, background: badgeColor || s.ac, color: s.bg, padding: "1px 6px", borderRadius: 8, fontWeight: 700 }}>{badge}</span>}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// ═══ SERVICES VIEW ════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
function ServicesView({ services, clients, addService, updateService, deleteService, updateClientServices, setModal }) {
  const grouped = CATEGORIES.map(cat => ({ cat, items: services.filter(svc => svc.category === cat) })).filter(g => g.items.length > 0);

  const openAddService = () => setModal(
    <ServiceForm onSave={(svc) => { addService(svc); setModal(null); }} onCancel={() => setModal(null)} />
  );
  const openEditService = (svc) => setModal(
    <ServiceForm initial={svc} onSave={(u) => { updateService({ ...svc, ...u }); setModal(null); }} onDelete={() => { deleteService(svc.id); setModal(null); }} onCancel={() => setModal(null)} />
  );
  const openEditClient = (client) => setModal(
    <ClientServicesForm client={client} allServices={services} onSave={(u) => { updateClientServices({ id: client.id, ...u }); setModal(null); }} onCancel={() => setModal(null)} />
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div><h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>Services</h2><div style={{ fontSize: 12, color: s.td, marginTop: 4 }}>{services.length} services across {grouped.length} categories</div></div>
        <button onClick={openAddService} style={{ ...btn, background: s.or }}>+ Add Service</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(195px, 1fr))", gap: 10, marginBottom: 32 }}>
        {grouped.flatMap(g => g.items.map(svc => (
          <div key={svc.id} onClick={() => openEditService(svc)} style={{ ...card, padding: "14px 16px", marginBottom: 0, cursor: "pointer", transition: "border-color .15s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = s.bl} onMouseLeave={e => e.currentTarget.style.borderColor = s.bd}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: CAT_COLORS[svc.category] || "#666" }} />
              <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: CAT_COLORS[svc.category] || "#666", fontWeight: 600 }}>{svc.category}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{svc.name}</div>
            <div style={{ fontSize: 11, color: s.td, marginTop: 4 }}>{clients.filter(c => (c.services || []).includes(svc.id)).length} clients</div>
          </div>
        )))}
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 14, letterSpacing: -0.3 }}>Client Service Map</h3>
      <div style={{ display: "grid", gap: 10 }}>
        {clients.map(client => {
          const cSvcs = services.filter(svc => (client.services || []).includes(svc.id));
          return (
            <div key={client.id} onClick={() => openEditClient(client)} style={{ ...card, padding: "16px 18px", marginBottom: 0, cursor: "pointer", transition: "border-color .15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = s.bl} onMouseLeave={e => e.currentTarget.style.borderColor = s.bd}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div><span style={{ fontSize: 15, fontWeight: 600 }}>{client.name}</span><span style={{ fontSize: 12, color: s.td, marginLeft: 10 }}>{client.billing_name || client.name}</span></div>
                <span style={{ fontSize: 17, fontWeight: 600, color: s.or }}>{fmtMoney(client.monthly || 0)}<span style={{ fontSize: 11, color: s.td, fontWeight: 400 }}>/mo</span></span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {cSvcs.map(svc => <span key={svc.id} style={{ padding: "3px 9px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: `${CAT_COLORS[svc.category]}15`, color: CAT_COLORS[svc.category], border: `1px solid ${CAT_COLORS[svc.category]}25` }}>{svc.name}</span>)}
                {cSvcs.length === 0 && <span style={{ fontSize: 11, color: s.td }}>No services assigned</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ═══ INVOICES VIEW ════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
function InvoicesView({ invoices, clients, services, addInvoice, deleteInvoice, setModal }) {
  const openCreateInvoice = () => setModal(
    <InvoiceForm clients={clients} services={services} seq={invoices.length + 1} onSave={(inv) => { addInvoice(inv); setModal(null); }} onCancel={() => setModal(null)} />
  );

  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.line_items || []).reduce((s2, li) => s2 + Number(li.amount), 0), 0);
  const monthlyRetainer = clients.reduce((sum, c) => sum + (c.monthly || 0), 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div><h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>Invoices</h2><div style={{ fontSize: 12, color: s.td, marginTop: 4 }}>{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</div></div>
        <button onClick={openCreateInvoice} style={{ ...btn, background: s.gn }}>+ New Invoice</button>
      </div>
      {/* Stats */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {[{ l: "Invoiced Total", v: fmtMoney(totalRevenue), sub: `${invoices.length} invoices` }, { l: "Monthly Retainer", v: fmtMoney(monthlyRetainer), sub: `${clients.length} clients` }].map((stat, i) => (
          <div key={i} style={{ ...card, flex: "1 1 200px", padding: "14px 18px", marginBottom: 0 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: s.td, fontWeight: 600, marginBottom: 4 }}>{stat.l}</div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5 }}>{stat.v}</div>
            <div style={{ fontSize: 11, color: s.td, marginTop: 2 }}>{stat.sub}</div>
          </div>
        ))}
      </div>
      {/* List */}
      {invoices.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 0", color: s.td }}><div style={{ fontSize: 36, marginBottom: 8 }}>🧾</div><div style={{ fontSize: 14, fontWeight: 500 }}>No invoices yet</div></div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {invoices.map(inv => {
            const total = (inv.line_items || []).reduce((sum, li) => sum + Number(li.amount), 0);
            const totalGST = total * 1.09;
            return (
              <div key={inv.id} style={{ ...card, padding: "14px 18px", marginBottom: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: s.gd, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon d={I.file} size={16} color={s.gn} /></div>
                  <div><div style={{ fontSize: 14, fontWeight: 600 }}>{inv.invoice_no}</div><div style={{ fontSize: 12, color: s.td }}>{inv.client_name} · {fmtDate(inv.date)} · {inv.period}</div></div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ textAlign: "right" }}><div style={{ fontSize: 15, fontWeight: 600, color: s.gn }}>{fmtMoney(totalGST)}</div><div style={{ fontSize: 10, color: s.td }}>incl. GST</div></div>
                  <button onClick={() => printInvoice(inv)} style={{ ...ghost, fontSize: 11, padding: "5px 12px", color: s.gn, borderColor: s.gn + "40" }}>PDF</button>
                  <button onClick={() => deleteInvoice(inv.id)} style={{ ...ghost, fontSize: 11, padding: "5px 8px", color: s.rs, borderColor: s.rd }}>×</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ═══ DASHBOARD VIEW ═══════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
function DashboardView({ clients, toggleTodo, confirmFlag, dismissFlag, setActiveId }) {
  const allTodos = clients.flatMap(c => (c.todos || []).filter(t => !t.done).map(t => ({ ...t, clientName: c.name, clientId: c.id })));
  const allFlagged = clients.flatMap(c => (c.flagged || []).filter(f => f.status === "pending").map(f => ({ ...f, clientName: c.name })));
  return (
    <>
      <div style={{ marginBottom: 20 }}><h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>Dashboard</h2>
        <div style={{ fontSize: 12, color: s.td, marginTop: 4 }}>{allTodos.length} open across {clients.length} clients{allFlagged.length > 0 && <span style={{ color: s.am }}> · {allFlagged.length} flagged</span>}</div></div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {clients.map(c => { const cO = (c.todos || []).filter(t => !t.done).length; const cF = (c.flagged || []).filter(f => f.status === "pending").length;
          return <button key={c.id} onClick={() => setActiveId(c.id)} style={{ ...card, padding: "12px 16px", marginBottom: 0, flex: "1 1 140px", cursor: "pointer", minWidth: 140 }}><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{c.name}</div><div style={{ fontSize: 11, color: s.td }}>{cO} open{cF > 0 && <span style={{ color: s.am }}> · {cF} flagged</span>}</div></button>;
        })}
      </div>
      {allFlagged.length > 0 && <div style={{ ...card, borderColor: s.am + "40", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><Icon d={I.zap} size={14} color={s.am} /><span style={{ fontSize: 14, fontWeight: 600 }}>Flagged</span><span style={{ fontSize: 11, color: s.bg, background: s.am, padding: "1px 7px", borderRadius: 10, fontWeight: 700 }}>{allFlagged.length}</span></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{allFlagged.map(f => <div key={f.id} style={{ padding: "8px 10px", borderRadius: 8, background: s.bg, border: `1px solid ${s.am}30`, display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4, background: s.ad, color: s.ac, fontWeight: 600, flexShrink: 0 }}>{f.clientName}</span><span style={{ fontSize: 12, color: s.tm, flex: 1 }}>"{(f.message || "").slice(0, 80)}{(f.message || "").length > 80 ? "…" : ""}"</span><span style={{ fontSize: 11, color: s.am }}>{f.contact}</span></div>)}</div>
      </div>}
      <div style={{ ...card, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><Icon d={I.clipboard} size={14} color={s.ac} /><span style={{ fontSize: 14, fontWeight: 600 }}>All Todos</span><span style={{ fontSize: 11, color: s.td, background: s.ad, padding: "1px 7px", borderRadius: 10 }}>{allTodos.length}</span></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{allTodos.map(td => <div key={td.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, background: s.bg, border: `1px solid ${s.bd}` }}>
          <button onClick={() => toggleTodo(td.id, td.done)} style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${s.bl}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }} />
          <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4, background: s.ad, color: s.ac, fontWeight: 600, flexShrink: 0 }}>{td.clientName}</span>
          <span style={{ flex: 1, fontSize: 12 }}>{td.text}</span>
          {(td.recurring === "true" || td.recurring === true) && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: s.pd, color: s.pr, fontWeight: 600 }}>weekly</span>}
          <Badge source={td.source} />
        </div>)}</div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// ═══ CLIENT VIEW ══════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
function ClientView({ cl, open, pending, todo, setTodo, src, setSrc, isWeekly, setIsWeekly, addTodo, toggleTodo, delTodo, confirmFlag, dismissFlag, setShowFathom, setFathomRes, setFathomText, setFathomClientId, load, setSaving }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div><h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>{cl.name}</h2><div style={{ fontSize: 12, color: s.td, marginTop: 4 }}>{open} open{pending > 0 && <span style={{ color: s.am }}> · {pending} flagged</span>}</div></div>
        <button onClick={() => { setShowFathom(true); setFathomRes(null); setFathomText(""); setFathomClientId(cl?.id || null); }} style={{ ...ghost, fontSize: 12, padding: "5px 12px", display: "flex", alignItems: "center", gap: 5 }}><Icon d={I.video} size={14} color={s.tm} /> Upload Meeting</button>
      </div>
      {(cl.contacts || []).length > 0 && <div style={{ ...card, padding: 14 }}><div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}><Icon d={I.user} size={14} color={s.td} /><span style={{ fontSize: 12, fontWeight: 600, color: s.td, textTransform: "uppercase", letterSpacing: 0.5 }}>Contacts</span></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{cl.contacts.map(x => <span key={x.name} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, background: x.role === "Main POC" ? s.ad : s.bg, color: x.role === "Main POC" ? s.ac : s.tm, border: `1px solid ${x.role === "Main POC" ? s.ac + "30" : s.bd}`, fontWeight: x.role === "Main POC" ? 600 : 400 }}>{x.name}{x.role === "Main POC" ? " ★" : ""}</span>)}</div></div>}
      {(cl.flagged || []).length > 0 && <Flagged items={cl.flagged} confirmFlag={confirmFlag} dismissFlag={dismissFlag} />}
      <div style={{ ...card, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><Icon d={I.clipboard} size={14} color={s.ac} /><span style={{ fontSize: 14, fontWeight: 600 }}>Todo</span><span style={{ fontSize: 11, color: s.td, background: s.ad, padding: "1px 7px", borderRadius: 10 }}>{open}</span></div>
        {cl.todos.filter(x => !x.done).length === 0 && <div style={{ color: s.td, fontSize: 12, padding: "8px 0", textAlign: "center" }}>No open todos</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {cl.todos.filter(x => !x.done).map(td => <div key={td.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, background: s.bg, border: `1px solid ${s.bd}` }}>
            <button onClick={() => toggleTodo(td.id, td.done)} style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${s.bl}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }} />
            <span style={{ flex: 1, fontSize: 12 }}>{td.text}</span>
            {(td.recurring === "true" || td.recurring === true) && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: s.pd, color: s.pr, fontWeight: 600 }}>weekly</span>}
            <Badge source={td.source} />
            <button onClick={() => delTodo(td.id)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 3, opacity: 0.35 }}><Icon d={I.trash} size={13} color={s.rs} /></button>
          </div>)}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10, alignItems: "center" }}>
          <input value={todo} onChange={e => setTodo(e.target.value)} onKeyDown={e => e.key === "Enter" && addTodo()} placeholder="Add todo…" style={{ ...inp, flex: 1, fontSize: 12, padding: "7px 12px" }} />
          <button onClick={() => setIsWeekly(!isWeekly)} style={{ ...ghost, fontSize: 11, padding: "5px 10px", background: isWeekly ? s.pd : "transparent", color: isWeekly ? s.pr : s.td, borderColor: isWeekly ? s.pr + "50" : s.bd }}>🔁</button>
          <select value={src} onChange={e => setSrc(e.target.value)} style={{ ...inp, width: "auto", minWidth: 90, cursor: "pointer", fontSize: 12, padding: "7px 10px" }}>
            <option value="manual">Manual</option><option value="whatsapp">WhatsApp</option><option value="zoom">Zoom</option><option value="ghl">GHL</option>
          </select>
          <button onClick={addTodo} style={{ ...btn, fontSize: 12, padding: "7px 14px" }}>Add</button>
        </div>
      </div>
      <Archive
        doneTodos={cl.todos.filter(x => x.done)}
        resolvedFlags={(cl.flagged || []).filter(x => x.status !== "pending")}
        reviveTodo={(id) => toggleTodo(id, true)}
        reviveFlag={async (id) => { setSaving(true); await api("save-flagged", { action: "revive", item: { id } }); await load(); setSaving(false); }}
        deleteTodo={(id) => delTodo(id)}
        deleteFlag={async (id) => { setSaving(true); await api("save-flagged", { action: "delete", item: { id } }); await load(); setSaving(false); }}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// ═══ FORMS ════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
function ServiceForm({ initial, onSave, onDelete, onCancel }) {
  const [name, setName] = useState(initial?.name || "");
  const [category, setCategory] = useState(initial?.category || "Other");
  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>{initial ? "Edit Service" : "Add Service"}</h3>
      <label style={lbl}>Service Name</label>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Meta Ads Management" style={inp} />
      <label style={{ ...lbl, marginTop: 14 }}>Category</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
        {CATEGORIES.map(cat => <button key={cat} onClick={() => setCategory(cat)} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid", cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: s.f, background: category === cat ? `${CAT_COLORS[cat]}20` : "transparent", color: category === cat ? CAT_COLORS[cat] : s.td, borderColor: category === cat ? `${CAT_COLORS[cat]}50` : s.bd }}>{cat}</button>)}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {initial && onDelete && <button onClick={onDelete} style={{ ...btn, background: s.rs, marginRight: "auto" }}>Delete</button>}
        <button onClick={onCancel} style={ghost}>Cancel</button>
        <button onClick={() => name.trim() && onSave({ name: name.trim(), category })} style={{ ...btn, background: s.or }}>Save</button>
      </div>
    </div>
  );
}

function ClientServicesForm({ client, allServices, onSave, onCancel }) {
  const [selected, setSelected] = useState([...(client.services || [])]);
  const [monthly, setMonthly] = useState(client.monthly || 0);
  const [billingName, setBillingName] = useState(client.billing_name || "");
  const toggle = (sid) => setSelected(prev => prev.includes(sid) ? prev.filter(x => x !== sid) : [...prev, sid]);
  const grouped = CATEGORIES.map(cat => ({ cat, items: allServices.filter(svc => svc.category === cat) })).filter(g => g.items.length > 0);
  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{client.name}</h3>
      <p style={{ fontSize: 13, color: s.td, marginBottom: 16 }}>Manage services & billing</p>
      <label style={lbl}>Billing Name</label>
      <input value={billingName} onChange={e => setBillingName(e.target.value)} style={inp} />
      <label style={{ ...lbl, marginTop: 14 }}>Monthly Fee (SGD)</label>
      <input type="number" value={monthly} onChange={e => setMonthly(Number(e.target.value))} style={inp} />
      <label style={{ ...lbl, marginTop: 14 }}>Active Services</label>
      <div style={{ marginBottom: 20 }}>
        {grouped.map(g => <div key={g.cat} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: CAT_COLORS[g.cat], fontWeight: 600, marginBottom: 5 }}>{g.cat}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {g.items.map(svc => <button key={svc.id} onClick={() => toggle(svc.id)} style={{ padding: "5px 11px", borderRadius: 7, border: "1px solid", cursor: "pointer", fontSize: 12, fontFamily: s.f, fontWeight: 500, background: selected.includes(svc.id) ? `${CAT_COLORS[svc.category]}20` : "transparent", color: selected.includes(svc.id) ? CAT_COLORS[svc.category] : s.td, borderColor: selected.includes(svc.id) ? `${CAT_COLORS[svc.category]}50` : s.bd }}>{selected.includes(svc.id) ? "✓ " : ""}{svc.name}</button>)}
          </div>
        </div>)}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={ghost}>Cancel</button>
        <button onClick={() => onSave({ services: selected, monthly, billing_name: billingName })} style={{ ...btn, background: s.or }}>Save</button>
      </div>
    </div>
  );
}

function InvoiceForm({ clients, services, seq, onSave, onCancel }) {
  const [clientId, setClientId] = useState(clients[0]?.id || "");
  const [date, setDate] = useState(todayStr());
  const [period, setPeriod] = useState(() => new Date().toLocaleDateString("en-SG", { month: "long", year: "numeric" }));
  const [lineItems, setLineItems] = useState([]);
  const client = clients.find(c => c.id === clientId);

  const autoFill = (c) => {
    if (!c) return;
    const items = (c.services || []).map(sid => {
      const svc = services.find(sv => sv.id === sid);
      return { id: uid(), description: svc?.name || "Service", amount: 0 };
    });
    const per = (c.monthly || 0) / (items.length || 1);
    items.forEach(li => li.amount = Math.round(per * 100) / 100);
    setLineItems(items);
  };

  useEffect(() => { autoFill(client); }, []);

  const switchClient = (cid) => { setClientId(cid); autoFill(clients.find(c => c.id === cid)); };
  const updateItem = (id, field, val) => setLineItems(prev => prev.map(li => li.id === id ? { ...li, [field]: val } : li));
  const removeItem = (id) => setLineItems(prev => prev.filter(li => li.id !== id));
  const addItem = () => setLineItems(prev => [...prev, { id: uid(), description: "", amount: 0 }]);

  const subtotal = lineItems.reduce((sum, li) => sum + Number(li.amount || 0), 0);
  const gst = subtotal * 0.09;
  const total = subtotal + gst;
  const dueDate = new Date(date); dueDate.setDate(dueDate.getDate() + 14);

  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>New Invoice</h3>
      <label style={lbl}>Client</label>
      <select value={clientId} onChange={e => switchClient(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
        {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.billing_name || c.name}</option>)}
      </select>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <div><label style={lbl}>Invoice Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} /></div>
        <div><label style={lbl}>Billing Period</label><input value={period} onChange={e => setPeriod(e.target.value)} placeholder="e.g. April 2026" style={inp} /></div>
      </div>
      <label style={{ ...lbl, marginTop: 12 }}>Invoice No.</label>
      <div style={{ ...inp, background: "rgba(255,255,255,0.02)", color: s.td }}>{invNum(date, seq)}</div>
      <label style={{ ...lbl, marginTop: 16 }}>Line Items</label>
      <div style={{ marginBottom: 12 }}>
        {lineItems.map(li => <div key={li.id} style={{ display: "grid", gridTemplateColumns: "1fr 90px 28px", gap: 6, marginBottom: 5, alignItems: "center" }}>
          <input value={li.description} onChange={e => updateItem(li.id, "description", e.target.value)} placeholder="Service" style={{ ...inp, marginBottom: 0 }} />
          <input type="number" value={li.amount} onChange={e => updateItem(li.id, "amount", e.target.value)} style={{ ...inp, marginBottom: 0, textAlign: "right" }} />
          <button onClick={() => removeItem(li.id)} style={{ background: "none", border: "none", color: s.rs, cursor: "pointer", fontSize: 15, fontFamily: s.f }}>×</button>
        </div>)}
        <button onClick={addItem} style={{ background: "none", border: `1px dashed ${s.bd}`, borderRadius: 8, padding: "7px 14px", color: s.td, fontSize: 12, cursor: "pointer", fontFamily: s.f, width: "100%" }}>+ Add line item</button>
      </div>
      <div style={{ background: s.bg, borderRadius: 10, padding: "12px 16px", marginBottom: 20, border: `1px solid ${s.bd}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: s.td, marginBottom: 3 }}><span>Subtotal</span><span>{fmtMoney(subtotal)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: s.td, marginBottom: 3 }}><span>GST (9%)</span><span>{fmtMoney(gst)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, color: s.gn, borderTop: `1px solid ${s.bd}`, paddingTop: 8, marginTop: 4 }}><span>Total</span><span>{fmtMoney(total)}</span></div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={ghost}>Cancel</button>
        <button onClick={() => { if (!client) return; onSave({ id: uid(), client_id: client.id, client_name: client.name, billing_name: client.billing_name || client.name, address: client.address || "Singapore", invoice_no: invNum(date, seq), date, due_date: dueDate.toISOString().split("T")[0], period, line_items: lineItems.filter(li => li.description.trim()), status: "draft" }); }} style={{ ...btn, background: s.gn }}>Create Invoice</button>
      </div>
    </div>
  );
}

const lbl = { display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: s.td, fontWeight: 600, marginBottom: 5 };

// ═══════════════════════════════════════════════════════════════
// ═══ EXISTING COMPONENTS (unchanged) ══════════════════════════
// ═══════════════════════════════════════════════════════════════
function Flagged({ items, confirmFlag, dismissFlag }) {
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const pend = items.filter(x => x.status === "pending");
  if (pend.length === 0) return null;
  return (
    <div style={{ ...card, borderColor: s.am + "40", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><Icon d={I.zap} size={14} color={s.am} /><span style={{ fontSize: 14, fontWeight: 600 }}>Flagged</span><span style={{ fontSize: 11, color: s.bg, background: s.am, padding: "1px 7px", borderRadius: 10, fontWeight: 700 }}>{pend.length}</span></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {pend.map(msg => <div key={msg.id} style={{ padding: "10px 12px", borderRadius: 8, background: s.bg, border: `1px solid ${s.am}30` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><span style={{ fontSize: 12, fontWeight: 600 }}>{msg.contact}</span><span style={{ fontSize: 10, color: s.td }}>{msg.timestamp ? new Date(msg.timestamp).toLocaleDateString("en-SG", { day: "numeric", month: "short" }) : ""}</span></div>
          <div style={{ fontSize: 12, color: s.tm, marginBottom: 6, lineHeight: 1.4 }}>"{(msg.message || "").slice(0, 120)}{(msg.message || "").length > 120 ? "…" : ""}"</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {editId === msg.id ? <>
              <input value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { confirmFlag(msg.id, editText); setEditId(null); }}} placeholder="Todo text…" style={{ ...inp, flex: 1, fontSize: 12, padding: "6px 10px", minWidth: 180 }} autoFocus />
              <button onClick={() => { confirmFlag(msg.id, editText); setEditId(null); }} style={{ ...btn, fontSize: 11, padding: "5px 12px" }}>Add</button>
              <button onClick={() => setEditId(null)} style={{ ...ghost, fontSize: 11, padding: "5px 8px" }}>✕</button>
            </> : <>
              <button onClick={() => { setEditId(msg.id); setEditText(msg.summary || ""); }} style={{ ...btn, fontSize: 11, padding: "5px 12px", background: s.gn }}>→ Todo</button>
              <button onClick={() => dismissFlag(msg.id)} style={{ ...ghost, fontSize: 11, padding: "5px 12px", color: s.rs, borderColor: s.rd }}>Dismiss</button>
              <span style={{ fontSize: 11, color: s.am, marginLeft: 4 }}>{msg.reason || msg.summary}</span>
            </>}
          </div>
        </div>)}
      </div>
    </div>
  );
}

function Archive({ doneTodos, resolvedFlags, reviveTodo, reviveFlag, deleteTodo, deleteFlag }) {
  const [expanded, setExpanded] = useState(false);
  const total = doneTodos.length + resolvedFlags.length;
  if (total === 0) return null;
  return (
    <div style={{ ...card, opacity: 0.7, borderStyle: "dashed", padding: 14 }}>
      <button onClick={() => setExpanded(!expanded)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: s.f, display: "flex", alignItems: "center", gap: 8, width: "100%", padding: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: s.td }}>{expanded ? "▾" : "▸"} Archive</span>
        <span style={{ fontSize: 11, color: s.td, background: `${s.td}20`, padding: "1px 7px", borderRadius: 10 }}>{total}</span>
        <span style={{ fontSize: 10, color: s.td, marginLeft: "auto" }}>Clears Sunday</span>
      </button>
      {expanded && <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
        {doneTodos.map(td => <div key={td.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", borderRadius: 6, opacity: 0.6 }}>
          <Icon d={I.check} size={12} color={s.gn} /><span style={{ flex: 1, fontSize: 11, textDecoration: "line-through", color: s.tm }}>{td.text}</span><Badge source={td.source} />
          <button onClick={() => reviveTodo(td.id)} style={{ ...ghost, fontSize: 10, padding: "2px 8px" }}>Revive</button>
          <button onClick={() => deleteTodo(td.id)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2, opacity: 0.5 }}><Icon d={I.trash} size={12} color={s.rs} /></button>
        </div>)}
        {resolvedFlags.map(f => <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", borderRadius: 6, opacity: 0.6 }}>
          <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: f.status === "confirmed" ? s.gd : s.rd, color: f.status === "confirmed" ? s.gn : s.rs, fontWeight: 600 }}>{f.status === "confirmed" ? "added" : "dismissed"}</span>
          <span style={{ flex: 1, fontSize: 11, color: s.tm }}>"{(f.message || "").slice(0, 50)}{(f.message || "").length > 50 ? "…" : ""}"</span>
          <button onClick={() => reviveFlag(f.id)} style={{ ...ghost, fontSize: 10, padding: "2px 8px" }}>Revive</button>
          <button onClick={() => deleteFlag(f.id)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2, opacity: 0.5 }}><Icon d={I.trash} size={12} color={s.rs} /></button>
        </div>)}
      </div>}
    </div>
  );
}
