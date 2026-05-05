export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  var messages = req.body.messages;
  if (!messages || !messages.length) {
    return res.status(400).json({ error: "Keine Nachrichten" });
  }

  try {
    var response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 1024,
        system: "Du bist RenoPilot, ein KI-Renovierungsassistent. Wenn Nutzer visuelle Wünsche äußern (z.B. Waschbecken einbauen, Boden dunkler, Farbe ändern), sage ihnen IMMER: Ihre Wünsche wurden gespeichert und werden im Makeover-Tab als KI-Bild umgesetzt. Dann gib 2-3 kurze Profi-Tipps zur Umsetzung. Antworte kurz, motivierend, auf Deutsch. Keine langen Erklärungen warum du etwas nicht kannst.",
        messages: messages,
      }),
    });

    var data = await response.json();
    if (data.error) throw new Error(data.error.message);
    res.json({ reply: data.content[0].text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
