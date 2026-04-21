import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ════════════════════════════════════════════════════════════════════
// LEADLY DASHBOARD — v3 UX overhaul
// Primary goal: open the app, see what needs your attention, act on it.
// ════════════════════════════════════════════════════════════════════

const API = "/.netlify/functions";
const todayStr = () => new Date().toISOString().split("T")[0];

const api = async (fn, body) => {
  const r = await fetch(`${API}/${fn}`, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {});
  return r.json();
};

// ─── Icons ──────────────────────────────────────────────────────────
const Icon = ({ d, size = 18, color = "currentColor", strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const I = {
  plus: "M12 5v14M5 12h14",
  check: "M20 6L9 17l-5-5",
  checkCircle: "M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3",
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
  search: "M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z",
  arrow: "M5 12h14M12 5l7 7-7 7",
  alert: "M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
  help: "M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  inbox: "M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z",
  at: "M16 12a4 4 0 11-8 0 4 4 0 018 0zM21 12a9 9 0 11-18 0 9 9 0 0118 0zm0 0v1.5a2.5 2.5 0 01-5 0V12",
  sparkle: "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z",
  kbd: "M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  brain: "M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-4.96.44 2.5 2.5 0 01-2.96-3.08 3 3 0 01-.34-5.58 2.5 2.5 0 011.32-4.24 2.5 2.5 0 014.44-1.04ZM14.5 2A2.5 2.5 0 0012 4.5v15a2.5 2.5 0 004.96.44 2.5 2.5 0 002.96-3.08 3 3 0 00.34-5.58 2.5 2.5 0 00-1.32-4.24 2.5 2.5 0 00-4.44-1.04Z",
  target: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 8a4 4 0 100 8 4 4 0 000-8zM12 12h.01",
  msgCircle: "M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z",
  clock: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  lightbulb: "M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7c.6.5 1 1.2 1 2V18h6v-1.3c0-.8.4-1.5 1-2A7 7 0 0012 2z",
  gavel: "M14.5 4.5L10 9l-1.5-1.5L13 3l1.5 1.5zm0 0L17 7l1.5-1.5L16 3l-1.5 1.5zM5 21h14M9 13l-4 4 2 2 4-4m-2-2L14 8",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
};

// ─── Design tokens ──────────────────────────────────────────────────
const s = {
  // Surfaces (darker → lighter)
  bg: "#0a0e17",
  sf: "#111827",
  sf2: "#1a2332",
  bd: "#1e293b",
  bl: "#2a3a52",

  // Text
  tx: "#e2e8f0",
  tm: "#94a3b8",
  td: "#64748b",

  // Brand + semantic
  ac: "#22d3ee", ad: "rgba(34,211,238,0.12)", ad2: "rgba(34,211,238,0.25)",
  gn: "#34d399", gd: "rgba(52,211,153,0.12)",
  am: "#fbbf24", amd: "rgba(251,191,36,0.12)",
  rs: "#f43f5e", rd: "rgba(244,63,94,0.12)",
  pr: "#a78bfa", pd: "rgba(167,139,250,0.12)",
  wa: "#25D366",

  f: "'DM Sans','Segoe UI',system-ui,sans-serif",
};

// Base styles
const card = { background: s.sf, border: `1px solid ${s.bd}`, borderRadius: 12 };
const inp = { background: s.bg, border: `1px solid ${s.bd}`, borderRadius: 8, padding: "9px 14px", color: s.tx, fontSize: 13, fontFamily: s.f, outline: "none", width: "100%", boxSizing: "border-box" };
const btn = { background: s.ac, color: s.bg, border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: s.f };
const ghost = { background: "transparent", color: s.tm, border: `1px solid ${s.bd}`, borderRadius: 8, padding: "9px 18px", fontSize: 13, cursor: "pointer", fontFamily: s.f };

// ─── Classification — semantic map with icons ───────────────────────
const classMap = {
  todo:         { l: "Todo",       short: "TODO",  c: s.gn, bg: s.gd, icon: I.clipboard, desc: "Clear actionable task" },
  important:    { l: "Important",  short: "IMP",   c: s.am, bg: s.amd, icon: I.alert, desc: "Needs human review" },
  noise:        { l: "Noise",      short: "NOISE", c: s.td, bg: `${s.td}20`, icon: I.chat, desc: "Chitchat, thanks, confirmations" },
  internal:     { l: "Internal",   short: "INT",   c: s.pr, bg: s.pd, icon: I.at, desc: "Team member — not client traffic" },
  unrouted:     { l: "Unrouted",   short: "UNR",   c: s.rs, bg: s.rd, icon: I.help, desc: "Couldn't match to a client" },
  ambiguous:    { l: "Ambiguous",  short: "AMB",   c: s.rs, bg: s.rd, icon: I.help, desc: "Multiple possible clients" },
  unclassified: { l: "Pending",    short: "...",   c: s.tm, bg: `${s.tm}20`, icon: I.refresh, desc: "Awaiting classification" },
};

// Actionable classifications (shown in "Action" default filter)
const ACTION_CLASSES = ["todo", "important", "unrouted", "ambiguous"];

// ─── Source badges (where todos came from) ──────────────────────────
const srcMap = {
  whatsapp: { l: "WhatsApp", bg: `${s.wa}15`, c: s.wa, i: I.chat },
  zoom: { l: "Zoom", bg: "#2D8CFF15", c: "#2D8CFF", i: I.video },
  ghl: { l: "GHL", bg: s.pd, c: s.pr, i: I.zap },
  manual: { l: "Manual", bg: s.ad, c: s.ac, i: I.edit },
};
const Badge = ({ source }) => {
  const x = srcMap[source] || srcMap.manual;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, padding: "2px 8px", borderRadius: 6, background: x.bg, color: x.c, fontWeight: 500 }}>
      <Icon d={x.i} size={11} color={x.c} />{x.l}
    </span>
  );
};

// ─── Time helpers ───────────────────────────────────────────────────
const fmtTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  if (hrs < 48) return "yesterday";
  return d.toLocaleDateString("en-SG", { day: "numeric", month: "short" });
};

const dateKey = (iso) => {
  if (!iso) return "unknown";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "unknown";
  return d.toISOString().split("T")[0];
};

const dateLabel = (d) => {
  if (d === "unknown") return "No timestamp";
  const date = new Date(d + "T00:00:00");
  if (isNaN(date.getTime())) return "No timestamp";
  const today = todayStr();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (d === today) return "Today";
  if (d === yesterday) return "Yesterday";
  return date.toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "short" });
};

// ═══════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════
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
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessResult, setReprocessResult] = useState(null);
  const [reprocessProgress, setReprocessProgress] = useState(null);
  const [brainRegenerating, setBrainRegenerating] = useState(null); // clientId or null
  const [brainError, setBrainError] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef(null);

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
  useEffect(() => {
    const t = setInterval(() => load(), 30000);
    return () => clearInterval(t);
  }, [load]);

  // ─── Global keyboard shortcuts ──────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      // Don't fire if typing in an input/textarea
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === "?") { setShowShortcuts(true); }
      else if (e.key === "Escape") { setShowShortcuts(false); }
      else if (e.key === "g") {
        // g then f/d/... for navigation (Gmail-style) — simplified: just g switches to feed
        setActiveId("feed");
      }
      else if (e.key === "r" && !e.shiftKey) {
        e.preventDefault();
        setLoading(true);
        load();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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

  const reprocessUnclassified = async () => {
    if (reprocessing) return;
    if (!window.confirm("Send every unclassified message to Claude for classification?")) return;

    setReprocessing(true);
    setReprocessResult(null);
    setReprocessProgress({ done: 0, total: 0, results: { todo: 0, important: 0, noise: 0, unrouted: 0, errored: 0 } });

    const merged = { todo: 0, important: 0, noise: 0, unrouted: 0, errored: 0 };
    let totalPending = 0;
    let doneCount = 0;
    let safetyCap = 100; // max iterations — stops runaway loops (100 * 8 = 800 messages)

    try {
      while (safetyCap-- > 0) {
        const res = await api("reprocess-messages", { batchSize: 8 });

        if (res.error) {
          setReprocessResult({ error: res.error });
          break;
        }

        // On first batch, lock in the total
        if (totalPending === 0) totalPending = res.totalPending || 0;

        // Accumulate results from this batch
        if (res.results) {
          for (const k of Object.keys(merged)) {
            merged[k] += res.results[k] || 0;
          }
        }
        doneCount += res.processed || 0;

        setReprocessProgress({ done: doneCount, total: totalPending, results: { ...merged } });

        // Refresh the feed so the user sees messages update live
        await load();

        if (res.done) {
          setReprocessResult({ message: res.message || `Processed ${doneCount} messages`, results: merged });
          break;
        }

        // Tiny pause between batches
        await new Promise(r => setTimeout(r, 300));
      }
    } catch (e) {
      setReprocessResult({ error: e.message || "Unknown error" });
    }

    setReprocessing(false);
    setReprocessProgress(null);
  };

  const regenerateBrain = async (clientId) => {
    if (!clientId || brainRegenerating) return;
    setBrainRegenerating(clientId);
    setBrainError(null);
    try {
      const res = await api("regenerate-brain", { clientId });
      if (res.error) {
        setBrainError(res.error);
      } else {
        await load();
      }
    } catch (e) {
      setBrainError(e.message || "Failed to regenerate");
    }
    setBrainRegenerating(null);
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
        <div style={{ color: s.td, fontSize: 13, marginTop: 8 }}>Loading…</div>
      </div>
    </div>
  );

  const pending = (cl?.flagged || []).filter(x => x.status === "pending").length;
  const open = (cl?.todos || []).filter(x => !x.done).length;

  // Sidebar "needs attention" count — actionable messages that are still new
  const actionCount = messages.filter(m =>
    ACTION_CLASSES.includes(m.classification) && m.status !== "reviewed"
  ).length;
  const totalOpenTodos = clients.reduce((n, c) => n + (c.todos || []).filter(t => !t.done).length, 0);

  return (
    <div style={{ fontFamily: s.f, background: s.bg, color: s.tx, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* ─── Top nav ─────────────────────────────────────────── */}
      <header style={{ display: "flex", alignItems: "center", gap: 20, padding: "12px 24px", borderBottom: `1px solid ${s.bd}`, background: s.sf, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: s.ac, letterSpacing: -1.2 }}>leadly</span>
          <span style={{ fontSize: 10, color: s.td, background: s.bg, padding: "2px 8px", borderRadius: 20, border: `1px solid ${s.bd}`, fontWeight: 500 }}>live</span>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: s.td }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: s.wa, boxShadow: `0 0 6px ${s.wa}`, animation: "pulse 2s infinite" }} />
            auto
          </span>
          {saving && <span style={{ color: s.am }}>· saving</span>}
          {lastLoaded && <span>· synced {fmtTime(lastLoaded.toISOString())}</span>}
        </div>

        <button onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts (?)"
          style={{ ...ghost, fontSize: 11, padding: "5px 10px", display: "flex", alignItems: "center", gap: 5 }}>
          <Icon d={I.kbd} size={12} color={s.tm} /> ?
        </button>
        <button onClick={() => { setLoading(true); load(); }} title="Refresh (r)"
          style={{ ...ghost, fontSize: 12, padding: "5px 12px", display: "flex", alignItems: "center", gap: 5 }}>
          <Icon d={I.refresh} size={13} color={s.tm} /> Refresh
        </button>
      </header>

      {/* ─── Main layout ─────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <aside style={{ width: 240, minWidth: 240, borderRight: `1px solid ${s.bd}`, background: s.sf, padding: "16px 0", overflowY: "auto" }}>
          <div style={{ padding: "0 12px" }}>
            <SidebarItem
              active={activeId === "feed"}
              onClick={() => setActiveId("feed")}
              accent={s.wa}
              icon={I.inbox}
              label="Live Feed"
              badge={actionCount > 0 ? { count: actionCount, color: s.wa } : null}
              subtitle="Inbox"
            />
            <SidebarItem
              active={activeId === "dashboard"}
              onClick={() => setActiveId("dashboard")}
              accent={s.ac}
              icon={I.clipboard}
              label="Dashboard"
              badge={totalOpenTodos > 0 ? { count: totalOpenTodos, color: s.ac } : null}
              subtitle="All todos"
            />

            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.8, color: s.td, marginTop: 20, marginBottom: 6, padding: "0 12px" }}>Clients</div>
            {clients.map(x => {
              const active = activeId === x.id;
              const pf = (x.flagged || []).filter(m => m.status === "pending").length;
              const ot = (x.todos || []).filter(t => !t.done).length;
              return (
                <SidebarItem
                  key={x.id}
                  active={active}
                  onClick={() => setActiveId(x.id)}
                  accent={s.ac}
                  dot
                  label={x.name}
                  badge={pf > 0 ? { count: pf, color: s.am } : (ot > 0 ? { count: ot, color: s.ac, muted: true } : null)}
                />
              );
            })}
          </div>
        </aside>

        {/* Main content area */}
        <main style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
          {activeId === "feed" ? (
            <LiveFeed
              messages={messages}
              clients={clients}
              markReviewed={markReviewed}
              reclassifyMessage={reclassifyMessage}
              promoteToTodo={promoteToTodo}
              reprocessUnclassified={reprocessUnclassified}
              reprocessing={reprocessing}
              reprocessResult={reprocessResult}
              reprocessProgress={reprocessProgress}
              searchRef={searchRef}
              setActiveId={setActiveId}
            />
          ) : activeId === "dashboard" ? (
            <Dashboard clients={clients} messages={messages} setActiveId={setActiveId} />
          ) : !cl ? (
            <EmptyState
              icon={I.users}
              title="No clients found"
              hint={<>Hit the seed endpoint first: <code style={{ color: s.ac }}>/.netlify/functions/seed</code></>}
            />
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
              regenerateBrain={regenerateBrain}
              brainRegenerating={brainRegenerating === cl.id}
              brainError={brainError}
            />
          )}
        </main>
      </div>

      {/* Fathom modal */}
      {showFathom && (
        <FathomModal
          clients={clients}
          fathomText={fathomText} setFathomText={setFathomText}
          fathomBusy={fathomBusy}
          fathomRes={fathomRes} setFathomRes={setFathomRes}
          fathomClientId={fathomClientId} setFathomClientId={setFathomClientId}
          processFathom={processFathom}
          applyFathom={applyFathom}
          close={() => { setShowFathom(false); setFathomRes(null); }}
        />
      )}

      {/* Shortcuts modal */}
      {showShortcuts && <ShortcutsModal close={() => setShowShortcuts(false)} />}

      {/* Global animations */}
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .msg-card:hover .hover-actions { opacity: 1; }
        .msg-card { transition: background 0.15s ease, border-color 0.15s ease; }
        .msg-card:hover { background: ${s.sf2} !important; }
        button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
          outline: 2px solid ${s.ac}; outline-offset: 1px;
        }
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${s.bd}; border-radius: 5px; border: 2px solid ${s.bg}; }
        ::-webkit-scrollbar-thumb:hover { background: ${s.bl}; }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SIDEBAR ITEM
// ═══════════════════════════════════════════════════════════════════
function SidebarItem({ active, onClick, icon, dot, label, subtitle, badge, accent = s.ac }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 8,
      border: "none", background: active ? s.ad : "transparent",
      color: active ? s.tx : s.tm, fontSize: 13, fontWeight: active ? 600 : 500,
      cursor: "pointer", fontFamily: s.f, marginBottom: 2,
      display: "flex", alignItems: "center", gap: 10, position: "relative",
    }}>
      {active && <span style={{ position: "absolute", left: -12, top: 6, bottom: 6, width: 3, borderRadius: 3, background: accent }} />}
      {icon ? <Icon d={icon} size={15} color={active ? accent : s.tm} /> : null}
      {dot ? <span style={{ width: 6, height: 6, borderRadius: 3, background: active ? accent : s.td, flexShrink: 0 }} /> : null}
      <span style={{ flex: 1, display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
        <span>{label}</span>
        {subtitle && <span style={{ fontSize: 10, color: s.td, fontWeight: 400 }}>{subtitle}</span>}
      </span>
      {badge && (
        <span style={{
          fontSize: 10, fontWeight: 700,
          background: badge.muted ? `${badge.color}25` : badge.color,
          color: badge.muted ? badge.color : s.bg,
          padding: "2px 7px", borderRadius: 10, minWidth: 18, textAlign: "center",
        }}>{badge.count}</span>
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LIVE FEED — the main event
// ═══════════════════════════════════════════════════════════════════
function LiveFeed({ messages, clients, markReviewed, reclassifyMessage, promoteToTodo, reprocessUnclassified, reprocessing, reprocessResult, reprocessProgress, searchRef, setActiveId }) {
  const [typeFilter, setTypeFilter] = useState("action"); // default: what needs attention
  const [clientFilter, setClientFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [hideReviewed, setHideReviewed] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [editTodoText, setEditTodoText] = useState("");
  const [editClientId, setEditClientId] = useState("");

  // Stats by classification
  const stats = useMemo(() => {
    const st = { total: messages.length, todo: 0, important: 0, noise: 0, internal: 0, unrouted: 0, ambiguous: 0, unclassified: 0 };
    messages.forEach(m => {
      const c = m.classification || "unclassified";
      st[c] = (st[c] || 0) + 1;
    });
    st.action = (st.todo || 0) + (st.important || 0) + (st.unrouted || 0) + (st.ambiguous || 0);
    st.unreviewed_action = messages.filter(m => ACTION_CLASSES.includes(m.classification) && m.status !== "reviewed").length;
    return st;
  }, [messages]);

  // Filtering
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return messages.filter(m => {
      // Type filter
      if (typeFilter === "action") {
        if (!ACTION_CLASSES.includes(m.classification)) return false;
      } else if (typeFilter !== "all") {
        if (typeFilter === "unrouted") {
          if (m.classification !== "unrouted" && m.classification !== "ambiguous") return false;
        } else if (m.classification !== typeFilter) return false;
      }

      // Client filter
      if (clientFilter !== "all") {
        if (clientFilter === "__unrouted") {
          if (m.client_id || m.classification === "internal") return false;
        } else if (m.client_id !== clientFilter) return false;
      }

      // Hide reviewed
      if (hideReviewed && m.status === "reviewed") return false;

      // Search
      if (q) {
        const hay = `${m.message || ""} ${m.contact || ""} ${m.client_name || ""} ${m.conversation || ""} ${m.reasoning || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [messages, typeFilter, clientFilter, searchQuery, hideReviewed]);

  // Group by day
  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(m => {
      const d = dateKey(m.timestamp);
      if (!g[d]) g[d] = [];
      g[d].push(m);
    });
    return Object.entries(g).sort((a, b) => {
      if (a[0] === "unknown") return 1;
      if (b[0] === "unknown") return -1;
      return b[0].localeCompare(a[0]);
    });
  }, [filtered]);

  // Filter tabs
  const tabs = [
    { k: "action", l: "Needs action", v: stats.unreviewed_action, c: s.am, primary: true },
    { k: "all", l: "All", v: stats.total, c: s.ac },
    { k: "todo", l: "Todos", v: stats.todo, c: s.gn },
    { k: "important", l: "Important", v: stats.important, c: s.am },
    { k: "noise", l: "Noise", v: stats.noise, c: s.td },
    { k: "internal", l: "Internal", v: stats.internal, c: s.pr },
    { k: "unrouted", l: "Unrouted", v: stats.unrouted + stats.ambiguous, c: s.rs },
  ];

  return (
    <>
      {/* Hero header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 6 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: -0.8 }}>
            {stats.unreviewed_action > 0 ? (
              <>
                <span style={{ color: s.am }}>{stats.unreviewed_action}</span>
                <span style={{ color: s.tx, fontWeight: 700 }}> need{stats.unreviewed_action === 1 ? "s" : ""} your attention</span>
              </>
            ) : (
              <span style={{ color: s.tx }}>All clear</span>
            )}
          </h1>
        </div>
        <div style={{ fontSize: 13, color: s.td }}>
          {stats.total} message{stats.total !== 1 ? "s" : ""} total
          {stats.todo > 0 && <> · <span style={{ color: s.gn }}>{stats.todo} todo{stats.todo !== 1 ? "s" : ""}</span></>}
          {stats.important > 0 && <> · <span style={{ color: s.am }}>{stats.important} important</span></>}
          {(stats.unrouted + stats.ambiguous) > 0 && <> · <span style={{ color: s.rs }}>{stats.unrouted + stats.ambiguous} need routing</span></>}
          {stats.noise > 0 && <> · <span style={{ color: s.td }}>{stats.noise} noise</span></>}
        </div>
      </div>

      {/* Reprocess banner — only if unclassified exists OR actively processing */}
      {(stats.unclassified > 0 || reprocessing || reprocessResult) && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ ...card, padding: "14px 16px", borderColor: reprocessing ? s.ac + "60" : s.am + "60", background: reprocessing ? `linear-gradient(90deg, ${s.ad}, transparent)` : `linear-gradient(90deg, ${s.amd}, transparent)` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: reprocessing ? s.ad : s.amd, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon d={I.sparkle} size={18} color={reprocessing ? s.ac : s.am} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {reprocessing && reprocessProgress ? (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: s.tx, marginBottom: 2 }}>
                      Classifying {reprocessProgress.done} of {reprocessProgress.total || stats.unclassified}…
                    </div>
                    <div style={{ fontSize: 11, color: s.tm }}>
                      {reprocessProgress.results.todo > 0 && <span style={{ color: s.gn, marginRight: 10 }}>✓ {reprocessProgress.results.todo} todo</span>}
                      {reprocessProgress.results.important > 0 && <span style={{ color: s.am, marginRight: 10 }}>⚠ {reprocessProgress.results.important} important</span>}
                      {reprocessProgress.results.noise > 0 && <span style={{ color: s.td, marginRight: 10 }}>· {reprocessProgress.results.noise} noise</span>}
                      {reprocessProgress.results.unrouted > 0 && <span style={{ color: s.rs, marginRight: 10 }}>? {reprocessProgress.results.unrouted} unrouted</span>}
                      {reprocessProgress.done === 0 && <span>Warming up…</span>}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: s.tx, marginBottom: 2 }}>
                      {stats.unclassified > 0
                        ? <>{stats.unclassified} message{stats.unclassified !== 1 ? "s" : ""} waiting to be classified</>
                        : <>All messages classified ✓</>}
                    </div>
                    <div style={{ fontSize: 11, color: s.tm }}>
                      {stats.unclassified > 0
                        ? <>These arrived before Claude was connected. Process them in batches of 8 (takes a few seconds).</>
                        : <>Nothing left to process.</>}
                    </div>
                  </>
                )}
              </div>
              {stats.unclassified > 0 && (
                <button onClick={reprocessUnclassified} disabled={reprocessing}
                  style={{ ...btn, background: reprocessing ? s.ac : s.am, color: s.bg, fontSize: 12, padding: "8px 16px", opacity: reprocessing ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                  {reprocessing ? (
                    <>
                      <span style={{ width: 10, height: 10, borderRadius: 5, border: `2px solid ${s.bg}`, borderTopColor: "transparent", animation: "spin 0.6s linear infinite", display: "inline-block" }} />
                      Processing…
                    </>
                  ) : `Process all ${stats.unclassified}`}
                </button>
              )}
            </div>

            {/* Progress bar */}
            {reprocessing && reprocessProgress && reprocessProgress.total > 0 && (
              <div style={{ marginTop: 12, height: 6, background: s.bg, borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  width: `${Math.min(100, (reprocessProgress.done / reprocessProgress.total) * 100)}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, ${s.ac}, ${s.gn})`,
                  transition: "width 0.4s ease",
                }} />
              </div>
            )}
          </div>

          {/* Final result toast */}
          {reprocessResult && !reprocessing && (
            <div style={{ marginTop: 8, padding: "10px 14px", background: reprocessResult.error ? s.rd : s.gd, borderRadius: 8, fontSize: 12, color: reprocessResult.error ? s.rs : s.gn, border: `1px solid ${reprocessResult.error ? s.rs : s.gn}40`, display: "flex", alignItems: "center", gap: 10 }}>
              <Icon d={reprocessResult.error ? I.alert : I.checkCircle} size={14} color={reprocessResult.error ? s.rs : s.gn} />
              <span style={{ flex: 1 }}>{reprocessResult.error ? reprocessResult.error : reprocessResult.message}</span>
              <button onClick={() => window.location.reload()} style={{ ...ghost, fontSize: 11, padding: "3px 10px", color: reprocessResult.error ? s.rs : s.gn, borderColor: (reprocessResult.error ? s.rs : s.gn) + "40" }}>Dismiss</button>
            </div>
          )}
        </div>
      )}

      {/* Filter tabs + search row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {tabs.map(t => {
          const active = typeFilter === t.k;
          return (
            <button key={t.k} onClick={() => setTypeFilter(t.k)}
              style={{
                padding: "7px 14px", borderRadius: 20,
                border: `1px solid ${active ? t.c + "80" : s.bd}`,
                background: active ? `${t.c}15` : s.sf,
                color: active ? t.c : s.tm,
                fontSize: 12, fontWeight: active ? 600 : 500,
                cursor: "pointer", fontFamily: s.f,
                display: "inline-flex", alignItems: "center", gap: 7,
                transition: "all 0.15s",
                ...(t.primary && !active && t.v > 0 ? { borderColor: t.c + "40" } : {}),
              }}>
              {t.l}
              {t.v > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  background: active ? t.c : `${t.c}25`,
                  color: active ? s.bg : t.c,
                  padding: "1px 7px", borderRadius: 10, minWidth: 16, textAlign: "center",
                }}>{t.v}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search + secondary filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", display: "flex", pointerEvents: "none" }}>
            <Icon d={I.search} size={14} color={s.td} />
          </span>
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search messages, contacts, reasoning… (press / to focus)"
            style={{ ...inp, paddingLeft: 36 }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")}
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
              <Icon d={I.x} size={13} color={s.td} />
            </button>
          )}
        </div>
        <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}
          style={{ ...inp, width: "auto", minWidth: 150, cursor: "pointer", fontSize: 12 }}>
          <option value="all">All clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          <option value="__unrouted">— Unrouted —</option>
        </select>
        <button onClick={() => setHideReviewed(!hideReviewed)}
          style={{
            ...ghost, fontSize: 12, padding: "9px 14px",
            background: hideReviewed ? s.ad : "transparent",
            color: hideReviewed ? s.ac : s.tm,
            borderColor: hideReviewed ? s.ac + "40" : s.bd,
            display: "flex", alignItems: "center", gap: 6,
          }}>
          {hideReviewed && <Icon d={I.check} size={13} color={s.ac} />}
          Hide reviewed
        </button>
      </div>

      {/* Message list */}
      {filtered.length === 0 ? (
        <EmptyFeedState stats={stats} typeFilter={typeFilter} searchQuery={searchQuery} clientFilter={clientFilter} setTypeFilter={setTypeFilter} setSearchQuery={setSearchQuery} setClientFilter={setClientFilter} setHideReviewed={setHideReviewed} hideReviewed={hideReviewed} />
      ) : (
        grouped.map(([date, msgs]) => (
          <div key={date} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: s.td, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 10, padding: "0 2px", display: "flex", alignItems: "center", gap: 10 }}>
              <span>{dateLabel(date)}</span>
              <span style={{ color: s.td, fontWeight: 500, letterSpacing: 0.5 }}>· {msgs.length}</span>
              <div style={{ flex: 1, height: 1, background: s.bd }} />
            </div>
            {msgs.map(m => (
              <MessageCard
                key={m.id}
                m={m}
                clients={clients}
                isExpanded={expandedId === m.id}
                onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)}
                editTodoText={editTodoText}
                setEditTodoText={setEditTodoText}
                editClientId={editClientId}
                setEditClientId={setEditClientId}
                markReviewed={markReviewed}
                reclassifyMessage={reclassifyMessage}
                promoteToTodo={promoteToTodo}
                setActiveId={setActiveId}
              />
            ))}
          </div>
        ))
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MESSAGE CARD — the hero atom of the feed
// ═══════════════════════════════════════════════════════════════════
function MessageCard({ m, clients, isExpanded, onToggle, editTodoText, setEditTodoText, editClientId, setEditClientId, markReviewed, reclassifyMessage, promoteToTodo, setActiveId }) {
  const cls = classMap[m.classification] || classMap.unclassified;
  const isReviewed = m.status === "reviewed";
  const clientName = m.client_name || (m.client_id && clients.find(c => c.id === m.client_id)?.name) || "";

  return (
    <div
      className="msg-card"
      style={{
        marginBottom: 8, background: s.sf,
        border: `1px solid ${s.bd}`,
        borderLeft: `3px solid ${cls.c}`,
        borderRadius: 10, opacity: isReviewed ? 0.55 : 1,
        overflow: "hidden",
      }}
    >
      {/* Collapsed row */}
      <div onClick={onToggle} style={{ padding: "12px 14px 10px", cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start" }}>
        {/* Classification circle */}
        <div style={{
          width: 32, height: 32, borderRadius: 16,
          background: cls.bg, display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, marginTop: 1,
        }}>
          <Icon d={cls.icon} size={14} color={cls.c} />
        </div>

        {/* Main column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Meta row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: cls.bg, color: cls.c, fontWeight: 700, letterSpacing: 0.5 }}>{cls.short}</span>
            <span style={{ fontSize: 13, color: s.tx, fontWeight: 600 }}>{m.contact || "Unknown"}</span>
            {clientName ? (
              <span onClick={(e) => { e.stopPropagation(); setActiveId(m.client_id); }}
                style={{ fontSize: 11, padding: "1px 8px", borderRadius: 4, background: s.ad, color: s.ac, fontWeight: 500, cursor: "pointer" }}>
                {clientName}
              </span>
            ) : m.classification === "internal" ? (
              <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 4, background: s.pd, color: s.pr, fontWeight: 500 }}>team</span>
            ) : (
              <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 4, background: s.rd, color: s.rs, fontWeight: 500 }}>no client</span>
            )}
            {m.conversation && <span style={{ fontSize: 11, color: s.td }}>in {m.conversation}</span>}
            <div style={{ flex: 1 }} />
            {isReviewed && <Icon d={I.checkCircle} size={12} color={s.gn} />}
            <span style={{ fontSize: 11, color: s.td }}>{fmtTime(m.timestamp)}</span>
          </div>

          {/* Message */}
          <div style={{
            fontSize: 14, color: s.tx, lineHeight: 1.5,
            display: "-webkit-box", WebkitLineClamp: isExpanded ? 99 : 2, WebkitBoxOrient: "vertical",
            overflow: "hidden", whiteSpace: "pre-wrap",
          }}>
            {m.message || <em style={{ color: s.td }}>(empty)</em>}
          </div>

          {/* Reasoning (always visible) */}
          {m.reasoning && (
            <div style={{ fontSize: 11, color: cls.c, marginTop: 6, display: "flex", alignItems: "flex-start", gap: 6, lineHeight: 1.5 }}>
              <Icon d={I.sparkle} size={11} color={cls.c} />
              <span style={{ fontStyle: "italic", flex: 1 }}>{m.reasoning}</span>
            </div>
          )}

          {/* Quick actions bar (visible on hover) */}
          <div className="hover-actions" style={{
            marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap",
            opacity: isExpanded ? 1 : 0, transition: "opacity 0.15s",
          }}>
            {!isReviewed && (
              <button onClick={(e) => { e.stopPropagation(); markReviewed(m.id); }}
                style={{ ...ghost, fontSize: 11, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4 }}>
                <Icon d={I.check} size={11} color={s.tm} />
                Mark reviewed
              </button>
            )}
            {!isExpanded && (
              <button onClick={(e) => { e.stopPropagation(); onToggle(); }}
                style={{ ...ghost, fontSize: 11, padding: "4px 10px", color: s.tm }}>
                More actions →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded panel */}
      {isExpanded && (
        <div style={{ padding: "14px 16px 16px", borderTop: `1px solid ${s.bd}`, background: s.bg, animation: "fadeIn 0.15s" }}>
          {/* Linked artifacts */}
          {(m.todo_ids || m.flagged_id) && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: s.td, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Created</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {m.todo_ids && m.todo_ids.split(",").filter(Boolean).map(tid => (
                  <span key={tid} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 4, background: s.gd, color: s.gn, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Icon d={I.clipboard} size={10} color={s.gn} />
                    Todo #{tid.slice(-4)}
                  </span>
                ))}
                {m.flagged_id && (
                  <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 4, background: s.amd, color: s.am, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Icon d={I.alert} size={10} color={s.am} />
                    Flagged #{m.flagged_id.slice(-4)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Promote to todo */}
          {m.classification !== "todo" && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: s.td, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Make a todo</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {!m.client_id && m.classification !== "internal" && (
                  <select value={editClientId} onChange={e => setEditClientId(e.target.value)} onClick={e => e.stopPropagation()}
                    style={{ ...inp, fontSize: 12, padding: "7px 10px", width: "auto", minWidth: 140, cursor: "pointer" }}>
                    <option value="">Pick client…</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                <input
                  value={editTodoText}
                  onChange={e => setEditTodoText(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  placeholder="Describe the todo…"
                  style={{ ...inp, fontSize: 12, padding: "7px 10px", flex: 1 }}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const cid = m.client_id || editClientId;
                    if (!cid) return;
                    promoteToTodo(m.id, cid, editTodoText);
                    setEditTodoText(""); setEditClientId("");
                  }}
                  disabled={!editTodoText.trim() || (!m.client_id && !editClientId)}
                  style={{ ...btn, background: s.gn, fontSize: 12, padding: "7px 14px", display: "flex", alignItems: "center", gap: 4, opacity: (editTodoText.trim() && (m.client_id || editClientId)) ? 1 : 0.4 }}>
                  <Icon d={I.arrow} size={12} color={s.bg} /> Add todo
                </button>
              </div>
            </div>
          )}

          {/* Reclassify */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: s.td, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Claude got it wrong?</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["todo", "important", "noise"].filter(c => c !== m.classification).map(c => {
                const alt = classMap[c];
                return (
                  <button key={c} onClick={(e) => { e.stopPropagation(); reclassifyMessage(m.id, c); }}
                    style={{ ...ghost, fontSize: 11, padding: "5px 10px", display: "flex", alignItems: "center", gap: 5, color: alt.c, borderColor: alt.c + "40" }}>
                    <Icon d={alt.icon} size={11} color={alt.c} />
                    Mark as {alt.l.toLowerCase()}
                  </button>
                );
              })}
              {!isReviewed && (
                <>
                  <div style={{ flex: 1 }} />
                  <button onClick={(e) => { e.stopPropagation(); markReviewed(m.id); }}
                    style={{ ...ghost, fontSize: 11, padding: "5px 10px", display: "flex", alignItems: "center", gap: 5, color: s.gn, borderColor: s.gn + "40" }}>
                    <Icon d={I.checkCircle} size={11} color={s.gn} />
                    Mark reviewed
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EMPTY STATES
// ═══════════════════════════════════════════════════════════════════
function EmptyState({ icon, title, hint }) {
  return (
    <div style={{ ...card, padding: 48, textAlign: "center", color: s.td, animation: "fadeIn 0.3s" }}>
      <div style={{ width: 48, height: 48, borderRadius: 24, background: s.bg, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
        <Icon d={icon || I.inbox} size={22} color={s.td} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: s.tm, marginBottom: 6 }}>{title}</div>
      {hint && <div style={{ fontSize: 12, color: s.td, lineHeight: 1.6 }}>{hint}</div>}
    </div>
  );
}

function EmptyFeedState({ stats, typeFilter, searchQuery, clientFilter, setTypeFilter, setSearchQuery, setClientFilter, setHideReviewed, hideReviewed }) {
  const hasFilters = typeFilter !== "all" || clientFilter !== "all" || searchQuery || hideReviewed;

  // No messages at all
  if (stats.total === 0) {
    return (
      <EmptyState
        icon={I.inbox}
        title="No messages yet"
        hint={<>As WhatsApp messages come in through your GHL webhook, they'll appear here within 30 seconds.<br/>Make sure your GHL webhook is pointing to <code style={{ color: s.ac }}>/.netlify/functions/ghl-webhook</code></>}
      />
    );
  }

  // All clear on "action" filter with no other filters → celebration
  if (typeFilter === "action" && !searchQuery && clientFilter === "all" && !hasFilters) {
    return (
      <div style={{ ...card, padding: 48, textAlign: "center", animation: "fadeIn 0.3s" }}>
        <div style={{ width: 56, height: 56, borderRadius: 28, background: s.gd, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <Icon d={I.checkCircle} size={28} color={s.gn} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: s.gn, marginBottom: 6 }}>All clear ✨</div>
        <div style={{ fontSize: 13, color: s.tm, marginBottom: 16 }}>Nothing in your inbox needs attention right now.</div>
        <button onClick={() => setTypeFilter("all")} style={{ ...ghost, fontSize: 12, padding: "7px 14px" }}>Show all {stats.total} messages</button>
      </div>
    );
  }

  // Filtered out
  return (
    <div style={{ ...card, padding: 40, textAlign: "center", color: s.td, animation: "fadeIn 0.3s" }}>
      <div style={{ width: 48, height: 48, borderRadius: 24, background: s.bg, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
        <Icon d={I.search} size={22} color={s.td} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: s.tm, marginBottom: 6 }}>No messages match</div>
      <div style={{ fontSize: 12, color: s.td, marginBottom: 16 }}>
        {searchQuery ? <>No results for "<span style={{ color: s.tx }}>{searchQuery}</span>"</> : "Try adjusting the filters"}
      </div>
      <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
        {searchQuery && <button onClick={() => setSearchQuery("")} style={{ ...ghost, fontSize: 11, padding: "5px 12px" }}>Clear search</button>}
        {typeFilter !== "all" && <button onClick={() => setTypeFilter("all")} style={{ ...ghost, fontSize: 11, padding: "5px 12px" }}>Show all types</button>}
        {clientFilter !== "all" && <button onClick={() => setClientFilter("all")} style={{ ...ghost, fontSize: 11, padding: "5px 12px" }}>All clients</button>}
        {hideReviewed && <button onClick={() => setHideReviewed(false)} style={{ ...ghost, fontSize: 11, padding: "5px 12px" }}>Show reviewed</button>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════
function Dashboard({ clients, messages, setActiveId }) {
  const allTodos = clients.flatMap(c => (c.todos || []).filter(t => !t.done).map(t => ({ ...t, clientName: c.name, clientId: c.id })));
  const allFlagged = clients.flatMap(c => (c.flagged || []).filter(f => f.status === "pending").map(f => ({ ...f, clientName: c.name })));

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: -0.8 }}>Dashboard</h1>
        <div style={{ fontSize: 13, color: s.td, marginTop: 4 }}>
          {allTodos.length} open todo{allTodos.length !== 1 ? "s" : ""} across {clients.length} clients
          {allFlagged.length > 0 && <span style={{ color: s.am }}> · {allFlagged.length} flagged</span>}
        </div>
      </div>

      {/* Client grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 20 }}>
        {clients.map(c => {
          const cOpen = (c.todos || []).filter(t => !t.done).length;
          const cFlag = (c.flagged || []).filter(f => f.status === "pending").length;
          const cMsg = (c.messages || []).filter(m => ACTION_CLASSES.includes(m.classification) && m.status !== "reviewed").length;
          const isQuiet = cOpen === 0 && cFlag === 0 && cMsg === 0;
          const brain = c.situation?.brain;
          const sentiment = brain?.sentiment?.tone;
          const sentimentColor = { positive: s.gn, neutral: s.ac, cautious: s.am, strained: s.rs }[sentiment] || null;
          return (
            <button key={c.id} onClick={() => setActiveId(c.id)}
              style={{ ...card, padding: 16, cursor: "pointer", textAlign: "left", transition: "all 0.15s", ...(isQuiet ? { opacity: 0.6 } : {}) }}
              onMouseEnter={e => e.currentTarget.style.borderColor = s.pr + "60"}
              onMouseLeave={e => e.currentTarget.style.borderColor = s.bd}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: s.tx, flex: 1 }}>{c.name}</span>
                {sentimentColor && (
                  <span title={`Sentiment: ${sentiment}`} style={{ width: 8, height: 8, borderRadius: 4, background: sentimentColor, flexShrink: 0 }} />
                )}
              </div>
              {brain?.headline && (
                <div style={{ fontSize: 12, color: s.tm, lineHeight: 1.45, marginBottom: 10, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {brain.headline}
                </div>
              )}
              <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                {cOpen > 0 ? (
                  <span style={{ color: s.ac }}><span style={{ fontWeight: 700 }}>{cOpen}</span> open</span>
                ) : (
                  <span style={{ color: s.td }}>0 open</span>
                )}
                {cFlag > 0 && <span style={{ color: s.am }}><span style={{ fontWeight: 700 }}>{cFlag}</span> flagged</span>}
                {cMsg > 0 && <span style={{ color: s.wa }}><span style={{ fontWeight: 700 }}>{cMsg}</span> new</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* All flagged */}
      {allFlagged.length > 0 && (
        <div style={{ ...card, borderColor: s.am + "40", padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Icon d={I.alert} size={14} color={s.am} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Flagged across all clients</span>
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
        {allTodos.length === 0 && <div style={{ color: s.td, fontSize: 13, padding: "16px 0", textAlign: "center" }}>All caught up ✓</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {allTodos.map(td => (
            <div key={td.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: s.bg, border: `1px solid ${s.bd}` }}>
              <button onClick={() => setActiveId(td.clientId)} style={{ fontSize: 11, padding: "1px 7px", borderRadius: 4, background: s.ad, color: s.ac, fontWeight: 600, flexShrink: 0, border: "none", cursor: "pointer", fontFamily: s.f }}>{td.clientName}</button>
              <span style={{ flex: 1, fontSize: 13 }}>{td.text}</span>
              {(td.recurring === "true" || td.recurring === true) && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: s.pd, color: s.pr, fontWeight: 600 }}>weekly</span>}
              <Badge source={td.source} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CLIENT VIEW
// ═══════════════════════════════════════════════════════════════════
function ClientView({ cl, open, pending, todo, setTodo, src, setSrc, isWeekly, setIsWeekly, addTodo, toggleTodo, delTodo, confirmFlag, dismissFlag, markReviewed, reclassifyMessage, promoteToTodo, reviveFlag, deleteFlag, setShowFathom, setFathomRes, setFathomText, setFathomClientId, regenerateBrain, brainRegenerating, brainError }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: -0.8 }}>{cl.name}</h1>
          <div style={{ fontSize: 13, color: s.td, marginTop: 4 }}>
            {open} open{pending > 0 && <span style={{ color: s.am }}> · {pending} flagged</span>}
            {(cl.messages || []).length > 0 && <span> · {(cl.messages || []).length} message{(cl.messages || []).length !== 1 ? "s" : ""}</span>}
          </div>
        </div>
        <button onClick={() => { setShowFathom(true); setFathomRes(null); setFathomText(""); setFathomClientId(cl?.id || null); }}
          style={{ ...ghost, fontSize: 12, padding: "7px 14px", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon d={I.video} size={14} color={s.tm} /> Upload meeting
        </button>
      </div>

      {/* Client Brain — always on top */}
      <ClientBrain cl={cl} regenerateBrain={regenerateBrain} brainRegenerating={brainRegenerating} brainError={brainError} />

      {/* Contacts */}
      {(cl.contacts || []).length > 0 && (
        <div style={{ ...card, padding: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <Icon d={I.user} size={14} color={s.td} />
            <span style={{ fontSize: 11, fontWeight: 700, color: s.td, textTransform: "uppercase", letterSpacing: 1.2 }}>Contacts</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {cl.contacts.map(x => (
              <span key={x.name} style={{ fontSize: 12, padding: "5px 11px", borderRadius: 20, background: x.role === "Main POC" ? s.ad : s.bg, color: x.role === "Main POC" ? s.ac : s.tm, border: `1px solid ${x.role === "Main POC" ? s.ac + "30" : s.bd}`, fontWeight: x.role === "Main POC" ? 600 : 500 }}>
                {x.name}{x.role === "Main POC" ? " ★" : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {(cl.flagged || []).length > 0 && <Flagged items={cl.flagged} confirmFlag={confirmFlag} dismissFlag={dismissFlag} />}

      {/* Todos */}
      <div style={{ ...card, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Icon d={I.clipboard} size={14} color={s.ac} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Todos</span>
          <span style={{ fontSize: 11, color: s.td, background: s.ad, padding: "1px 7px", borderRadius: 10 }}>{open}</span>
        </div>
        {cl.todos.filter(x => !x.done).length === 0 && <div style={{ color: s.td, fontSize: 13, padding: "16px 0", textAlign: "center" }}>No open todos ✓</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {cl.todos.filter(x => !x.done).map(td => (
            <div key={td.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, background: s.bg, border: `1px solid ${s.bd}` }}>
              <button onClick={() => toggleTodo(td.id, td.done)}
                style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${s.bl}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }} />
              <span style={{ flex: 1, fontSize: 13 }}>{td.text}</span>
              {(td.recurring === "true" || td.recurring === true) && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: s.pd, color: s.pr, fontWeight: 600 }}>weekly</span>}
              <Badge source={td.source} />
              <button onClick={() => delTodo(td.id)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 3, opacity: 0.35 }}>
                <Icon d={I.trash} size={13} color={s.rs} />
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 12, alignItems: "center" }}>
          <input value={todo} onChange={e => setTodo(e.target.value)} onKeyDown={e => e.key === "Enter" && addTodo()} placeholder="Add a todo…" style={{ ...inp, flex: 1, fontSize: 13, padding: "9px 14px" }} />
          <button onClick={() => setIsWeekly(!isWeekly)} title="Recurring weekly"
            style={{ ...ghost, fontSize: 11, padding: "7px 10px", background: isWeekly ? s.pd : "transparent", color: isWeekly ? s.pr : s.td, borderColor: isWeekly ? s.pr + "50" : s.bd }}>🔁</button>
          <select value={src} onChange={e => setSrc(e.target.value)}
            style={{ ...inp, width: "auto", minWidth: 100, cursor: "pointer", fontSize: 12, padding: "9px 10px" }}>
            <option value="manual">Manual</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="zoom">Zoom</option>
            <option value="ghl">GHL</option>
          </select>
          <button onClick={addTodo} style={{ ...btn, fontSize: 13, padding: "9px 16px" }}>Add</button>
        </div>
      </div>

      {(cl.messages || []).length > 0 && (
        <ClientMessages messages={cl.messages} clientId={cl.id} markReviewed={markReviewed} reclassifyMessage={reclassifyMessage} promoteToTodo={promoteToTodo} />
      )}

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

// ═══════════════════════════════════════════════════════════════════
// CLIENT BRAIN — living situation document, 7 sections
// ═══════════════════════════════════════════════════════════════════
function ClientBrain({ cl, regenerateBrain, brainRegenerating, brainError }) {
  const situation = cl.situation;
  const brain = situation?.brain;
  const hasBrain = !!brain && !!brain.headline;

  // Count messages since last regen to decide if button should nudge
  const currentMsgCount = (cl.messages || []).length;
  const lastCount = situation?.message_count_at_update || 0;
  const newSinceLast = Math.max(0, currentMsgCount - lastCount);
  const isStale = situation?.updated_at
    ? (Date.now() - new Date(situation.updated_at).getTime()) > 20 * 60 * 60 * 1000
    : true;

  // Empty state — no brain yet
  if (!hasBrain && !brainRegenerating) {
    return (
      <div style={{ ...card, padding: 20, marginBottom: 16, borderStyle: "dashed", background: `linear-gradient(135deg, ${s.sf}, ${s.bg})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: s.pd, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon d={I.brain} size={20} color={s.pr} strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: s.tx, marginBottom: 2 }}>Generate the Client Brain</div>
            <div style={{ fontSize: 12, color: s.tm, lineHeight: 1.5 }}>
              A living summary of this client — current focus, recent mentions, open threads, ideas, decisions, risks, and sentiment.
              Auto-refreshes daily. Click to generate the first one.
            </div>
          </div>
          <button onClick={() => regenerateBrain(cl.id)} disabled={brainRegenerating}
            style={{ ...btn, background: s.pr, color: s.bg, fontSize: 12, padding: "9px 16px", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            <Icon d={I.sparkle} size={13} color={s.bg} />
            Generate brain
          </button>
        </div>
        {brainError && (
          <div style={{ marginTop: 10, padding: "8px 12px", background: s.rd, borderRadius: 6, fontSize: 11, color: s.rs, border: `1px solid ${s.rs}40` }}>
            {brainError}
          </div>
        )}
      </div>
    );
  }

  // Loading state (regenerating for the first time)
  if (!hasBrain && brainRegenerating) {
    return (
      <div style={{ ...card, padding: 24, marginBottom: 16, textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, color: s.pr, fontSize: 13 }}>
          <span style={{ width: 14, height: 14, borderRadius: 7, border: `2px solid ${s.pr}`, borderTopColor: "transparent", animation: "spin 0.6s linear infinite" }} />
          Building the brain from {currentMsgCount} message{currentMsgCount !== 1 ? "s" : ""}…
        </div>
      </div>
    );
  }

  // Full brain rendering
  const sentiment = brain.sentiment || { tone: "neutral", note: "" };
  const sentimentColor = {
    positive: s.gn,
    neutral: s.ac,
    cautious: s.am,
    strained: s.rs,
  }[sentiment.tone] || s.ac;

  const hasAnyContent =
    (brain.current_focus || []).length > 0 ||
    (brain.recent_mentions || []).length > 0 ||
    (brain.open_threads || []).length > 0 ||
    (brain.parked_ideas || []).length > 0 ||
    (brain.decisions || []).length > 0 ||
    (brain.risks || []).length > 0;

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Hero banner */}
      <div style={{
        ...card,
        padding: "18px 20px",
        marginBottom: (brain.risks || []).length > 0 ? 8 : 12,
        background: `linear-gradient(135deg, ${s.pd}, ${s.sf})`,
        borderColor: s.pr + "40",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: s.pd, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1px solid ${s.pr}40` }}>
            <Icon d={I.brain} size={20} color={s.pr} strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: s.pr, textTransform: "uppercase", letterSpacing: 1.5 }}>Client Brain</span>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                background: `${sentimentColor}20`, color: sentimentColor,
                textTransform: "capitalize",
              }}>{sentiment.tone}</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: s.tx, lineHeight: 1.45, marginBottom: sentiment.note ? 4 : 0 }}>
              {brain.headline || "No headline"}
            </div>
            {sentiment.note && (
              <div style={{ fontSize: 12, color: s.tm, lineHeight: 1.5, fontStyle: "italic" }}>
                {sentiment.note}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 11, color: s.td }}>
              {situation?.updated_at && (
                <>
                  <Icon d={I.clock} size={11} color={s.td} />
                  <span>Updated {fmtTime(situation.updated_at)}</span>
                  <span>·</span>
                  <span>{lastCount} message{lastCount !== 1 ? "s" : ""} analysed</span>
                  {newSinceLast > 0 && <span style={{ color: s.am }}>· {newSinceLast} new since</span>}
                  {isStale && newSinceLast === 0 && <span style={{ color: s.td }}>· stale</span>}
                </>
              )}
            </div>
          </div>
          <button onClick={() => regenerateBrain(cl.id)} disabled={brainRegenerating}
            style={{ ...ghost, fontSize: 11, padding: "6px 12px", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", flexShrink: 0, color: s.pr, borderColor: s.pr + "40" }}>
            {brainRegenerating ? (
              <>
                <span style={{ width: 10, height: 10, borderRadius: 5, border: `2px solid ${s.pr}`, borderTopColor: "transparent", animation: "spin 0.6s linear infinite" }} />
                Regenerating…
              </>
            ) : (
              <>
                <Icon d={I.refresh} size={11} color={s.pr} />
                Regenerate
              </>
            )}
          </button>
        </div>
      </div>

      {brainError && (
        <div style={{ marginBottom: 12, padding: "8px 12px", background: s.rd, borderRadius: 6, fontSize: 11, color: s.rs, border: `1px solid ${s.rs}40` }}>
          {brainError}
        </div>
      )}

      {!hasAnyContent ? (
        <div style={{ ...card, padding: 20, textAlign: "center", color: s.td, fontSize: 12 }}>
          Not enough activity yet to fill in sections. Try again after a few more messages.
        </div>
      ) : (
        <>
          {/* Risks — shown first if present, red accent */}
          {(brain.risks || []).length > 0 && (
            <BrainSection
              title="Risks to watch"
              icon={I.shield}
              accent={s.rs}
              count={brain.risks.length}
              items={brain.risks}
              renderItem={(r, i) => (
                <div key={i} style={{ padding: "10px 12px", background: s.bg, borderRadius: 8, border: `1px solid ${s.rs}30`, borderLeft: `3px solid ${s.rs}`, display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10,
                    background: r.severity === "high" ? s.rd : r.severity === "low" ? s.gd : s.amd,
                    color: r.severity === "high" ? s.rs : r.severity === "low" ? s.gn : s.am,
                    textTransform: "uppercase", letterSpacing: 0.5, flexShrink: 0, marginTop: 2,
                  }}>{r.severity || "med"}</span>
                  <span style={{ fontSize: 13, color: s.tx, flex: 1, lineHeight: 1.5 }}>{r.risk}</span>
                </div>
              )}
            />
          )}

          {/* 2-column grid: focus + threads top, mentions + ideas below */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 10, marginBottom: 10 }}>
            {/* Current focus */}
            {(brain.current_focus || []).length > 0 && (
              <BrainSection
                title="Current focus"
                icon={I.target}
                accent={s.gn}
                count={brain.current_focus.length}
                items={brain.current_focus}
                renderItem={(f, i) => (
                  <div key={i} style={{ padding: "10px 12px", background: s.bg, borderRadius: 8, border: `1px solid ${s.bd}`, borderLeft: `3px solid ${s.gn}` }}>
                    <div style={{ fontSize: 13, color: s.tx, fontWeight: 600, marginBottom: f.detail ? 3 : 0, lineHeight: 1.4 }}>{f.title}</div>
                    {f.detail && <div style={{ fontSize: 12, color: s.tm, lineHeight: 1.5 }}>{f.detail}</div>}
                  </div>
                )}
              />
            )}

            {/* Open threads */}
            {(brain.open_threads || []).length > 0 && (
              <BrainSection
                title="Open threads"
                icon={I.msgCircle}
                accent={s.am}
                count={brain.open_threads.length}
                items={brain.open_threads}
                renderItem={(t, i) => {
                  const waiting = (t.waiting_on || "").toLowerCase();
                  const waitLabel = waiting === "us" ? "⏳ we owe them" : waiting === "them" ? "⌛ they owe us" : waiting === "both" ? "↔ both" : "";
                  const waitColor = waiting === "us" ? s.am : waiting === "them" ? s.ac : s.tm;
                  return (
                    <div key={i} style={{ padding: "10px 12px", background: s.bg, borderRadius: 8, border: `1px solid ${s.bd}`, borderLeft: `3px solid ${s.am}` }}>
                      <div style={{ fontSize: 13, color: s.tx, marginBottom: 4, lineHeight: 1.4 }}>{t.thread}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                        {waitLabel && <span style={{ color: waitColor, fontWeight: 600 }}>{waitLabel}</span>}
                        {t.since && <span style={{ color: s.td }}>· since {t.since}</span>}
                      </div>
                    </div>
                  );
                }}
              />
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 10, marginBottom: 10 }}>
            {/* Recent mentions */}
            {(brain.recent_mentions || []).length > 0 && (
              <BrainSection
                title="Recent mentions"
                icon={I.at}
                accent={s.ac}
                count={brain.recent_mentions.length}
                items={brain.recent_mentions}
                renderItem={(m, i) => (
                  <div key={i} style={{ padding: "10px 12px", background: s.bg, borderRadius: 8, border: `1px solid ${s.bd}`, borderLeft: `3px solid ${s.ac}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 4, background: s.ad, color: s.ac, fontWeight: 600 }}>{m.contact || "—"}</span>
                      {m.when && <span style={{ fontSize: 10, color: s.td }}>{m.when}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: s.tx, lineHeight: 1.5 }}>{m.mention}</div>
                  </div>
                )}
              />
            )}

            {/* Parked ideas */}
            {(brain.parked_ideas || []).length > 0 && (
              <BrainSection
                title="Parked ideas"
                icon={I.lightbulb}
                accent={s.pr}
                count={brain.parked_ideas.length}
                items={brain.parked_ideas}
                renderItem={(p, i) => (
                  <div key={i} style={{ padding: "10px 12px", background: s.bg, borderRadius: 8, border: `1px solid ${s.bd}`, borderLeft: `3px solid ${s.pr}` }}>
                    <div style={{ fontSize: 13, color: s.tx, lineHeight: 1.4, marginBottom: p.raised_by ? 3 : 0 }}>{p.idea}</div>
                    {p.raised_by && <div style={{ fontSize: 11, color: s.td }}>raised by {p.raised_by}</div>}
                  </div>
                )}
              />
            )}
          </div>

          {/* Decisions — full width, muted */}
          {(brain.decisions || []).length > 0 && (
            <BrainSection
              title="Decisions"
              icon={I.gavel}
              accent={s.tm}
              count={brain.decisions.length}
              items={brain.decisions}
              renderItem={(d, i) => (
                <div key={i} style={{ padding: "8px 12px", background: s.bg, borderRadius: 8, border: `1px solid ${s.bd}`, display: "flex", alignItems: "center", gap: 10 }}>
                  <Icon d={I.check} size={12} color={s.gn} />
                  <span style={{ fontSize: 13, color: s.tx, flex: 1, lineHeight: 1.4 }}>{d.decision}</span>
                  {d.when && <span style={{ fontSize: 11, color: s.td, flexShrink: 0 }}>{d.when}</span>}
                </div>
              )}
            />
          )}
        </>
      )}
    </div>
  );
}

// A labelled section within the brain
function BrainSection({ title, icon, accent, count, items, renderItem }) {
  return (
    <div style={{ ...card, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Icon d={icon} size={13} color={accent} />
        <span style={{ fontSize: 11, fontWeight: 700, color: s.td, textTransform: "uppercase", letterSpacing: 1.2 }}>{title}</span>
        <span style={{ fontSize: 10, color: accent, background: `${accent}20`, padding: "1px 7px", borderRadius: 10, fontWeight: 700 }}>{count}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {items.map(renderItem)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CLIENT MESSAGES (per-client feed)
// ═══════════════════════════════════════════════════════════════════
function ClientMessages({ messages, clientId, markReviewed, reclassifyMessage, promoteToTodo }) {
  const [expandedId, setExpandedId] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [editTodoText, setEditTodoText] = useState("");
  const [editClientId, setEditClientId] = useState("");

  const filtered = typeFilter === "all" ? messages : messages.filter(m => m.classification === typeFilter);

  return (
    <div style={{ ...card, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Icon d={I.chat} size={14} color={s.wa} />
        <span style={{ fontSize: 14, fontWeight: 600 }}>Recent messages</span>
        <span style={{ fontSize: 11, color: s.td, background: `${s.wa}20`, padding: "1px 7px", borderRadius: 10 }}>{messages.length}</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 4 }}>
          {["all", "todo", "important", "noise"].map(k => {
            const active = typeFilter === k;
            const cls = k === "all" ? { c: s.ac, l: "All" } : classMap[k];
            return (
              <button key={k} onClick={() => setTypeFilter(k)}
                style={{ padding: "4px 10px", borderRadius: 20, border: `1px solid ${active ? cls.c + "60" : s.bd}`, background: active ? `${cls.c}15` : "transparent", color: active ? cls.c : s.tm, fontSize: 11, fontWeight: active ? 600 : 500, cursor: "pointer", fontFamily: s.f }}>
                {cls.l}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ color: s.td, fontSize: 12, padding: "16px 0", textAlign: "center" }}>No messages match this filter</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.slice(0, 30).map(m => (
            <MessageCard
              key={m.id}
              m={m}
              clients={[]}
              isExpanded={expandedId === m.id}
              onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)}
              editTodoText={editTodoText}
              setEditTodoText={setEditTodoText}
              editClientId={editClientId}
              setEditClientId={setEditClientId}
              markReviewed={markReviewed}
              reclassifyMessage={reclassifyMessage}
              promoteToTodo={promoteToTodo}
              setActiveId={() => {}}
            />
          ))}
        </div>
      )}
      {filtered.length > 30 && (
        <div style={{ fontSize: 11, color: s.td, textAlign: "center", marginTop: 10 }}>Showing 30 of {filtered.length} — check Live Feed for older</div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FLAGGED (review queue)
// ═══════════════════════════════════════════════════════════════════
function Flagged({ items, confirmFlag, dismissFlag }) {
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const pend = items.filter(x => x.status === "pending");
  if (pend.length === 0) return null;

  return (
    <div style={{ ...card, borderColor: s.am + "40", padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Icon d={I.alert} size={14} color={s.am} />
        <span style={{ fontSize: 14, fontWeight: 600 }}>Flagged for review</span>
        <span style={{ fontSize: 11, color: s.bg, background: s.am, padding: "1px 7px", borderRadius: 10, fontWeight: 700 }}>{pend.length}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {pend.map(msg => (
          <div key={msg.id} style={{ padding: "10px 12px", borderRadius: 8, background: s.bg, border: `1px solid ${s.am}30` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{msg.contact}</span>
              <span style={{ fontSize: 10, color: s.td }}>{msg.timestamp ? new Date(msg.timestamp).toLocaleDateString("en-SG", { day: "numeric", month: "short" }) : ""}</span>
            </div>
            <div style={{ fontSize: 13, color: s.tm, marginBottom: 8, lineHeight: 1.5 }}>"{(msg.message || "").slice(0, 160)}{(msg.message || "").length > 160 ? "…" : ""}"</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              {editId === msg.id ? (
                <>
                  <input value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { confirmFlag(msg.id, editText); setEditId(null); }}}
                    placeholder="Todo text…" style={{ ...inp, flex: 1, fontSize: 12, padding: "7px 12px", minWidth: 200 }} autoFocus />
                  <button onClick={() => { confirmFlag(msg.id, editText); setEditId(null); }} style={{ ...btn, fontSize: 11, padding: "6px 12px" }}>Add</button>
                  <button onClick={() => setEditId(null)} style={{ ...ghost, fontSize: 11, padding: "6px 10px" }}>✕</button>
                </>
              ) : (
                <>
                  <button onClick={() => { setEditId(msg.id); setEditText(msg.summary || ""); }}
                    style={{ ...btn, fontSize: 11, padding: "6px 12px", background: s.gn, display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon d={I.arrow} size={11} color={s.bg} /> Make todo
                  </button>
                  <button onClick={() => dismissFlag(msg.id)} style={{ ...ghost, fontSize: 11, padding: "6px 12px", color: s.rs, borderColor: s.rd }}>Dismiss</button>
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

// ═══════════════════════════════════════════════════════════════════
// ARCHIVE
// ═══════════════════════════════════════════════════════════════════
function Archive({ doneTodos, resolvedFlags, reviveTodo, reviveFlag, deleteTodo, deleteFlag }) {
  const [expanded, setExpanded] = useState(false);
  const total = doneTodos.length + resolvedFlags.length;
  if (total === 0) return null;

  return (
    <div style={{ ...card, opacity: 0.65, borderStyle: "dashed", padding: 14 }}>
      <button onClick={() => setExpanded(!expanded)}
        style={{ background: "none", border: "none", cursor: "pointer", fontFamily: s.f, display: "flex", alignItems: "center", gap: 8, width: "100%", padding: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: s.td }}>{expanded ? "▾" : "▸"} Archive</span>
        <span style={{ fontSize: 11, color: s.td, background: `${s.td}20`, padding: "1px 7px", borderRadius: 10 }}>{total}</span>
        <span style={{ fontSize: 10, color: s.td, marginLeft: "auto" }}>Clears Sunday</span>
      </button>
      {expanded && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
          {doneTodos.map(td => (
            <div key={td.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6 }}>
              <Icon d={I.check} size={12} color={s.gn} />
              <span style={{ flex: 1, fontSize: 12, textDecoration: "line-through", color: s.tm }}>{td.text}</span>
              <Badge source={td.source} />
              <button onClick={() => reviveTodo(td.id)} style={{ ...ghost, fontSize: 10, padding: "3px 8px" }}>Revive</button>
              <button onClick={() => deleteTodo(td.id)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2, opacity: 0.5 }}>
                <Icon d={I.trash} size={12} color={s.rs} />
              </button>
            </div>
          ))}
          {resolvedFlags.map(f => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6 }}>
              <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: f.status === "confirmed" ? s.gd : s.rd, color: f.status === "confirmed" ? s.gn : s.rs, fontWeight: 600 }}>
                {f.status === "confirmed" ? "added" : "dismissed"}
              </span>
              <span style={{ flex: 1, fontSize: 12, color: s.tm }}>"{(f.message || "").slice(0, 50)}{(f.message || "").length > 50 ? "…" : ""}"</span>
              <button onClick={() => reviveFlag(f.id)} style={{ ...ghost, fontSize: 10, padding: "3px 8px" }}>Revive</button>
              <button onClick={() => deleteFlag(f.id)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2, opacity: 0.5 }}>
                <Icon d={I.trash} size={12} color={s.rs} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FATHOM MODAL
// ═══════════════════════════════════════════════════════════════════
function FathomModal({ clients, fathomText, setFathomText, fathomBusy, fathomRes, setFathomRes, fathomClientId, setFathomClientId, processFathom, applyFathom, close }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20, animation: "fadeIn 0.2s" }}>
      <div style={{ background: s.sf, borderRadius: 16, border: `1px solid ${s.bd}`, padding: 28, maxWidth: 600, width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
            <Icon d={I.video} size={20} color={s.ac} /> Upload meeting notes
          </h3>
          <button onClick={close} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
            <Icon d={I.x} size={20} color={s.tm} />
          </button>
        </div>
        <div style={{ fontSize: 13, color: s.tm, marginBottom: 12 }}>Select client and paste transcript.</div>

        {!fathomRes ? (
          <>
            <select value={fathomClientId || ""} onChange={e => setFathomClientId(e.target.value)} style={{ ...inp, marginBottom: 12, cursor: "pointer" }}>
              {clients.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            <textarea value={fathomText} onChange={e => setFathomText(e.target.value)} placeholder="Paste transcript here…" style={{ ...inp, minHeight: 200, resize: "vertical", lineHeight: 1.6 }} />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={close} style={{ ...ghost, flex: 1 }}>Cancel</button>
              <button onClick={processFathom} disabled={fathomBusy || !fathomText.trim()} style={{ ...btn, flex: 1, opacity: fathomBusy || !fathomText.trim() ? 0.5 : 1 }}>
                {fathomBusy ? "Claude is reading…" : "Extract todos"}
              </button>
            </div>
          </>
        ) : fathomRes.error ? (
          <div>
            <div style={{ background: s.rd, borderRadius: 10, padding: 16, color: s.rs, fontSize: 13, marginBottom: 16 }}>Error: {fathomRes.error}</div>
            <button onClick={() => setFathomRes(null)} style={{ ...ghost, width: "100%" }}>Try again</button>
          </div>
        ) : (
          <div>
            {fathomRes.summary && (
              <div style={{ background: s.bg, borderRadius: 10, padding: 14, marginBottom: 16, border: `1px solid ${s.bd}` }}>
                <div style={{ fontSize: 10, color: s.td, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Summary</div>
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
            <button onClick={applyFathom} style={{ ...btn, width: "100%" }}>Done — refresh</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SHORTCUTS MODAL
// ═══════════════════════════════════════════════════════════════════
function ShortcutsModal({ close }) {
  const shortcuts = [
    { k: "/", desc: "Focus search" },
    { k: "r", desc: "Refresh data" },
    { k: "g", desc: "Go to Live Feed" },
    { k: "?", desc: "Show this help" },
    { k: "Esc", desc: "Close dialogs" },
  ];
  return (
    <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20, animation: "fadeIn 0.15s" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: s.sf, borderRadius: 14, border: `1px solid ${s.bd}`, padding: 24, maxWidth: 420, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon d={I.kbd} size={16} color={s.ac} /> Keyboard shortcuts
          </h3>
          <button onClick={close} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
            <Icon d={I.x} size={18} color={s.tm} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {shortcuts.map(sh => (
            <div key={sh.k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: s.bg }}>
              <span style={{ fontSize: 13, color: s.tx }}>{sh.desc}</span>
              <kbd style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: s.sf, border: `1px solid ${s.bd}`, color: s.tm, fontFamily: "ui-monospace, monospace", fontWeight: 600, minWidth: 24, textAlign: "center" }}>{sh.k}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
