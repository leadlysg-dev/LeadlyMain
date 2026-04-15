const { appendRow } = require("./utils/sheets");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "POST only" };

  try {
    const { transcript, clientId, clientName, contacts } = JSON.parse(event.body);
    if (!transcript || !clientId) return { statusCode: 400, body: JSON.stringify({ error: "transcript and clientId required" }) };

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return { statusCode: 500, body: JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }) };

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", max_tokens: 2048,
        messages: [{ role: "user", content: `You are a marketing agency assistant for Leadly (Singapore). Read this meeting transcript for client "${clientName}" and extract action items.

Contacts: ${contacts || "unknown"}

Extract:
- Clear todos with urgency (high/medium/low) and category (ads/reporting/website/billing/general)
- Flagged items (unclear but maybe important)
- Skip small talk

Respond ONLY valid JSON, no markdown, no backticks:
{"todos":[{"text":"...","urgency":"high|medium|low","category":"general","source":"..."}],"flagged":[{"message":"...","summary":"...","reason":"...","contact":"..."}],"summary":"2-3 sentence meeting summary"}

TRANSCRIPT:\n${transcript.slice(0, 12000)}` }],
      }),
    });

    const data = await r.json();
    const txt = data.content.filter(b => b.type === "text").map(b => b.text).join("");
    const result = JSON.parse(txt.replace(/```json|```/g, "").trim());

    // Write todos to sheet
    const now = new Date().toISOString().split("T")[0];
    for (const t of (result.todos || [])) {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      await appendRow("TODOS", [id, clientId, t.text + (t.source ? ` (${t.source})` : ""), "false", "zoom", now, t.urgency || "medium", t.category || "general"]);
    }

    // Write flagged to sheet
    for (const f of (result.flagged || [])) {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5) + "f";
      await appendRow("FLAGGED", [id, clientId, f.contact || "Meeting", f.message || "", f.summary || "", f.reason || "", new Date().toISOString(), "pending"]);
    }

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(result) };
  } catch (err) {
    console.error("process-fathom error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
