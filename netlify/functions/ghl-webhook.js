const { appendRow } = require("./utils/sheets");

// ============================================================
// ROUTING — group name is the primary router
// DMs from unknown contacts are silently skipped
// ============================================================

// Group chat name → client ID (partial match, case-insensitive)
const GROUP_ROUTES = [
  { match: "axis collective", clientId: "axis-001" },
  { match: "axis", clientId: "axis-001" },
  { match: "homeup", clientId: "homeup-001" },
  { match: "home up", clientId: "homeup-001" },
  { match: "c & h", clientId: "homeup-001" },
  { match: "aaro", clientId: "aaro-001" },
  { match: "asian alliance", clientId: "aaro-001" },
  { match: "aether", clientId: "aether-001" },
];

const CLIENT_NAMES = {
  "aaro-001": "AARO",
  "aether-001": "Aether Athletics",
  "homeup-001": "HomeUp",
  "axis-001": "Axis Collective",
};

function routeMessage(contactName, conversationName) {
  const convLower = (conversationName || "").toLowerCase();

  // Group chat → route by group name
  for (const r of GROUP_ROUTES) {
    if (convLower.includes(r.match)) return r.clientId;
  }

  // DM (no group name) → can't auto-route, skip
  return null;
}

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

    // Route to client
    const clientId = routeMessage(contactName, conversationName);
    const clientName = CLIENT_NAMES[clientId] || null;

    // Skip if can't route (DMs from unknown contacts)
    if (!clientId) {
      const msgId = Date.now().toString(36) + Math.random().toString(36).slice(2, 5) + "m";
      await appendRow("MESSAGES", [msgId, "unknown", "—", contactName, messageBody, conversationName || "DM", new Date().toISOString(), "skipped"]);
      return { statusCode: 200, body: JSON.stringify({ status: "skipped", reason: "No group match" }) };
    }

    // Call Claude to extract todos
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", max_tokens: 1024,
        messages: [{ role: "user", content: `You are a marketing agency assistant for Leadly (a digital marketing agency in Singapore). Client "${clientName}" — contact "${contactName}" sent this WhatsApp message${conversationName ? ` in group "${conversationName}"` : ""}:

"${messageBody}"

Your job: decide if this message contains an EXPLICIT action item for Leadly's team.

ONLY create a todo if the message contains a CLEAR, SPECIFIC request or instruction. Examples of real todos:
- "Can you pause the Google Ads campaign?"
- "Please update the landing page copy to say X"
- "We need the monthly report by Friday"
- "Change the budget to $500/day"
- "Can you set up a new WhatsApp flow for enquiries?"

IGNORE all of these — they are NOT todos and should NOT be flagged:
- Greetings, thanks, acknowledgements ("ok", "thanks", "noted", "sure", "👍", "good morning")
- Status updates or FYI messages ("sales were good today", "we had 5 enquiries")
- Casual conversation, small talk, banter
- Questions about general topics (not requesting Leadly to do work)
- Forwarded content, news articles, memes
- Short replies ("yes", "no", "ok can", "will do")
- Internal team discussion that doesn't require Leadly action
- Sharing results or feedback ("the ads are doing well", "got a lead from the website")
- Voice notes (transcription summaries that are just updates)

Three outcomes:
1. CLEAR TODO — explicit action for Leadly: hasTodos: true, needsReview: false
2. NO ACTION NEEDED — the vast majority of messages fall here: hasTodos: false, needsReview: false
3. FLAG ONLY IF the message contains a potential complaint, urgent issue, or budget/contract discussion that Kenneth should personally see: hasTodos: false, needsReview: true

DEFAULT to outcome 2. Most messages are just conversation. Only flag if genuinely important.

Respond ONLY valid JSON:
{"hasTodos":true/false,"needsReview":true/false,"todos":[{"text":"...","urgency":"high|medium|low","category":"ads|reporting|website|billing|general"}],"summary":"...","flagReason":"only if needsReview"}` }],
      }),
    });

    const data = await r.json();
    const txt = data.content.filter(b => b.type === "text").map(b => b.text).join("");
    const result = JSON.parse(txt.replace(/```json|```/g, "").trim());

    const now = new Date().toISOString();
    const today = now.split("T")[0];

    // Write todos
    if (result.hasTodos && result.todos?.length > 0) {
      for (const t of result.todos) {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
        await appendRow("TODOS", [id, clientId, t.text, "false", "whatsapp", today, t.urgency || "medium", t.category || "general"]);
      }
    }

    // Write flagged
    if (result.needsReview) {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5) + "f";
      await appendRow("FLAGGED", [id, clientId, contactName, messageBody, result.summary || "", result.flagReason || "Unclear intent", now, "pending"]);
    }

    // Log every message to MESSAGES tab
    const outcome = result.hasTodos ? "todo" : result.needsReview ? "flagged" : "ignored";
    const msgId = Date.now().toString(36) + Math.random().toString(36).slice(2, 5) + "m";
    await appendRow("MESSAGES", [msgId, clientId, clientName, contactName, messageBody, conversationName || "DM", now, outcome]);

    // Telegram alert for high urgency
    if (result.hasTodos && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
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
      body: JSON.stringify({ ok: true, client: clientName, todos: result.todos?.length || 0, flagged: result.needsReview || false }),
    };
  } catch (err) {
    console.error("ghl-webhook error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
