const { appendRow } = require("./utils/sheets");

// ============================================================
// ROUTING — all messages come from Leadly HQ (fBGtXuOOAHiy0v9CUuBl)
// We route to clients by group chat name or contact name.
// ============================================================

// Group chat name → client ID (partial match, case-insensitive)
const GROUP_ROUTES = [
  { match: "axis collective", clientId: "axis-001" },
  { match: "homeup", clientId: "homeup-001" },
  { match: "aaro", clientId: "aaro-001" },
  { match: "aether", clientId: "aether-001" },
];

// Individual contact name → client ID (partial match, case-insensitive)
const CONTACT_ROUTES = {
  "joann": "aaro-001",
  "mavis": "aaro-001",
  "carrin": "aaro-001",
  "dave": "aether-001",
  "tong boon": "homeup-001",
  "deevik": "homeup-001",
  "deevak": "homeup-001",
  "dhiren": "homeup-001",
  "marcus": "homeup-001",
  "damien": "axis-001",
  "joel": "axis-001",
  "tan jun liong": "axis-001",
};

const CLIENT_NAMES = {
  "aaro-001": "AARO",
  "aether-001": "Aether Athletics",
  "homeup-001": "HomeUp",
  "axis-001": "Axis Collective",
};

function routeMessage(contactName, conversationName) {
  const convLower = (conversationName || "").toLowerCase();
  const nameLower = (contactName || "").toLowerCase();

  // 1. Try group chat name first
  for (const r of GROUP_ROUTES) {
    if (convLower.includes(r.match)) return r.clientId;
  }

  // 2. Try contact name match
  for (const [name, clientId] of Object.entries(CONTACT_ROUTES)) {
    if (nameLower.includes(name)) return clientId;
  }

  // 3. "Matt" alone is ambiguous — could be HomeUp or Axis
  if (nameLower.includes("matt")) return "ambiguous-matt";

  return null;
}

// Short ID generator
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

    // Route to client
    const clientId = routeMessage(contactName, conversationName);
    const clientName = CLIENT_NAMES[clientId] || "";
    const msgId = sid();

    // ──────────────────────────────────────────────────────────
    // Case A: Couldn't route to a client — log + flag, skip Claude
    // ──────────────────────────────────────────────────────────
    if (!clientId || clientId === "ambiguous-matt") {
      const reason = clientId === "ambiguous-matt"
        ? `Matt sent a message outside a group chat — could be HomeUp or Axis Collective`
        : `Unknown contact "${contactName}" — no matching client`;
      const classification = clientId === "ambiguous-matt" ? "ambiguous" : "unrouted";
      const flaggedId = sid("f");

      // Write to MESSAGES log
      await appendRow("MESSAGES", [
        msgId, now, "", "",
        contactName, contactPhone, conversationName, direction,
        messageBody, classification, reason,
        "", flaggedId, "new",
      ]);

      // Also add to FLAGGED so it shows in the review queue
      await appendRow("FLAGGED", [
        flaggedId, clientId === "ambiguous-matt" ? "" : "unknown",
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
      // No Claude key — still log the message as "unclassified"
      await appendRow("MESSAGES", [
        msgId, now, clientId, clientName,
        contactName, contactPhone, conversationName, direction,
        messageBody, "unclassified", "ANTHROPIC_API_KEY not set",
        "", "", "new",
      ]);
      return { statusCode: 200, body: JSON.stringify({ status: "logged", warning: "no API key" }) };
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

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await r.json();
    const txt = data.content.filter(b => b.type === "text").map(b => b.text).join("");

    let result;
    try {
      result = JSON.parse(txt.replace(/```json|```/g, "").trim());
    } catch (e) {
      // Claude returned bad JSON — log as important so it doesn't get lost
      await appendRow("MESSAGES", [
        msgId, now, clientId, clientName,
        contactName, contactPhone, conversationName, direction,
        messageBody, "important", "Parse error: " + e.message,
        "", "", "new",
      ]);
      return { statusCode: 200, body: JSON.stringify({ status: "parse_error", raw: txt.slice(0, 200) }) };
    }

    const classification = result.classification || "important";
    const reasoning = result.reasoning || "";
    const todoIds = [];
    let flaggedId = "";

    // Write todos (only if classification === "todo")
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

    // Write flagged (only if classification === "important")
    if (classification === "important") {
      flaggedId = sid("f");
      await appendRow("FLAGGED", [
        flaggedId, clientId, contactName, messageBody,
        result.summary || "", result.flagReason || reasoning || "Unclear intent",
        now, "pending",
      ]);
    }

    // Always log to MESSAGES
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
