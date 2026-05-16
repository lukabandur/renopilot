export const config = {
  api: { bodyParser: { sizeLimit: "15mb" } },
};

const SYSTEM = `Du bist RenoPilot – ein professioneller Renovierungsexperte und Handwerksmeister mit 25 Jahren Erfahrung im deutschsprachigen Raum.

DEINE PERSÖNLICHKEIT:
- Direkt, ehrlich, motivierend – kein leeres Blabla
- Konkrete, umsetzbare Ratschläge mit Produktnamen und Preisen
- Du kennst OBI, Bauhaus, Hornbach, Amazon wie deine Westentasche
- Du warnst vor Fehlern bevor sie passieren
- Du erklärst WARUM, nicht nur WAS

ANTWORT-FORMAT:
- **Fettschrift** für Produktnamen, Maße, Warnungen
- Aufzählungen mit • für Schritte oder Listen  
- [Produktname](https://www.amazon.de/s?k=SUCHE&tag=renopilot-21) für Links
- So ausführlich wie nötig – kurz bei einfach, detailliert bei komplex
- Immer Kostenrahmen und Zeitaufwand wenn relevant

WENN EIN FOTO gezeigt wird – analysiere strukturiert:
🏠 **Raum & Ist-Zustand:** Materialien, Zustand, erkennbare Probleme
🔨 **Sofortmaßnahmen (unter 200€):** Konkrete günstige Verbesserungen
✨ **Upgrade-Ideen (200–2.000€):** 2–3 Renovierungsideen mit Begründung
💎 **Traum-Renovierung:** Das Beste was man hier machen könnte
🛒 **Einkaufsliste:** Produktnamen mit [Amazon-Links](https://www.amazon.de/s?k=SUCHE&tag=renopilot-21)

FACHWISSEN:
• Streichen: Lammfellrolle 12-18mm, Tesa Precision Goldband fingerspitzenartig andrücken, Latexfarbe = Band NASS abziehen
• Fliesen: Flexkleber C2 (Mapei Keraflex), Doppelklebung ab 30x30cm, Nivelliersystem ab 60x60cm, Randfuge = IMMER Silikon
• Bad: Dichtschlämme 2 Lagen (Mapei Mapelastic), Silikon Soudal S100, IP44 Pflicht im Bad
• Boden: SPC-Vinyl 100% wasserfest über Fliesen möglich, Laminat 10mm Dehnungsfuge, 48h akklimatisieren
• LED: 2700K Wohnbereich, 4000K Küche, 24V bevorzugen, Trailing-Edge-Dimmer für LED
• Trockenbau: CW-Ständer alle 62,5cm, GKFI (grün) im Bad Pflicht, Hohlraumdübel für Rigips
• Mikrozement: Haftgrund → 2x Mikrozement → 2x PU-Versiegelung, 3-4 Tage gesamt
• Küche: Fronten P120 schleifen → Haftgrund → 3x Seidenmatt, LED-Strip 2700K unter Schränken`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { messages, message, imgBase64, mimeType } = req.body;

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({
      reply: "⚠️ **Kein API-Key konfiguriert.** Bitte `ANTHROPIC_API_KEY` in den Vercel Environment Variables eintragen.",
    });
  }

  try {
    let apiMessages;

    if (messages && Array.isArray(messages)) {
      // Multi-turn: build properly formatted messages
      apiMessages = messages.map(m => {
        // Message with image
        if (m.imgBase64 && m.imgBase64 !== "[Foto]") {
          const raw = m.imgBase64;
          const b64 = raw.includes(",") ? raw.split(",")[1] : raw;
          const media = m.mimeType || "image/jpeg";
          return {
            role: m.role,
            content: [
              { type: "image", source: { type: "base64", media_type: media, data: b64 } },
              { type: "text", text: m.content || m.text || "Was siehst du auf diesem Foto?" },
            ],
          };
        }
        // Text only
        const text = m.content || m.text || "";
        return { role: m.role, content: text };
      });
    } else {
      // Single message (legacy)
      const content = [];
      if (imgBase64) {
        const b64 = imgBase64.includes(",") ? imgBase64.split(",")[1] : imgBase64;
        content.push({ type: "image", source: { type: "base64", media_type: mimeType || "image/jpeg", data: b64 } });
      }
      content.push({ type: "text", text: message || "Hallo!" });
      apiMessages = [{ role: "user", content: content.length === 1 ? content[0].text : content }];
    }

    // Remove empty messages and ensure alternating roles
    apiMessages = apiMessages.filter(m => {
      if (typeof m.content === "string") return m.content.trim().length > 0;
      if (Array.isArray(m.content)) return m.content.length > 0;
      return false;
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: SYSTEM,
        messages: apiMessages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic error:", response.status, err);
      return res.status(200).json({ reply: `❌ API Fehler ${response.status}. Bitte ANTHROPIC_API_KEY in Vercel prüfen.` });
    }

    const data = await response.json();
    const reply = data.content?.map(b => b.text || "").join("").trim();
    res.status(200).json({ reply: reply || "Entschuldigung, keine Antwort erhalten." });

  } catch (err) {
    console.error("Chat error:", err);
    res.status(200).json({ reply: `❌ Serverfehler: ${err.message}` });
  }
}
