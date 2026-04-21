import { useState, useEffect, useCallback, useMemo } from "react";

const API = "/.netlify/functions";
const todayStr = () => new Date().toISOString().split("T")[0];

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
  radio: "M4.93 19.07A10 10 0 010 12M1.42 9a10 10 0 016.16-6.16M12 22a10 10 0 008.93-5.52M19.07 4.93a10 10 0 013.5 7.5M12 12a0 0 000 0",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z",
};

const s = {
  bg: "#0a0e17", sf: "#111827", bd: "#1e293b", bl: "#2a3a52",
  ac: "#22d3ee", ad: "rgba(34,211,238,0.12)",
  gn: "#34d399", gd: "rgba(52,211,153,0.12)",
  am: "#fbbf24", amd: "rgba(251,191,36,0.12)",
  rs: "#f43f5e", rd: "rgba(244,63,94,0.12)",
  pr: "#a78bfa", pd: "rgba(167,139,250,0.12)",
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

// Classification → colour + label
const classMap = {
  todo:         { l: "Todo",       c: s.gn, bg: s.gd, dot: s.gn,  desc: "Clear actionable task" },
  important:    { l: "Important",  c: s.am, bg: s.amd, dot: s.am, desc: "Needs human review" },
  noise:        { l: "Noise",      c: s.td, bg: `${s.td}20`, dot: s.td, desc: "Chitchat, thanks, confirmations" },
  unrouted:     { l: "Unrouted",   c: s.rs, bg: s.rd, dot: s.rs, desc: "Couldn't match to a client" },
  ambiguous:    { l: "Ambiguous",  c: s.rs, bg: s.rd, dot: s.rs, desc: "Multiple possible clients" },
  unclassified: { l: "Unclassified", c: s.tm, bg: `${s.tm}20`, dot: s.tm, desc: "Not yet processed" },
};

const fmtTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  if (hrs < 48) return "yesterday";
  return d.toLocaleDateString("en-SG", { day: "numeric", month: "short" });
};

export default function App() {
  const [clients, setClients] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeId, setActiveId] = useState("feed");
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
  const [lastLoaded, setLastLoaded] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api("get-data");
      if (data.clients) setClients(data.clients);
      if (data.messages) setMessages(data.messages);
      setLastLoaded(new Date());
    } catch (e) { console.error("Load failed:", e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30 seconds for live feed
  useEffect(() => {
    const t = setInterval(() => { load(); }, 30000);
    return () => clearInterval(t);
  }, [load]);

  const cl = clients.find(x => x.id === activeId);

  const addTodo = async () => {
    if (!todo.trim() || !cl) return;
    const t = { id: Date.now().toString(36), client_id: cl.id, text: todo.trim(), source: src, date: todayStr(), recurring: isWeekly };
    setSaving(true);
    await api("save-todo", { action: "add", todo: t });
    setTodo(""); setIsWeekly(false);
    await load();
    setSaving(false);
  };

  const toggleTodo = async (id, done) => {
    setSaving(true);
    await api("save-todo", { action: "toggle", todo: { id, done: !done } });
    await load();
    setSaving(false);
  };

  const delTodo = async (id) => {
    setSaving(true);
    await api("save-todo", { action: "delete", todo: { id } });
    await load();
    setSaving(false);
  };

  const confirmFlag = async (id, text) => {
    if (!cl) return;
    setSaving(true);
    await api("save-flagged", { action: "confirm", item: { id } });
    if (text) {
      await api("save-todo", { action: "add", todo: { id: Date.now().toString(36), client_id: cl.id, text, source: "whatsapp", date: todayStr() } });
    }
    await load();
    setSaving(false);
  };

  const dismissFlag = async (id) => {
    setSaving(true);
    await api("save-flagged", { action: "dismiss", item: { id } });
    await load();
    setSaving(false);
  };

  const markReviewed = async (id) => {
    setSaving(true);
    await api("update-message", { action: "review", id });
    await load();
    setSaving(false);
  };

  const reclassifyMessage = async (id, classification) => {
    setSaving(true);
    await api("update-message", { action: "reclassify", id, message: { classification } });
    await load();
    setSaving(false);
  };

  const promoteToTodo = async (id, clientId, text) => {
    if (!text || !text.trim() || !clientId) return;
    setSaving(true);
    await api("update-message", { action: "promote_to_todo", id, message: { client_id: clientId, text: text.trim() } });
    await load();
    setSaving(false);
  };

  const processFathom = async () => {
    const fc = clients.find(x => x.id === fathomClientId);
    if (!fathomText.trim() || !fc) return;
    setFathomBusy(true); setFathomRes(null);
    const res = await api("process-fathom", {
      transcript: fathomText, clientId: fc.id, clientName: fc.name,
      contacts: (fc.contacts || []).map(x => x.name).join(", "),
    });
    setFathomRes(res);
    setFathomBusy(false);
  };

  const applyFathom = async () => {
    setShowFathom(false); setFathomText(""); setFathomRes(null);
    await load();
  };

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

  // Counts for sidebar badges
  const totalOpenTodos = clients.reduce((n, c) => n + (c.todos || []).filter(t => !t.done).length, 0);
  const newMsgCount = messages.filter(m => m.status === "new" && (m.classification === "todo" || m.classification === "important" || m.classification === "unrouted" || m.classification === "ambiguous")).length;

  return (
    <div style={{ fontFamily: s.f, background: s.bg, color: s.tx, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: `1px solid ${s.bd}`, background: s.sf }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: s.ac, letterSpacing: -1.2 }}>leadly</span>
          <span style={{ fontSize: 11, color: s.td, background: s.ad, padding: "2px 8px", borderRadius: 6 }}>dashboard</span>
          {saving && <span style={{ fontSize: 11, color: s.am }}>saving…</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {lastLoaded && <span style={{ fontSize: 11, color: s.td }}>updated {fmtTime(lastLoaded.toISOString())}</span>}
          <button onClick={() => { setLoading(true); load(); }} style={{ ...ghost, fontSize: 12, padding: "4px 12px", display: "flex", alignItems: "center", gap: 5 }}>
            <Icon d={I.refresh} size={13} color={s.tm} /> Refresh
          </button>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <aside style={{ width: 220, minWidth: 220, borderRight: `1px solid ${s.bd}`, background: s.sf, padding: "16px 0", overflowY: "auto" }}>
          <div style={{ padding: "0 16px" }}>
            {/* Live Feed */}
            <button onClick={() => setActiveId("feed")} style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: 8, border: "none", background: activeId === "feed" ? s.ad : "transparent", color: activeId === "feed" ? s.ac : s.tm, fontSize: 13, fontWeight: activeId === "feed" ? 600 : 400, cursor: "pointer", fontFamily: s.f, marginBottom: 4, display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: "#25D366", flexShrink: 0, boxShadow: "0 0 6px #25D36680" }} />
              <span style={{ flex: 1 }}>Live Feed</span>
              {newMsgCount > 0 && <span style={{ fontSize: 10, background: "#25D366", color: s.bg, padding: "1px 6px", borderRadius: 8, fontWeight: 700 }}>{newMsgCount}</span>}
            </button>

            {/* Dashboard */}
            <button onClick={() => setActiveId("dashboard")} style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: 8, border: "none", background: activeId === "dashboard" ? s.ad : "transparent", color: activeId === "dashboard" ? s.ac : s.tm, fontSize: 13, fontWeight: activeId === "dashboard" ? 600 : 400, cursor: "pointer", fontFamily: s.f, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>⊞</span>
              <span style={{ flex: 1 }}>Dashboard</span>
              {totalOpenTodos > 0 && <span style={{ fontSize: 10, background: s.ac, color: s.bg, padding: "1px 6px", borderRadius: 8, fontWeight: 700 }}>{totalOpenTodos}</span>}
            </button>

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

        <main style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {activeId === "feed" ? (
            <LiveFeed
              messages={messages}
              clients={clients}
              markReviewed={markReviewed}
              reclassifyMessage={reclassifyMessage}
              promoteToTodo={promoteToTodo}
            />
          ) : activeId === "dashboard" ? (
            <Dashboard clients={clients} messages={messages} setActiveId={setActiveId} />
          ) : !cl ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, color: s.td }}>
              <Icon d={I.users} size={48} color={s.td} />
              <div style={{ fontSize: 18, fontWeight: 600 }}>No clients found</div>
              <div style={{ fontSize: 13 }}>Hit the seed endpoint first: <code style={{ color: s.ac }}>/.netlify/functions/seed</code></div>
            </div>
          ) : (
            <ClientView
              cl={cl}
              open={open}
              pending={pending}
              todo={todo} setTodo={setTodo}
              src={src} setSrc={setSrc}
              isWeekly={isWeekly} setIsWeekly={setIsWeekly}
              addTodo={addTodo}
              toggleTodo={toggleTodo}
              delTodo={delTodo}
              confirmFlag={confirmFlag}
              dismissFlag={dismissFlag}
              markReviewed={markReviewed}
              reclassifyMessage={reclassifyMessage}
              promoteToTodo={promoteToTodo}
              reviveFlag={async (id) => { setSaving(true); await api("save-flagged", { action: "revive", item: { id } }); await load(); setSaving(false); }}
              deleteFlag={async (id) => { setSaving(true); await api("save-flagged", { action: "delete", item: { id } }); await load(); setSaving(false); }}
              setShowFathom={setShowFathom}
              setFathomRes={setFathomRes}
              setFathomText={setFathomText}
              setFathomClientId={setFathomClientId}
            />
          )}
        </main>
      </div>

      {/* Fathom Modal */}
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
                {fathomRes.summary && (
                  <div style={{ background: s.bg, borderRadius: 10, padding: 14, marginBottom: 16, border: `1px solid ${s.bd}` }}>
                    <div style={{ fontSize: 11, color: s.td, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Summary</div>
                    <div style={{ fontSize: 13, lineHeight: 1.6 }}>{fathomRes.summary}</div>
                  </div>
                )}
                {(fathomRes.todos || []).length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: s.gn, marginBottom: 8 }}>{fathomRes.todos.length} todo{fathomRes.todos.length !== 1 ? "s" : ""} added</div>
                    {fathomRes.todos.map((t, i) => (
                      <div key={i} style={{ padding: "8px 12px", borderRadius: 8, background: s.bg, border: `1px solid ${s.bd}`, marginBottom: 6, fontSize: 13, display: "flex", gap: 8 }}>
                        <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: t.urgency === "high" ? s.rd : t.urgency === "low" ? s.gd : s.amd, color: t.urgency === "high" ? s.rs : t.urgency === "low" ? s.gn : s.am, fontWeight: 600, flexShrink: 0 }}>{t.urgency}</span>
                        <span>{t.text}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(fathomRes.flagged || []).length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: s.am, marginBottom: 8 }}>{fathomRes.flagged.length} flagged</div>
                    {fathomRes.flagged.map((f, i) => (
                      <div key={i} style={{ padding: "8px 12px", borderRadius: 8, background: s.bg, border: `1px solid ${s.am}30`, marginBottom: 6, fontSize: 13, borderLeft: `3px solid ${s.am}` }}>
                        <div>"{f.message}"</div>
                        <div style={{ fontSize: 11, color: s.am, marginTop: 4 }}>⚠ {f.reason}</div>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={applyFathom} style={{ ...btn, width: "100%" }}>Done — refresh dashboard</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LIVE FEED — every WA message streaming in with classification
// ─────────────────────────────────────────────────────────────
function LiveFeed({ messages, clients, markReviewed, reclassifyMessage, promoteToTodo }) {
  const [clientFilter, setClientFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [hideReviewed, setHideReviewed] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editTodoText, setEditTodoText] = useState("");
  const [editClientId, setEditClientId] = useState("");

  // Stats
  const stats = useMemo(() => {
    const s = { total: messages.length, todo: 0, important: 0, noise: 0, unrouted: 0, ambiguous: 0, unclassified: 0 };
    messages.forEach(m => { s[m.classification] = (s[m.classification] || 0) + 1; });
    return s;
  }, [messages]);

  const filtered = useMemo(() => {
    return messages.filter(m => {
      if (clientFilter !== "all") {
        if (clientFilter === "__unrouted" && m.client_id) return false;
        if (clientFilter !== "__unrouted" && m.client_id !== clientFilter) return false;
      }
      if (typeFilter !== "all" && m.classification !== typeFilter) return false;
      if (hideReviewed && m.status === "reviewed") return false;
      return true;
    });
  }, [messages, clientFilter, typeFilter, hideReviewed]);

  // Group by date
  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(m => {
      const d = m.timestamp ? m.timestamp.split("T")[0] : "unknown";
      if (!g[d]) g[d] = [];
      g[d].push(m);
    });
    return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const dateLabel = (d) => {
    if (d === "unknown") return "Unknown";
    const date = new Date(d + "T00:00:00");
    const today = todayStr();
    const y = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    if (d === today) return "Today";
    if (d === y) return "Yesterday";
    return date.toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "short" });
  };

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>Live Feed</h2>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "#25D366", background: "#25D36610", padding: "3px 10px", borderRadius: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: "#25D366", animation: "pulse 2s infinite" }} />
            auto-refreshing
          </span>
        </div>
        <div style={{ fontSize: 12, color: s.td, marginTop: 4 }}>
          {stats.total} messages — {stats.todo || 0} todos · {stats.important || 0} important · {stats.noise || 0} noise
          {(stats.unrouted || 0) + (stats.ambiguous || 0) > 0 && <span style={{ color: s.rs }}> · {(stats.unrouted || 0) + (stats.ambiguous || 0)} need routing</span>}
        </div>
      </div>

      {/* Stat tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
        {[
          { k: "all", l: "All", v: stats.total, c: s.ac },
          { k: "todo", l: "Todos", v: stats.todo || 0, c: s.gn },
          { k: "important", l: "Important", v: stats.important || 0, c: s.am },
          { k: "noise", l: "Noise", v: stats.noise || 0, c: s.td },
          { k: "unrouted", l: "Unrouted", v: (stats.unrouted || 0) + (stats.ambiguous || 0), c: s.rs },
        ].map(t => (
          <button key={t.k} onClick={() => setTypeFilter(t.k === "unrouted" ? "unrouted" : t.k)} style={{ ...card, marginBottom: 0, padding: "12px 14px", cursor: "pointer", textAlign: "left", borderColor: typeFilter === t.k ? t.c : s.bd, background: typeFilter === t.k ? `${t.c}08` : s.sf }}>
            <div style={{ fontSize: 11, color: s.td, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600 }}>{t.l}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: t.c, marginTop: 2 }}>{t.v}</div>
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} style={{ ...inp, width: "auto", minWidth: 160, cursor: "pointer", fontSize: 12, padding: "7px 12px" }}>
          <option value="all">All clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          <option value="__unrouted">— Unrouted / unknown —</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...inp, width: "auto", minWidth: 140, cursor: "pointer", fontSize: 12, padding: "7px 12px" }}>
          <option value="all">All types</option>
          <option value="todo">Todo</option>
          <option value="important">Important</option>
          <option value="noise">Noise</option>
          <option value="unrouted">Unrouted</option>
          <option value="ambiguous">Ambiguous</option>
        </select>
        <button onClick={() => setHideReviewed(!hideReviewed)} style={{ ...ghost, fontSize: 12, padding: "7px 12px", background: hideReviewed ? s.ad : "transparent", color: hideReviewed ? s.ac : s.tm, borderColor: hideReviewed ? s.ac + "50" : s.bd }}>
          {hideReviewed ? "✓ Hiding reviewed" : "Hide reviewed"}
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: s.td }}>{filtered.length} of {messages.length}</div>
      </div>

      {/* Messages list */}
      {filtered.length === 0 ? (
        <div style={{ ...card, padding: 40, textAlign: "center", color: s.td }}>
          <Icon d={I.chat} size={32} color={s.td} />
          <div style={{ fontSize: 14, marginTop: 8 }}>No messages match these filters</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Try changing the filters or wait for new messages</div>
        </div>
      ) : (
        grouped.map(([date, msgs]) => (
          <div key={date} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: s.td, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, marginBottom: 8, padding: "0 2px" }}>
              {dateLabel(date)} <span style={{ color: s.td, fontWeight: 400 }}>· {msgs.length}</span>
            </div>
            {msgs.map(m => {
              const cls = classMap[m.classification] || classMap.unclassified;
              const isExpanded = expandedId === m.id;
              const isReviewed = m.status === "reviewed";
              return (
                <div key={m.id} style={{ marginBottom: 8, background: s.sf, border: `1px solid ${s.bd}`, borderLeft: `3px solid ${cls.dot}`, borderRadius: 10, opacity: isReviewed ? 0.6 : 1, overflow: "hidden" }}>
                  {/* Collapsed row */}
                  <div onClick={() => setExpandedId(isExpanded ? null : m.id)} style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: cls.bg, color: cls.c, fontWeight: 600, flexShrink: 0, minWidth: 70, textAlign: "center" }}>{cls.l}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        {m.client_name ? (
                          <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 4, background: s.ad, color: s.ac, fontWeight: 600 }}>{m.client_name}</span>
                        ) : (
                          <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 4, background: s.rd, color: s.rs, fontWeight: 600 }}>no client</span>
                        )}
                        <span style={{ fontSize: 12, color: s.tx, fontWeight: 500 }}>{m.contact}</span>
                        {m.conversation && <span style={{ fontSize: 10, color: s.td }}>· {m.conversation}</span>}
                        <div style={{ flex: 1 }} />
                        <span style={{ fontSize: 11, color: s.td }}>{fmtTime(m.timestamp)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: s.tm, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.message}</div>
                      {m.reasoning && !isExpanded && (
                        <div style={{ fontSize: 11, color: cls.c, marginTop: 3, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          → {m.reasoning}
                        </div>
                      )}
                    </div>
                    <span style={{ color: s.td, fontSize: 10, flexShrink: 0 }}>{isExpanded ? "▼" : "▶"}</span>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ padding: "14px 16px", borderTop: `1px solid ${s.bd}`, background: s.bg }}>
                      {/* Full message */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, color: s.td, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Message</div>
                        <div style={{ fontSize: 13, color: s.tx, lineHeight: 1.6, padding: "10px 12px", background: s.sf, borderRadius: 8, whiteSpace: "pre-wrap" }}>{m.message}</div>
                      </div>

                      {/* Classification + reasoning */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, color: s.td, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>AI classification</div>
                        <div style={{ padding: "10px 12px", background: s.sf, borderRadius: 8, border: `1px solid ${cls.c}30` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: cls.bg, color: cls.c, fontWeight: 700 }}>{cls.l}</span>
                            <span style={{ fontSize: 11, color: s.td }}>{cls.desc}</span>
                          </div>
                          {m.reasoning && <div style={{ fontSize: 12, color: s.tm, lineHeight: 1.5, marginTop: 4 }}>{m.reasoning}</div>}
                        </div>
                      </div>

                      {/* Linked artifacts */}
                      {(m.todo_ids || m.flagged_id) && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 10, color: s.td, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Created</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {m.todo_ids && m.todo_ids.split(",").filter(Boolean).map(tid => (
                              <span key={tid} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 4, background: s.gd, color: s.gn, fontWeight: 500 }}>📋 Todo #{tid.slice(-4)}</span>
                            ))}
                            {m.flagged_id && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 4, background: s.amd, color: s.am, fontWeight: 500 }}>⚠ Flagged #{m.flagged_id.slice(-4)}</span>}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        {!isReviewed && (
                          <button onClick={(e) => { e.stopPropagation(); markReviewed(m.id); }} style={{ ...ghost, fontSize: 11, padding: "6px 12px" }}>
                            ✓ Mark reviewed
                          </button>
                        )}

                        {/* Promote to todo if not already a todo */}
                        {m.classification !== "todo" && m.client_id && (
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <input
                              placeholder="Make this a todo…"
                              value={expandedId === m.id ? editTodoText : ""}
                              onChange={e => setEditTodoText(e.target.value)}
                              onClick={e => e.stopPropagation()}
                              style={{ ...inp, fontSize: 11, padding: "6px 10px", width: 220 }}
                            />
                            <button onClick={(e) => { e.stopPropagation(); promoteToTodo(m.id, m.client_id, editTodoText); setEditTodoText(""); }} disabled={!editTodoText.trim()} style={{ ...btn, background: s.gn, fontSize: 11, padding: "6px 12px", opacity: editTodoText.trim() ? 1 : 0.4 }}>
                              → Todo
                            </button>
                          </div>
                        )}

                        {/* Assign to client if unrouted */}
                        {!m.client_id && (
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <select
                              value={editClientId}
                              onChange={e => setEditClientId(e.target.value)}
                              onClick={e => e.stopPropagation()}
                              style={{ ...inp, fontSize: 11, padding: "6px 10px", width: "auto", minWidth: 140, cursor: "pointer" }}
                            >
                              <option value="">Assign client…</option>
                              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <input
                              placeholder="Todo text…"
                              value={expandedId === m.id ? editTodoText : ""}
                              onChange={e => setEditTodoText(e.target.value)}
                              onClick={e => e.stopPropagation()}
                              style={{ ...inp, fontSize: 11, padding: "6px 10px", width: 180 }}
                            />
                            <button onClick={(e) => { e.stopPropagation(); if (editClientId) { promoteToTodo(m.id, editClientId, editTodoText); setEditTodoText(""); setEditClientId(""); } }} disabled={!editClientId || !editTodoText.trim()} style={{ ...btn, background: s.gn, fontSize: 11, padding: "6px 12px", opacity: (editClientId && editTodoText.trim()) ? 1 : 0.4 }}>
                              → Todo
                            </button>
                          </div>
                        )}

                        <div style={{ flex: 1 }} />

                        {/* Reclassify */}
                        <div style={{ display: "flex", gap: 4 }}>
                          {["todo", "important", "noise"].filter(c => c !== m.classification).map(c => (
                            <button key={c} onClick={(e) => { e.stopPropagation(); reclassifyMessage(m.id, c); }} style={{ ...ghost, fontSize: 10, padding: "4px 8px", color: classMap[c].c, borderColor: classMap[c].c + "40" }}>
                              → {classMap[c].l}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))
      )}

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD — all clients merged
// ─────────────────────────────────────────────────────────────
function Dashboard({ clients, messages, setActiveId }) {
  const allTodos = clients.flatMap(c => (c.todos || []).filter(t => !t.done).map(t => ({ ...t, clientName: c.name, clientId: c.id })));
  const allFlagged = clients.flatMap(c => (c.flagged || []).filter(f => f.status === "pending").map(f => ({ ...f, clientName: c.name })));

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>Dashboard</h2>
        <div style={{ fontSize: 12, color: s.td, marginTop: 4 }}>
          {allTodos.length} open across {clients.length} clients{allFlagged.length > 0 && <span style={{ color: s.am }}> · {allFlagged.length} flagged</span>}
        </div>
      </div>

      {/* Client summary cards */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {clients.map(c => {
          const cOpen = (c.todos || []).filter(t => !t.done).length;
          const cFlag = (c.flagged || []).filter(f => f.status === "pending").length;
          const cMsg = (c.messages || []).filter(m => m.status === "new" && (m.classification === "todo" || m.classification === "important")).length;
          return (
            <button key={c.id} onClick={() => setActiveId(c.id)} style={{ ...card, padding: "12px 16px", marginBottom: 0, flex: "1 1 160px", cursor: "pointer", minWidth: 160 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: s.tx, marginBottom: 4 }}>{c.name}</div>
              <div style={{ fontSize: 11, color: s.td }}>
                {cOpen} open{cFlag > 0 && <span style={{ color: s.am }}> · {cFlag} flag</span>}{cMsg > 0 && <span style={{ color: "#25D366" }}> · {cMsg} new</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* All flagged */}
      {allFlagged.length > 0 && (
        <div style={{ ...card, borderColor: s.am + "40", padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Icon d={I.zap} size={14} color={s.am} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Flagged</span>
            <span style={{ fontSize: 11, color: s.bg, background: s.am, padding: "1px 7px", borderRadius: 10, fontWeight: 700 }}>{allFlagged.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {allFlagged.map(f => (
              <div key={f.id} style={{ padding: "8px 10px", borderRadius: 8, background: s.bg, border: `1px solid ${s.am}30`, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4, background: s.ad, color: s.ac, fontWeight: 600, flexShrink: 0 }}>{f.clientName}</span>
                <span style={{ fontSize: 12, color: s.tm, flex: 1 }}>"{(f.message || "").slice(0, 80)}{(f.message || "").length > 80 ? "…" : ""}"</span>
                <span style={{ fontSize: 11, color: s.am }}>{f.contact}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All open todos */}
      <div style={{ ...card, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Icon d={I.clipboard} size={14} color={s.ac} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>All open todos</span>
          <span style={{ fontSize: 11, color: s.td, background: s.ad, padding: "1px 7px", borderRadius: 10 }}>{allTodos.length}</span>
        </div>
        {allTodos.length === 0 && <div style={{ color: s.td, fontSize: 12, padding: "8px 0", textAlign: "center" }}>All clear ✓</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {allTodos.map(td => (
            <div key={td.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, background: s.bg, border: `1px solid ${s.bd}` }}>
              <button onClick={() => setActiveId(td.clientId)} style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4, background: s.ad, color: s.ac, fontWeight: 600, flexShrink: 0, border: "none", cursor: "pointer", fontFamily: s.f }}>{td.clientName}</button>
              <span style={{ flex: 1, fontSize: 12 }}>{td.text}</span>
              {(td.recurring === "true" || td.recurring === true) && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: s.pd, color: s.pr, fontWeight: 600 }}>weekly</span>}
              <Badge source={td.source} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// CLIENT VIEW — contacts, flagged, todos, messages, archive
// ─────────────────────────────────────────────────────────────
function ClientView({ cl, open, pending, todo, setTodo, src, setSrc, isWeekly, setIsWeekly, addTodo, toggleTodo, delTodo, confirmFlag, dismissFlag, markReviewed, reclassifyMessage, promoteToTodo, reviveFlag, deleteFlag, setShowFathom, setFathomRes, setFathomText, setFathomClientId }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>{cl.name}</h2>
          <div style={{ fontSize: 12, color: s.td, marginTop: 4 }}>
            {open} open{pending > 0 && <span style={{ color: s.am }}> · {pending} flagged</span>}
            {(cl.messages || []).length > 0 && <span> · {(cl.messages || []).length} messages</span>}
          </div>
        </div>
        <button onClick={() => { setShowFathom(true); setFathomRes(null); setFathomText(""); setFathomClientId(cl?.id || null); }} style={{ ...ghost, fontSize: 12, padding: "5px 12px", display: "flex", alignItems: "center", gap: 5 }}>
          <Icon d={I.video} size={14} color={s.tm} /> Upload Meeting
        </button>
      </div>

      {/* Contacts */}
      {(cl.contacts || []).length > 0 && (
        <div style={{ ...card, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <Icon d={I.user} size={14} color={s.td} />
            <span style={{ fontSize: 12, fontWeight: 600, color: s.td, textTransform: "uppercase", letterSpacing: 0.5 }}>Contacts</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {cl.contacts.map(x => (
              <span key={x.name} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, background: x.role === "Main POC" ? s.ad : s.bg, color: x.role === "Main POC" ? s.ac : s.tm, border: `1px solid ${x.role === "Main POC" ? s.ac + "30" : s.bd}`, fontWeight: x.role === "Main POC" ? 600 : 400 }}>
                {x.name}{x.role === "Main POC" ? " ★" : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Flagged */}
      {(cl.flagged || []).length > 0 && <Flagged items={cl.flagged} confirmFlag={confirmFlag} dismissFlag={dismissFlag} />}

      {/* Todos — open only */}
      <div style={{ ...card, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Icon d={I.clipboard} size={14} color={s.ac} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Todo</span>
          <span style={{ fontSize: 11, color: s.td, background: s.ad, padding: "1px 7px", borderRadius: 10 }}>{open}</span>
        </div>
        {cl.todos.filter(x => !x.done).length === 0 && <div style={{ color: s.td, fontSize: 12, padding: "8px 0", textAlign: "center" }}>No open todos</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {cl.todos.filter(x => !x.done).map(td => (
            <div key={td.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, background: s.bg, border: `1px solid ${s.bd}` }}>
              <button onClick={() => toggleTodo(td.id, td.done)} style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${s.bl}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }} />
              <span style={{ flex: 1, fontSize: 12 }}>{td.text}</span>
              {(td.recurring === "true" || td.recurring === true) && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: s.pd, color: s.pr, fontWeight: 600 }}>weekly</span>}
              <Badge source={td.source} />
              <button onClick={() => delTodo(td.id)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 3, opacity: 0.35 }}><Icon d={I.trash} size={13} color={s.rs} /></button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10, alignItems: "center" }}>
          <input value={todo} onChange={e => setTodo(e.target.value)} onKeyDown={e => e.key === "Enter" && addTodo()} placeholder="Add todo…" style={{ ...inp, flex: 1, fontSize: 12, padding: "7px 12px" }} />
          <button onClick={() => setIsWeekly(!isWeekly)} style={{ ...ghost, fontSize: 11, padding: "5px 10px", background: isWeekly ? s.pd : "transparent", color: isWeekly ? s.pr : s.td, borderColor: isWeekly ? s.pr + "50" : s.bd }}>🔁</button>
          <select value={src} onChange={e => setSrc(e.target.value)} style={{ ...inp, width: "auto", minWidth: 90, cursor: "pointer", fontSize: 12, padding: "7px 10px" }}>
            <option value="manual">Manual</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="zoom">Zoom</option>
            <option value="ghl">GHL</option>
          </select>
          <button onClick={addTodo} style={{ ...btn, fontSize: 12, padding: "7px 14px" }}>Add</button>
        </div>
      </div>

      {/* Client messages section */}
      {(cl.messages || []).length > 0 && (
        <ClientMessages
          messages={cl.messages}
          clientId={cl.id}
          markReviewed={markReviewed}
          reclassifyMessage={reclassifyMessage}
          promoteToTodo={promoteToTodo}
        />
      )}

      {/* Archive — done todos + resolved flags */}
      <Archive
        doneTodos={cl.todos.filter(x => x.done)}
        resolvedFlags={(cl.flagged || []).filter(x => x.status !== "pending")}
        reviveTodo={(id) => toggleTodo(id, true)}
        reviveFlag={reviveFlag}
        deleteTodo={(id) => delTodo(id)}
        deleteFlag={deleteFlag}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// CLIENT MESSAGES — compact feed in per-client view
// ─────────────────────────────────────────────────────────────
function ClientMessages({ messages, clientId, markReviewed, reclassifyMessage, promoteToTodo }) {
  const [expandedId, setExpandedId] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [editTodoText, setEditTodoText] = useState("");

  const filtered = typeFilter === "all" ? messages : messages.filter(m => m.classification === typeFilter);

  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Icon d={I.chat} size={14} color="#25D366" />
        <span style={{ fontSize: 14, fontWeight: 600 }}>Recent Messages</span>
        <span style={{ fontSize: 11, color: s.td, background: "#25D36620", padding: "1px 7px", borderRadius: 10 }}>{messages.length}</span>
        <div style={{ flex: 1 }} />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...inp, width: "auto", minWidth: 110, cursor: "pointer", fontSize: 11, padding: "4px 10px" }}>
          <option value="all">All</option>
          <option value="todo">Todo</option>
          <option value="important">Important</option>
          <option value="noise">Noise</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={{ color: s.td, fontSize: 12, padding: "12px 0", textAlign: "center" }}>No messages match this filter</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.slice(0, 30).map(m => {
            const cls = classMap[m.classification] || classMap.unclassified;
            const isExpanded = expandedId === m.id;
            return (
              <div key={m.id} style={{ background: s.bg, border: `1px solid ${s.bd}`, borderLeft: `3px solid ${cls.dot}`, borderRadius: 8, overflow: "hidden" }}>
                <div onClick={() => setExpandedId(isExpanded ? null : m.id)} style={{ padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, background: cls.bg, color: cls.c, fontWeight: 600, flexShrink: 0, minWidth: 56, textAlign: "center" }}>{cls.l}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: s.tx, flexShrink: 0 }}>{m.contact}</span>
                  <span style={{ fontSize: 11, color: s.tm, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.message}</span>
                  <span style={{ fontSize: 10, color: s.td, flexShrink: 0 }}>{fmtTime(m.timestamp)}</span>
                </div>
                {isExpanded && (
                  <div style={{ padding: "10px 12px", borderTop: `1px solid ${s.bd}` }}>
                    <div style={{ fontSize: 12, color: s.tx, lineHeight: 1.5, marginBottom: 8, whiteSpace: "pre-wrap" }}>{m.message}</div>
                    {m.reasoning && (
                      <div style={{ fontSize: 11, color: cls.c, fontStyle: "italic", marginBottom: 8 }}>→ {m.reasoning}</div>
                    )}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      {m.status !== "reviewed" && (
                        <button onClick={(e) => { e.stopPropagation(); markReviewed(m.id); }} style={{ ...ghost, fontSize: 10, padding: "4px 8px" }}>✓ Reviewed</button>
                      )}
                      {m.classification !== "todo" && (
                        <>
                          <input
                            placeholder="Make this a todo…"
                            value={isExpanded ? editTodoText : ""}
                            onChange={e => setEditTodoText(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            style={{ ...inp, fontSize: 11, padding: "4px 8px", width: 180 }}
                          />
                          <button onClick={(e) => { e.stopPropagation(); promoteToTodo(m.id, clientId, editTodoText); setEditTodoText(""); }} disabled={!editTodoText.trim()} style={{ ...btn, background: s.gn, fontSize: 10, padding: "4px 8px", opacity: editTodoText.trim() ? 1 : 0.4 }}>→ Todo</button>
                        </>
                      )}
                      <div style={{ flex: 1 }} />
                      {["todo", "important", "noise"].filter(c => c !== m.classification).map(c => (
                        <button key={c} onClick={(e) => { e.stopPropagation(); reclassifyMessage(m.id, c); }} style={{ ...ghost, fontSize: 9, padding: "3px 6px", color: classMap[c].c, borderColor: classMap[c].c + "40" }}>→ {classMap[c].l}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {filtered.length > 30 && (
        <div style={{ fontSize: 11, color: s.td, textAlign: "center", marginTop: 10 }}>Showing 30 of {filtered.length} — check Live Feed for older messages</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FLAGGED — pending review queue on client page
// ─────────────────────────────────────────────────────────────
function Flagged({ items, confirmFlag, dismissFlag }) {
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const pend = items.filter(x => x.status === "pending");
  if (pend.length === 0) return null;

  return (
    <div style={{ ...card, borderColor: s.am + "40", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Icon d={I.zap} size={14} color={s.am} />
        <span style={{ fontSize: 14, fontWeight: 600 }}>Flagged</span>
        <span style={{ fontSize: 11, color: s.bg, background: s.am, padding: "1px 7px", borderRadius: 10, fontWeight: 700 }}>{pend.length}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {pend.map(msg => (
          <div key={msg.id} style={{ padding: "10px 12px", borderRadius: 8, background: s.bg, border: `1px solid ${s.am}30` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{msg.contact}</span>
              <span style={{ fontSize: 10, color: s.td }}>{msg.timestamp ? new Date(msg.timestamp).toLocaleDateString("en-SG", { day: "numeric", month: "short" }) : ""}</span>
            </div>
            <div style={{ fontSize: 12, color: s.tm, marginBottom: 6, lineHeight: 1.4 }}>"{(msg.message || "").slice(0, 120)}{(msg.message || "").length > 120 ? "…" : ""}"</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              {editId === msg.id ? (
                <>
                  <input value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { confirmFlag(msg.id, editText); setEditId(null); }}} placeholder="Todo text…" style={{ ...inp, flex: 1, fontSize: 12, padding: "6px 10px", minWidth: 180 }} autoFocus />
                  <button onClick={() => { confirmFlag(msg.id, editText); setEditId(null); }} style={{ ...btn, fontSize: 11, padding: "5px 12px" }}>Add</button>
                  <button onClick={() => setEditId(null)} style={{ ...ghost, fontSize: 11, padding: "5px 8px" }}>✕</button>
                </>
              ) : (
                <>
                  <button onClick={() => { setEditId(msg.id); setEditText(msg.summary || ""); }} style={{ ...btn, fontSize: 11, padding: "5px 12px", background: s.gn }}>→ Todo</button>
                  <button onClick={() => dismissFlag(msg.id)} style={{ ...ghost, fontSize: 11, padding: "5px 12px", color: s.rs, borderColor: s.rd }}>Dismiss</button>
                  <span style={{ fontSize: 11, color: s.am, marginLeft: 4 }}>{msg.reason || msg.summary}</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ARCHIVE — done todos + resolved flags
// ─────────────────────────────────────────────────────────────
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
      {expanded && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
          {doneTodos.map(td => (
            <div key={td.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", borderRadius: 6, opacity: 0.6 }}>
              <Icon d={I.check} size={12} color={s.gn} />
              <span style={{ flex: 1, fontSize: 11, textDecoration: "line-through", color: s.tm }}>{td.text}</span>
              <Badge source={td.source} />
              <button onClick={() => reviveTodo(td.id)} style={{ ...ghost, fontSize: 10, padding: "2px 8px" }}>Revive</button>
              <button onClick={() => deleteTodo(td.id)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2, opacity: 0.5 }}><Icon d={I.trash} size={12} color={s.rs} /></button>
            </div>
          ))}
          {resolvedFlags.map(f => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", borderRadius: 6, opacity: 0.6 }}>
              <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: f.status === "confirmed" ? s.gd : s.rd, color: f.status === "confirmed" ? s.gn : s.rs, fontWeight: 600 }}>
                {f.status === "confirmed" ? "added" : "dismissed"}
              </span>
              <span style={{ flex: 1, fontSize: 11, color: s.tm }}>"{(f.message || "").slice(0, 50)}{(f.message || "").length > 50 ? "…" : ""}"</span>
              <button onClick={() => reviveFlag(f.id)} style={{ ...ghost, fontSize: 10, padding: "2px 8px" }}>Revive</button>
              <button onClick={() => deleteFlag(f.id)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2, opacity: 0.5 }}><Icon d={I.trash} size={12} color={s.rs} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
