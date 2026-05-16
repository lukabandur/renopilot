export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};

const SYS = `Du bist RenoPilot, ein freundlicher DIY-Renovierungsberater. Antworte immer auf Deutsch, konkret und hilfreich. Nutze **Fettschrift** für wichtige Begriffe. Immer mit Produktnamen und deutschen Preisen (OBI/Bauhaus/Hornbach/Amazon).

WENN EIN FOTO hochgeladen wird:
🏠 **Raum & Materialien**: Was erkennst du?
🔨 **Sofortmaßnahmen**: Was kann man günstig selbst verbessern?
✨ **Upgrade-Ideen**: 2–3 konkrete Ideen
🛒 **Materialien**: Produktnamen mit [Link](https://www.amazon.de/s?k=SUCHBEGRIFF&tag=renopilot-21)

FACHWISSEN: Lammfellrolle 12-18mm fürs Streichen, Doppelklebung bei Fliesen, 10mm Dehnungsfuge Laminat, Bad-Silikon mit Pilzhemmer, SPC-Vinyl für Nassräume, LED 24V mit WAGO-Klemmen.`;

function getOfflineAntwort(text) {
  const t = (text || "").toLowerCase();

  if (t.match(/hallo|hi|hey|guten|servus|moin/))
    return "Hey! 👋 Ich bin dein RenoPilot – dein DIY-Renovierungsexperte.\n\nFrag mich zu Bad, Küche, Wohnzimmer, Boden oder Beleuchtung – ich helfe dir konkret und günstig!";

  // Decke
  if (t.match(/decke|abgehängt|abhängen|stuckleiste|einbaustrahler.*decke|decken.*strahler/))
    return "Decke renovieren – so geht's! 🏗️\n\n**Option 1 – Streichen:** Deckenfarbe weiß, **Lammfellrolle 18mm**, mit Teleskopstange. Ergebnis sofort, ca. 20–40€.\n\n**Option 2 – Abgehängte Rigips-Decke:** CD-Profile + Direktabhänger + Rigips. Einbaustrahler oder LED-Cove-Licht dahinter. Ca. 20–35€/m².\n\n**Option 3 – LED-Cove-Licht:** Holzkastenrahmen am Rand, LED-Strip 2700K dahinter = indirektes Licht wie im Hotel. Ca. 150–300€.\n\n⚠️ Einbaustrahler: Elektriker für Anschluss nötig, **IP44** im Bad Pflicht!\n\n[LED-Strip 2700K auf Amazon](https://www.amazon.de/s?k=led+strip+2700k+cove+licht+dimmbar&tag=renopilot-21)";

  // Verlegen / Boden
  if (t.match(/verlegen|verlege|wie.*boden|boden.*wie|laminat.*verlegen|vinyl.*verlegen|parkett.*verlegen|fliesen.*verlegen/))
    return "Boden verlegen – Schritt für Schritt! 🪵\n\n**1. Untergrund vorbereiten:** Eben (max. 3mm/2m), trocken, sauber. Unebenheiten mit Ausgleichsmasse (Knauf Nivello, 20–40€).\n\n**2. Trittschalldämmung** auslegen, Stöße verkleben.\n\n**3. Ersten Reihe:** 10mm Abstandshalter zur Wand – **Dehnungsfuge Pflicht!**\n\n**4. Klicksystem:** Reihe für Reihe einrasten, Gummihammer benutzen. Reststück = Anfang nächste Reihe.\n\n**5. Letzte Reihe** zuschneiden, mit Zugeisen einziehen.\n\n**6. Sockelleisten** kleben (NICHT ans Laminat schrauben!).\n\n⏱️ 20m² = ca. 1 Tag · [Verlegewerkzeug Set](https://www.amazon.de/s?k=laminat+verlegewerkzeug+set+zugeisen&tag=renopilot-21)";

  // Wohnzimmer
  if (t.match(/wohnzimmer|wohn.*zimmer|living|sofa.*wand|tv.*wand|couch/))
    return "Wohnzimmer aufwerten – die besten Ideen! 🛋️\n\n**Akzentwand (30–60€):** Nur EINE Wand dunkel streichen → RAL 6009 Dunkelgrün, RAL 5011 Navy, RAL 3012 Terrakotta. Vorher **Tesa Precision** abkleben!\n\n**TV-Wand Fluted Panel (80–200€):** Gerillte MDF-Paneele hinter dem TV kleben, davor LED-Strip 2700K. Einfachste Art einen Magazin-Look zu erreichen.\n\n**Licht tauschen (50–150€):** 2700K LED überall, Stehlampe + Beistelltisch statt Deckenlampe, LED-Strip hinter TV.\n\n[Wandfarbe dunkelgrün](https://www.amazon.de/s?k=wandfarbe+dunkelgrün+matt&tag=renopilot-21) · [Fluted Panel MDF](https://www.amazon.de/s?k=wandpaneele+mdf+fluted+panel&tag=renopilot-21)";

  // Streichen
  if (t.match(/streichen|streich|farbe.*wand|wand.*farbe|wände.*farb|farbe.*auftrag/))
    return "Wände streichen – Profi-Tipps! 🎨\n\n**Vorbereitung:** Tesa Precision Band abkleben (fingerspitzenartig andrücken), Böden abdecken.\n\n**Werkzeug:** **Lammfellrolle 12–18mm** auf Teleskopstange (keine billigen Rollen – hinterlassen Flusen!). Rand vorher mit Pinsel abstreichen ('Mäuschen').\n\n**Auftragen:** Von oben nach unten, gleichmäßige Züge. **Nie halbfertige Flächen** trocknen lassen!\n\n**Abziehen:** Dispersionsfarbe = trocken abziehen. **Latexfarbe = nass abziehen!** Sonst reißt die Kante.\n\n💰 30–60€ für einen Raum · ⏱️ 1 Tag\n\n[Lammfellrolle](https://www.amazon.de/s?k=lammfellrolle+18mm+teleskopstange&tag=renopilot-21)";

  // Silikon / Fuge
  if (t.match(/silikon|fuge|fugen|schimmel|abdicht/))
    return "Silikon erneuern – günstigstes Upgrade! 🛠️\n\n**Brauchst du:** Soudal Bad-Silikon (8€), Silikon-Entferner (5€), Cuttermesser, Malerband.\n\n**So geht's:** Altes Silikon raus → **Isopropanol entfetten** (wichtig!) → Malerband beidseitig → Silikon in einem Zug → nasser Finger drüber → Band **sofort** (noch nass) abziehen → 24h trocknen.\n\n⚠️ Nur **Bad-Silikon mit Pilzhemmer** kaufen – normales schimmelt nach Monaten!\n\n[Soudal Bad-Silikon](https://www.amazon.de/s?k=soudal+bad+silikon+pilzhemmend&tag=renopilot-21)";

  // Bad
  if (t.match(/bad|badezimmer|dusche|wc|toilette|waschtisch|waschbecken|badwanne|wanne/))
    return "Bad aufwerten – so gehst du vor! 🚿\n\n**Unter 100€ (sofort):** Silikon komplett erneuern, LED-Spiegel mit IP44 (Emke ~80€), mattschwarz Accessoires.\n\n**Unter 500€:** Armaturen auf Mattschwarz tauschen, SPC-Vinyl über Fliesen (kein Stemmen!), neuer Spiegel.\n\n**Unter 2.000€:** Mikrozement über Fliesen (fugenlos, edel), Walk-In Dusche einbauen.\n\n💡 **Größte Wirkung:** Silikon + LED-Spiegel = komplett anderes Bad für unter 100€!\n\n[SPC Vinyl Bad](https://www.amazon.de/s?k=spc+vinyl+boden+wasserfest&tag=renopilot-21)";

  // Küche
  if (t.match(/küche|kueche|fronten|front|griffe|arbeitsplatte|dunstabzug|herd/))
    return "Küche aufwerten – top Investition! 🍳\n\n**30 Min, 30–80€:** Griffe tauschen – 128mm Bügel Mattschwarz, Torxschrauber, fertig.\n\n**1–2 Tage, 80–200€:** Fronten folieren – Klebefolie Holzoptik oder Navy, vorher **mit Aceton entfetten!**\n\n**2–3 Tage, 100–300€:** Fronten lackieren – Schleifen P120 → Haftgrund → 2–3× Seidenmatt-Lack (RAL 7044 Seidengrau).\n\n**Extra-Tipp:** LED-Strip unter Oberschränken, 2700K warm = macht Essen appetitlicher!\n\n[Mattschwarz Griffe](https://www.amazon.de/s?k=küchen+griffe+mattschwarz+128mm+set&tag=renopilot-21)";

  // Fliesen
  if (t.match(/fliesen|kacheln|fliese|fliesenkleber|verfugen|fugen.*fliesen/))
    return "Fliesen – alle Optionen! 🔲\n\n**Über Fliesen legen (einfachste Option):** Spezieller Flexkleber C2, neue Fliesen drüber. Kein Stemmen! Boden wird 1–2cm höher. **Doppelklebung** (Kleber auf Boden UND Fliese) bei Formaten über 30×30cm!\n\n**Folieren (Mietwohnung):** Klebefolie Metro/Beton/Marmor, reversibel, 5–15€/m².\n\n**Neu fliesen:** Flexkleber C2, Zahnkelle 8mm, Kreuzfugen 2mm (Bad) / 3mm (Boden), **Nivelliersystem** bei Großformat.\n\n💡 Randfuge immer **Silikon** – kein Fugenmörtel!\n\n[Flexkleber C2](https://www.amazon.de/s?k=flexkleber+c2+fliesen+über+fliesen&tag=renopilot-21)";

  // Laminat/Vinyl/Boden allgemein
  if (t.match(/laminat|vinyl|spc|rigid|boden|parkett|dielen|linoleum/))
    return "Boden verlegen – machst du selbst! 💪\n\n**SPC-Vinyl** (100% wasserfest, über Fliesen möglich): 15–25€/m² bei OBI. **Laminat** (nur Trockenräume!): ab 8€/m².\n\n**Pflicht:** 10mm Dehnungsfuge zur Wand, 48h akklimatisieren lassen, Trittschalldämmung darunter. Sockelleisten kleben – NICHT ans Laminat schrauben!\n\n[SPC Vinyl](https://www.amazon.de/s?k=spc+vinyl+boden+wasserfest+klick&tag=renopilot-21) · [Trittschalldämmung](https://www.amazon.de/s?k=trittschalldämmung+3mm+laminat&tag=renopilot-21)";

  // LED / Licht / Beleuchtung
  if (t.match(/led|licht|lampe|beleuchtung|leuchte|strahler|dimmer|strip|streifen/))
    return "Beleuchtung = größter Stimmungsmacher! 💡\n\n**Goldene Regel:** **2700K warm** = Wohnzimmer/Schlafzimmer/Bad. **4000K neutral** = Küche/Arbeitszimmer. Niemals 6000K kalt im Wohnbereich!\n\n**LED-Strip unter Küchenschränken:** 2700K, 5m Komplettset, ~30–60€. Sofort professioneller Look.\n\n**Indirektes Cove-Licht:** Holzkastenrahmen + LED-Strip = Spa-Feeling, ~100–200€ für ganzen Raum.\n\n⚠️ Im Bad: **IP44 Pflicht** – steht auf der Verpackung, immer prüfen!\n\n[LED Strip 2700K](https://www.amazon.de/s?k=led+strip+2700k+warmweiß+5m+dimmbar&tag=renopilot-21)";

  // Schlafzimmer
  if (t.match(/schlafzimmer|schlaf.*zimmer|bett|kopfteil|einbauschrank|kleiderschrank/))
    return "Schlafzimmer transformieren! 🛏️\n\n**Akzentwand (25–60€):** Nur Bett-Wand in Terrakotta, Salbeigrün oder Nachtblau streichen.\n\n**Licht umstellen (40–120€):** Nachttischlampen statt Deckenlampe, **2200K** (wärmstes Licht) = beste Schlafqualität.\n\n**Kopfteil DIY (80–250€):** MDF-Platte + 5cm Schaumstoff + Bouclé-Stoff tackern. OBI schneidet MDF auf Maß!\n\n**Dunkle Decke:** Nachtblau an der Decke = Geborgenheitsgefühl wie Hotel.\n\n[Bettkopfteil Bouclé](https://www.amazon.de/s?k=bettkopfteil+bouclé+gepolstert&tag=renopilot-21)";

  // Mikrozement
  if (t.match(/mikrozement|beton.*optik|fugenlos|tadelakt/))
    return "Mikrozement – der edle Fugenlos-Look! 🏛️\n\nDirekt über Fliesen ohne Stemmen: **Haftgrund** auftragen (1h trocknen) → 1. Lage Mikrozement (1mm) → schleifen 120er → 2. Lage Mikrozement (1mm) → schleifen 180er → 2× **PU-Versiegelung**.\n\n⏱️ 3–4 Tage (Trocknungszeiten einplanen!)\n💰 Ca. 60–120€/m² Material\n\n💡 Erste Übungsfläche machen – in einer Ecke oder auf Karton üben!\n\n[Mikrozement Komplett-Set](https://www.amazon.de/s?k=mikrozement+set+boden+wand+versiegelung&tag=renopilot-21)";

  // Terrasse / Balkon
  if (t.match(/terrasse|balkon|outdoor|außen|garten|wpc|klickfliesen/))
    return "Terrasse & Balkon aufwerten! 🌿\n\n**Sofort (unter 50€):** Solar-Lichterketten 2200K (kein Kabel!), Bambus-Sichtschutz 3 Matten ~45€.\n\n**Mittel (100–300€):** WPC-Klickdielen (35–65€/m², wartungsfrei, über alten Boden), Paletten-Sofa aus EPAL-Paletten (nur EPAL-Stempel!).\n\n**Projekt (ab 500€):** Pergola aus Douglasie, Holzöl einmal jährlich = 20 Jahre haltbar.\n\n[WPC Dielen](https://www.amazon.de/s?k=wpc+dielen+klick+terrasse&tag=renopilot-21)";

  // Mietwohnung
  if (t.match(/mietwohnung|miete|mieter|vermieter|erlaubt|darf/))
    return "Mietwohnung – was ist erlaubt? 🔑\n\n✅ **Erlaubt ohne Genehmigung:** Streichen (beim Auszug zurückstreichen), Klebefolie auf Fliesen/Fronten (reversibel!), Griffe tauschen (Original aufbewahren!), Klick-Boden ohne Kleber, LED-Spiegel (Stecker-Anschluss), Regale montieren (Dübellöcher spachteln).\n\n⚠️ **Mit Genehmigung:** Fest verkleben, neue Leitungen.\n\n❌ **Niemals:** Elektro-Festinstallation selbst, tragende Wände, Gasleitungen.\n\n💡 Alle Originalteile (Griffe, Türknöpfe) in einer Kiste aufbewahren!";

  // Budget / günstig
  if (t.match(/budget|günstig|billig|preiswert|wenig.*geld|kosten|preis|€|euro/))
    return "Günstig renovieren – die besten Tipps! 💰\n\n**Unter 50€ – Sofort-Wirkung:**\n• Silikon erneuern: 15€ → Bad wirkt neu\n• Griffe tauschen: 30–50€ → neue Küche\n• Wand streichen: 25–40€ → Raum komplett anders\n\n**Unter 200€ – Spürbarer Unterschied:**\n• SPC-Vinyl verlegen: 80–150€\n• LED-Spiegel Bad: 80–150€\n\n**Größte Wirkung pro €:** Streichen > Licht > Griffe > Silikon erneuern!";

  // Werkzeug
  if (t.match(/werkzeug|bohrmaschine|schrauber|was.*brauche|kaufen.*werkzeug/))
    return "Grundausstattung für Heimwerker! 🔨\n\n**Kaufen (einmalig):**\n• **Bosch PSB 1800 LI** ~80€ (Schlagbohrmaschine für Beton)\n• **Wasserwaage 60cm** ~5–15€ – unverzichtbar!\n• **Cuttermesser + Klingen** ~10€\n• **Tesa Precision Abklebeband** ~5€\n\n**Mieten bei OBI statt kaufen:**\n• Fliesenschneider: 15–25€/Tag\n• Schleifmaschine: 20–35€/Tag\n• Stichsäge: 15€/Tag\n\n💡 Nie billige Werkzeuge kaufen – lieber mieten!\n\n[Bosch Bohrmaschine](https://www.amazon.de/s?k=bosch+psb+1800+li+schlagbohrmaschine&tag=renopilot-21)";

  // Trockenbau / Rigips / Wand bauen
  if (t.match(/rigips|trockenbau|trocken.*wand|wand.*bauen|ständerwerk|abgehängt|kastendecke/))
    return "Trockenbau – so baust du Wände und Decken! 🔩\n\n**Wand bauen:** UW-Bodenprofil + CW-Ständer alle **62,5cm** (Raster für 125cm Platte!) + UW-Deckenprofil. Rigips verschrauben (alle 25cm, Kopf 0,5mm versenkt!). Fugen mit Glasflies-Band + Q1/Q2 Spachtel.\n\n**Im Bad:** Immer **GKFI (grüne Feuchtraum-Platte!)** – normale GKB quillt auf!\n\n**Dübel in Rigips:** Niemals normale Dübel – **Hohlraumdübel** (Molly) für bis zu 15kg. Für Schweres: in den Metallständer schrauben!\n\n[Rigips Ständerwerk](https://www.amazon.de/s?k=rigips+ständerwerk+cd+uw+profil&tag=renopilot-21)";

  // Spachteln / Putz
  if (t.match(/spachteln|spachtel|putz|glätten|q1|q2|q3|glatt.*wand/))
    return "Spachteln & Glätten – die 3 Qualitätsstufen! 🔧\n\n**Q1 – Fugen:** Pulverspachtel in Fugen pressen, Fugendeckstreifen einlegen. Nur für Bereiche die gefliest werden.\n\n**Q2 – Standard:** Fertigspachtel dünn über ganze Fläche, trocknen, **120er Schleifgitter** drüber. Für normalen Anstrich.\n\n**Q3 – Fein:** Zweite dünne Lage Fertigspachtel, 180er schleifen = glatte Wand für Hochglanzlack.\n\n💡 **Glasflies-Band** in alle Fugen einlegen – verhindert Rissbildung dauerhaft!\n\n[Fertigspachtel Knauf](https://www.amazon.de/s?k=knauf+fertigspachtel+5kg&tag=renopilot-21)";

  // Default – aber mit Kontext-Stichwörtern aus der Frage
  return `Gute Frage zu "${text.slice(0, 40)}${text.length > 40 ? "..." : ""}"! 💪\n\nSchreib mir etwas konkreter:\n• **Welchen Raum** möchtest du verändern?\n• **Was stört** dich am meisten aktuell?\n• **Budget** – was willst du ausgeben?\n\nOder nutze den **✨ Makeover-Tab** – Foto hochladen und die KI zeigt dir wie es aussehen könnte!`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { messages, message, imgBase64, mimeType } = req.body;

  // Get the last user message for offline fallback
  const lastUserText = messages
    ? (messages.filter(m => m.role === "user").pop()?.content || "")
    : (message || "");

  // If no API key → use offline mode
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.json({ reply: getOfflineAntwort(lastUserText) });
  }

  try {
    let apiMessages;
    if (messages && Array.isArray(messages)) {
      apiMessages = messages.map(m => ({ role: m.role, content: m.content || m.text || "" }));
    } else {
      const content = [];
      if (imgBase64) {
        const base64Data = imgBase64.includes(",") ? imgBase64.split(",")[1] : imgBase64;
        content.push({ type: "image", source: { type: "base64", media_type: mimeType || "image/jpeg", data: base64Data } });
      }
      content.push({ type: "text", text: message || "Hallo!" });
      apiMessages = [{ role: "user", content }];
    }

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
        messages: apiMessages,
      }),
    });

    if (!response.ok) {
      return res.json({ reply: getOfflineAntwort(lastUserText) });
    }

    const data = await response.json();
    const reply = data.content?.map(b => b.text || "").join("").trim();
    res.json({ reply: reply || getOfflineAntwort(lastUserText) });

  } catch {
    res.json({ reply: getOfflineAntwort(lastUserText) });
  }
}
