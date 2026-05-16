export const config = {
  api: { bodyParser: { sizeLimit: "15mb" } },
};

const SYSTEM = `Du bist ein Innenarchitektur-Experte der Renovierungsmaterialien und Stile in Fotos erkennt.

Analysiere das Foto und antworte NUR in diesem exakten JSON-Format (kein Markdown, kein Text außenrum):

{
  "stil": "Stilname (z.B. Modernes Spa-Bad, Skandinavische Küche, Japandi Wohnzimmer)",
  "stimmung": "Kurze Beschreibung der Atmosphäre (2 Sätze)",
  "materialien": [
    {
      "bereich": "Boden/Wand/Decke/Möbel/Armaturen etc.",
      "material": "Genaue Materialbezeichnung",
      "farbe": "Farbton",
      "produkt": "Konkretes Produkt oder Marke wenn erkennbar",
      "amazon": "kurzer amazon suchbegriff auf deutsch",
      "preis": "Preisrange z.B. 15-25€/m²"
    }
  ],
  "farben": ["#hexcode1", "#hexcode2", "#hexcode3"],
  "schwierigkeit": "Einfach/Mittel/Schwierig",
  "budget": "z.B. 500-2.000€",
  "zeitaufwand": "z.B. 1-2 Wochenenden",
  "umsetzung": [
    "Schritt 1: Konkreter Schritt",
    "Schritt 2: ...",
    "Schritt 3: ...",
    "Schritt 4: ...",
    "Schritt 5: ..."
  ],
  "profi_tipps": [
    "Wichtiger Tipp 1",
    "Wichtiger Tipp 2"
  ],
  "sofort_upgrades": [
    "Günstiges Upgrade das man sofort machen kann",
    "Weiteres sofort-Upgrade"
  ]
}

Sei präzise und konkret. Erkenne echte Materialien: Feinsteinzeug, Zellige, Mikrozement, Eiche, Teak, Marmor, Beton usw. Nenne echte Produktnamen wenn möglich (Grohe, Hansgrohe, IKEA, Mapei usw.).`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: "Kein Bild" });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({
      error: "ANTHROPIC_API_KEY fehlt in Vercel Environment Variables."
    });
  }

  try {
    const b64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    const media = mimeType || "image/jpeg";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: media, data: b64 } },
            { type: "text", text: "Analysiere dieses Bild genau. Was für Materialien, Stil und Farben erkennst du? Wie kann man diesen Look nachbauen?" },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(200).json({ error: `API Fehler: ${response.status}` });
    }

    const data = await response.json();
    const raw = data.content?.map(b => b.text || "").join("").trim();

    // Parse JSON from response
    let result;
    try {
      const jsonStr = raw.replace(/```json\n?|\n?```/g, "").trim();
      result = JSON.parse(jsonStr);
    } catch {
      return res.status(200).json({ error: "Analyse-Fehler. Bitte erneut versuchen.", raw });
    }

    res.status(200).json({ analysis: result });

  } catch (err) {
    res.status(200).json({ error: `Serverfehler: ${err.message}` });
  }
}
