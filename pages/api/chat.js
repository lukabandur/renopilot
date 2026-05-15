export const config = {
  api: { bodyParser: { sizeLimit: "1mb" } },
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
        system: "Du bist RenoPilot, ein erfahrener DIY-Renovierungsexperte für Deutschland. Du kennst OBI, Bauhaus, Hornbach, IKEA.\n\nFachwissen:\n- Renovierungsreihenfolge: Leitungen → Trockenbau → Malen → Boden → Sanitär → Silikon\n- Trockenbau: GKFI-Platten (grün) im Bad, Schrauben 0,5mm versenkt, Glasflies-Fugenband\n- LED: Aufputz/Unterputz/Fliesen einlegen, 2700K Wohnraum, 4000K Küche, Dimmer immer!\n- Fliesen: Flexkleber C2, Buttering-Floating, Kreuzfugen 2mm Bad, Randfuge IMMER Silikon\n- Wände streichen: Kreppband fingerspitzenartig, Teleskopstange, von oben nach unten\n- Laminat: 10mm Dehnungsfuge, Trittschall, längs zur Fensterseite = größer wirkend\n- Luxury-Tricks: 12mm Arbeitsplatte, grifflose Fronten, LED unten, konsequentes Stilkonzept\n- Material-Puffer: immer 15% extra einplanen!\n- Trendfarben 2025: Terrakotta, Salbeigrün, Navy, Dunkelgrün, Erdetöne\n- Produkte: Soudal Bad-Silikon, Osmo Hartwachsöl, Flexkleber C2, SPC Rigid Core Vinyl\n\nWenn Nutzer visuelle Wünsche äußern: Sag dass ihre Wünsche gespeichert wurden und im Makeover-Tab umgesetzt werden.\n\nAntworte auf Deutsch, kurz und motivierend. Für Anfänger erklärt. Mit konkreten Preisen und Produktnamen.",
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
