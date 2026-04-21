const { appendRow } = require("./utils/sheets");

// ============================================================
// HARDCODED CLIENT MEMORY
// Every inbound WhatsApp message from Leadly HQ gets routed here.
// Matching is fuzzy: handles missing spaces ("yeotongboon" = "Yeo Tong Boon")
// and typos ("Deevik" = "Deevak").
// ============================================================

const CLIENTS = {
  "axis-001": {
    name: "Axis Collective",
    // Matched against group chat / conversation name
    groupAliases: ["axis collective", "axis", "legacy planners", "legacy"],
    contacts: [
      { canonical: "Legacy Planners", aliases: ["legacy planners", "legacy"] },
      { canonical: "Joel",             aliases: ["joel"] },
      { canonical: "Damien",           aliases: ["damien", "damian"] },
    ],
  },
  "homeup-001": {
    name: "HomeUp",
    groupAliases: ["homeup", "home up"],
    contacts: [
      { canonical: "Tong Boon", aliases: ["tong boon", "tongboon", "yeo tong boon", "yeotongboon", "yeotb"] },
      { canonical: "Deevak",    aliases: ["deevak", "deevik", "deevek", "deevok"] },
    ],
  },
  "aaro-001": {
    name: "AARO",
    groupAliases: ["aaro"],
    contacts: [
      { canonical: "Joann",  aliases: ["joann", "joanne"] },
      { canonical: "Mavis",  aliases: ["mavis"] },
      { canonical: "Carrin", aliases: ["carrin", "karrin", "karin"] },
    ],
  },
  "aether-001": {
    name: "Aether Athletics",
    groupAliases: ["aether athletics", "aether"],
    contacts: [
      { canonical: "Dave", aliases: ["dave", "david"] },
    ],
  },
};

// ============================================================
// TEAM MEMBERS — internal colleagues / partners, NOT clients.
// If they message inside a client group chat, the group route wins.
// If they message alone (direct), we tag the message "internal" and
// skip Claude entirely — no todos, no flags, just logged to MESSAGES.
// ============================================================

const TEAM_MEMBERS = [
  { canonical: "Matt", aliases: ["matt", "matthew"] },
];

// ============================================================
// FUZZY MATCHING
// ============================================================

// Strip everything except letters + digits, lowercase
const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Levenshtein distance — iterative, memory-efficient (single row)
function lev(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

// True if haystack contains a substring approximately matching needle.
// - Exact-only for short needles (≤4 chars) to avoid false positives (Dave ≠ Dove)
// - 1 edit allowed for medium needles (5-6 chars)
// - 2 edits allowed for longer needles (7+)
function fuzzyIncludes(haystack, needle) {
  if (!haystack || !needle) return false;
  if (haystack.includes(needle)) return true;
  if (needle.length <= 4) return false;

  const threshold = needle.length <= 6 ? 1 : 2;
  const minLen = Math.max(3, needle.length - threshold);
  const maxLen = needle.length + threshold;

  for (let winLen = minLen; winLen <= maxLen; winLen++) {
    for (let i = 0; i + winLen <= haystack.length; i++) {
      if (lev(haystack.slice(i, i + winLen), needle) <= threshold) return true;
    }
  }
  return false;
}

// ============================================================
// ROUTING
// ============================================================

function routeMessage(contactName, conversationName) {
  const convN = norm(conversationName);
  const contactN = norm(contactName);

  // 1. Group chat name first (most reliable signal). This intentionally runs
  //    BEFORE the team-member check — if Matt messages in a client group,
  //    the message belongs to that client, not to "internal".
  for (const [clientId, client] of Object.entries(CLIENTS)) {
    for (const alias of client.groupAliases || []) {
      const a = norm(alias);
      if (a && convN.includes(a)) {
        return { clientId, matchType: "group", matchedOn: alias };
      }
    }
  }

  // 2. Team member match — Matt/Matthew messaging outside a client group
  //    is internal chatter, not a client conversation.
  for (const member of TEAM_MEMBERS) {
    for (const alias of member.aliases) {
      const a = norm(alias);
      if (!a) continue;
      if (fuzzyIncludes(contactN, a)) {
        return { clientId: "team", matchType: "team", matchedOn: member.canonical, member: member.canonical };
      }
    }
  }

  // 3. Client contact name match (with fuzzy)
  const hits = [];
  for (const [clientId, client] of Object.entries(CLIENTS)) {
    for (const contact of client.contacts) {
      for (const alias of contact.aliases) {
        const a = norm(alias);
        if (!a) continue;
        if (fuzzyIncludes(contactN, a)) {
          hits.push({ clientId, canonical: contact.canonical, matchedOn: alias });
          break; // one alias hit is enough per contact
        }
      }
    }
  }

  if (hits.length === 0) return null;

  // De-duplicate by clientId — if all hits point to same client, not ambiguous
  const uniqueClients = [...new Set(hits.map(h => h.clientId))];
  if (uniqueClients.length === 1) {
    return { clientId: hits[0].clientId, matchType: "contact", matchedOn: hits[0].canonical };
  }

  // Multiple clients possible — ambiguous
  return {
    clientId: "ambiguous",
    matchType: "ambiguous",
    candidates: hits.map(h => ({ client: CLIENTS[h.clientId].name, contact: h.canonical })),
  };
}

// ============================================================
// WEBHOOK HANDLER
// ============================================================

const sid = (suffix = "") =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 5) + suffix;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "POST only" };

  try {
    const p = JSON.parse(event.body);

    const contactName = p.contactName || p.contact_name || p.contact?.name || "Unknown";
    const contactPhone = p.contactPhone || p.contact_phone || p.contact?.phone || "";
    const messageBody = p.messageBody || p.message_body || p.body || p.message?.body || "";
    const conversationName = p.conversationName || p.conversation_name || "";
    const direction = p.direction || "inbound";

    // Skip empty or outbound
    if (!messageBody || direction === "outbound") {
      return { statusCode: 200, body: JSON.stringify({ status: "skipped" }) };
    }

    const now = new Date().toISOString();
    const today = now.split("T")[0];

    const route = routeMessage(contactName, conversationName);
    const clientId = route?.clientId || null;
    const clientName = clientId && CLIENTS[clientId] ? CLIENTS[clientId].name : "";
    const msgId = sid();

    // ──────────────────────────────────────────────────────────
    // Case 0: Internal team member (Matt/Matthew messaging alone).
    // Log as "internal". No Claude call, no todo, no flag.
    // ──────────────────────────────────────────────────────────
    if (clientId === "team") {
      const reason = `Message from team member ${route.member || contactName}`;
      await appendRow("MESSAGES", [
        msgId, now, "", "",
        contactName, contactPhone, conversationName, direction,
        messageBody, "internal", reason,
        "", "", "new",
      ]);
      return { statusCode: 200, body: JSON.stringify({ status: "internal", member: route.member }) };
    }

    // ──────────────────────────────────────────────────────────
    // Case A: Couldn't route — log + flag, skip Claude
    // ──────────────────────────────────────────────────────────
    if (!clientId || clientId === "ambiguous") {
      let reason, classification;
      if (clientId === "ambiguous") {
        const cands = (route.candidates || []).map(c => `${c.contact} (${c.client})`).join(" or ");
        reason = `Ambiguous contact "${contactName}" — could be ${cands}`;
        classification = "ambiguous";
      } else {
        reason = `Unknown contact "${contactName}"${conversationName ? ` in "${conversationName}"` : ""} — no matching client`;
        classification = "unrouted";
      }
      const flaggedId = sid("f");

      await appendRow("MESSAGES", [
        msgId, now, "", "",
        contactName, contactPhone, conversationName, direction,
        messageBody, classification, reason,
        "", flaggedId, "new",
      ]);

      await appendRow("FLAGGED", [
        flaggedId, clientId === "ambiguous" ? "" : "unknown",
        contactName, messageBody,
        `Message from ${contactName}`, reason,
        now, "pending",
      ]);

      return { statusCode: 200, body: JSON.stringify({ status: "flagged", classification, reason }) };
    }

    // ──────────────────────────────────────────────────────────
    // Case B: Client identified — ask Claude to classify
    // ──────────────────────────────────────────────────────────
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // No API key — don't silently drop. Flag as important so it's visible.
      const flaggedId = sid("f");
      await appendRow("MESSAGES", [
        msgId, now, clientId, clientName,
        contactName, contactPhone, conversationName, direction,
        messageBody, "important", "Auto-classification unavailable — API key not configured",
        "", flaggedId, "new",
      ]);
      await appendRow("FLAGGED", [
        flaggedId, clientId, contactName, messageBody,
        "Message not auto-classified", "ANTHROPIC_API_KEY missing — please configure on Netlify and run /reprocess-messages",
        now, "pending",
      ]);
      return { statusCode: 200, body: JSON.stringify({ status: "logged_fallback", warning: "no API key" }) };
    }

    const prompt = `You are a marketing agency assistant for Leadly (Singapore). Client "${clientName}" — contact "${contactName}" sent this WhatsApp message${conversationName ? ` in group "${conversationName}"` : ""}:

"${messageBody}"

Classify this message into ONE of three buckets:

1. "todo" — a clear, actionable task the Leadly team needs to do (e.g. "Can you update the ad copy?", "Please send the report", "Add this to the website")
2. "important" — not a clear todo, but something that needs a human to review: questions, concerns, complaints, strategic feedback, decisions to be made, pricing/billing mentions, ambiguity worth checking
3. "noise" — chitchat, thanks, emoji, confirmations like "ok", "got it", "sounds good", greetings, small talk

When in doubt between important and noise, pick important.

Respond ONLY valid JSON, no markdown:
{
  "classification": "todo" | "important" | "noise",
  "reasoning": "one short sentence explaining why (max 15 words)",
  "todos": [{"text":"...","urgency":"high|medium|low","category":"ads|reporting|website|billing|general"}],
  "summary": "short summary if important (empty if todo or noise)",
  "flagReason": "why it needs review if important (empty otherwise)"
}`;

    let data, txt;
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      data = await r.json();
      if (!data || !data.content) {
        throw new Error(data?.error?.message || `HTTP ${r.status}`);
      }
      txt = data.content.filter(b => b.type === "text").map(b => b.text).join("");
    } catch (apiErr) {
      // Claude API failed — fall back to "important" so it's visible
      const flaggedId = sid("f");
      await appendRow("MESSAGES", [
        msgId, now, clientId, clientName,
        contactName, contactPhone, conversationName, direction,
        messageBody, "important", `Claude API error: ${apiErr.message}`,
        "", flaggedId, "new",
      ]);
      await appendRow("FLAGGED", [
        flaggedId, clientId, contactName, messageBody,
        "Auto-classification failed", `API error — needs manual review: ${apiErr.message}`,
        now, "pending",
      ]);
      return { statusCode: 200, body: JSON.stringify({ status: "api_error", error: apiErr.message }) };
    }

    let result;
    try {
      result = JSON.parse(txt.replace(/```json|```/g, "").trim());
    } catch (e) {
      // Claude returned bad JSON — log as important + flag so user reviews it
      const flaggedId = sid("f");
      await appendRow("MESSAGES", [
        msgId, now, clientId, clientName,
        contactName, contactPhone, conversationName, direction,
        messageBody, "important", "Parse error: " + e.message,
        "", flaggedId, "new",
      ]);
      await appendRow("FLAGGED", [
        flaggedId, clientId, contactName, messageBody,
        "Parse error from classifier", e.message,
        now, "pending",
      ]);
      return { statusCode: 200, body: JSON.stringify({ status: "parse_error", raw: txt.slice(0, 200) }) };
    }

    const classification = result.classification || "important";
    const reasoning = result.reasoning || "";
    const todoIds = [];
    let flaggedId = "";

    if (classification === "todo" && Array.isArray(result.todos) && result.todos.length > 0) {
      for (const t of result.todos) {
        const tid = sid();
        todoIds.push(tid);
        await appendRow("TODOS", [
          tid, clientId, t.text, "false", "whatsapp", today,
          t.urgency || "medium", t.category || "general", "false",
        ]);
      }
    }

    if (classification === "important") {
      flaggedId = sid("f");
      await appendRow("FLAGGED", [
        flaggedId, clientId, contactName, messageBody,
        result.summary || "", result.flagReason || reasoning || "Unclear intent",
        now, "pending",
      ]);
    }

    await appendRow("MESSAGES", [
      msgId, now, clientId, clientName,
      contactName, contactPhone, conversationName, direction,
      messageBody, classification, reasoning,
      todoIds.join(","), flaggedId, "new",
    ]);

    // Telegram alert for high-urgency todos
    if (classification === "todo" && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      for (const t of (result.todos || [])) {
        if (t.urgency === "high") {
          await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: `🔴 ${clientName}: ${t.text}` }),
          }).catch(() => {});
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        client: clientName,
        matchType: route.matchType,
        matchedOn: route.matchedOn,
        classification,
        reasoning,
        todos: todoIds.length,
        flagged: !!flaggedId,
      }),
    };
  } catch (err) {
    console.error("ghl-webhook error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

// Export for testing
exports._test = { CLIENTS, TEAM_MEMBERS, routeMessage, norm, lev, fuzzyIncludes };
