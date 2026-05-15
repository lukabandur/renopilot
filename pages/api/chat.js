export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};

const SYS = `Du bist RenoPilot, ein freundlicher DIY-Renovierungsberater mit Wissen aus 20 Handwerker-YouTube-Videos. Antworte immer auf Deutsch.

WENN EIN FOTO hochgeladen wird, analysiere IMMER in dieser Struktur:
🏠 **Raum & Materialien**: Was siehst du genau? Welche Materialien erkennst du (Fliesen, Putz, Laminat, Armaturen, Farbe, Zustand)?
🔨 **Sofortmaßnahmen**: Was kann man selbst schnell verbessern ohne großen Aufwand?
✨ **Upgrade-Ideen**: 2–3 konkrete Renovierungsideen was sich hier gut machen würde
🛒 **Material-Empfehlungen**: Konkrete Produktnamen. Für Amazon-Produkte nutze dieses Format: [Produktname](https://www.amazon.de/s?k=SUCHBEGRIFF&tag=renopilot-21)

BEI TEXTNACHRICHTEN: Kurz, konkret, max. 5 Sätze, motivierend. Nutze **Fettschrift** für wichtige Begriffe.

FACHWISSEN:
- STREICHEN: Lammfellrolle 12–18mm, Dispersionsfarbe trocken abziehen, Latexfarbe NASS abziehen
- SPACHTELN: Q1 (Fugen), Q2 (Übergang), Q3 (Abporen). Pulverspachtel Q1, Fertigspachtel Q2/Q3
- FLIESEN: Doppelklebung, Zahnkelle 8mm, Nivelliersystem, 1/3-Verband
- BAD: Alte Fliesen lassen (Klopftest), Silikon raus, SMP-Klebstoff ohne Dispersionsgrundierung
- LAMINAT: 10mm Dehnungsfuge, 48h akklimatisieren, Trittschalldämmung
- WANDPANEELE: Fluted Panels Akzentwand, erstes Panel mit Wasserwaage, S-Muster Kleber
- LED: 24V, WAGO-Klemmen, Trailing-Edge-Dimmer, 20% Trafo-Reserve`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { message, imgBase64, mimeType } = req.body;

  const content = [];
  if (imgBase64) {
    const base64Data = imgBase64.includes(",") ? imgBase64.split(",")[1] : imgBase64;
    const mediaType = mimeType || (imgBase64.includes("data:image/png") ? "image/png" : "image/jpeg");
    content.push({ type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } });
  }
  content.push({ type: "text", text: message || "Analysiere dieses Bild." });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYS,
        messages: [{ role: "user", content }],
      }),
    });

    const data = await response.json();
    const reply = data.content?.map(b => b.text || "").join("") || "Fehler beim Antworten.";
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ reply: "Serverfehler. Bitte erneut versuchen." });
  }
}
