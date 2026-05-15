import { useState, useRef, useEffect } from "react";
import Head from "next/head";

const SYSTEM = `Du bist RenoPilot, ein freundlicher DIY-Renovierungsexperte für den deutschsprachigen Markt. Deine Nutzer sind AMATEURE. Erkläre alles einfach, konkret, auf Deutsch, motivierend. Immer mit Produktnamen, deutschen Preisen (OBI/Bauhaus/Hornbach/Amazon/IKEA). Warne bei Elektro-Festinstallation, Asbest und tragenden Wänden immer klar.`;

async function callAPI(messages) {
  const response = await fetch("/api/chat-proxy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: messages,
    }),
  });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch(e) { throw new Error("HTTP " + response.status + ": " + raw.substring(0, 150)); }
  if (!response.ok || data.error || data.type === "error") {
    throw new Error("HTTP " + response.status + " | " + raw.substring(0, 200));
  }
  return data.content?.[0]?.text || "(leer)";
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const C = {
  bg: "#F8F5F0",
  card: "#FFFFFF",
  border: "#EDE8DF",
  accent: "#C4622D",
  accentBg: "#FFF0E8",
  text: "#1A1A1A",
  muted: "#888888",
  green: "#3A7A56",
  greenBg: "#EDF5F1",
};

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: ${C.bg}; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
  .fu { animation: fadeUp 0.3s ease both; }
  textarea:focus, input:focus, select:focus { outline: none; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-thumb { background: #DDD; border-radius: 3px; }
`;

function LoadingSpinner({ size }) {
  const sz = size || 24;
  return (
    <div
      style={{
        width: sz,
        height: sz,
        border: "3px solid " + C.border,
        borderTop: "3px solid " + C.accent,
        borderRadius: "50%",
        flexShrink: 0,
        animation: "spin 0.85s linear infinite",
      }}
    />
  );
}

function Pill({ children, bg, color }) {
  return (
    <span
      style={{
        background: bg || C.accentBg,
        color: color || C.accent,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

// ─── OFFLINE EXPERTEN-SYSTEM ─────────────────────────────────────────────────
function getRenovierungsAntwort(text, hasImage) {
  const t = text.toLowerCase();

  if (hasImage) return "Tolles Foto! 📸\n\nIch sehe deinen Raum. Hier sind meine ersten Einschätzungen:\n\n🔍 **Was ich empfehle:**\n\n1. **Sofort-Upgrade (unter 50€):** Neue Griffe, frisches Silikon, LED-Leuchte – kleine Änderungen, große Wirkung.\n\n2. **Mittel-Projekt (unter 300€):** Wände streichen, Vinyl-Boden über alte Fliesen, Spiegel tauschen.\n\n3. **Komplett-Upgrade (unter 1.000€):** Mikrozement, neue Armaturen, abgehängte Decke mit LED.\n\n💡 Schreib mir was du ändern möchtest – Boden, Wand, Decke oder Deko – und ich gebe dir einen konkreten Plan!";

  if (t.match(/hallo|hi|hey|guten|servus/)) return "Hey! 👋 Schön dass du da bist!\n\nIch bin dein RenoPilot – dein DIY-Experte für Renovierungen.\n\n**Was kann ich für dich tun?**\n\n🚿 Bad renovieren\n🍳 Küche aufwerten\n🛋️ Wohnzimmer gestalten\n🛏️ Schlafzimmer umgestalten\n🌿 Terrasse/Balkon\n\nLade ein Foto hoch oder schreib mir welchen Raum du renovieren möchtest!";

  if (t.match(/silikon|fuge|schimmel/)) return "Silikon erneuern – einer der günstigsten und wirkungsvollsten Upgrades! 🛠️\n\n**Was du brauchst:**\n• Bad-Silikon mit Schimmelschutz: Soudal oder Ottoseal (ca. 8€) – kein normales Silikon!\n• Silikon-Entferner (ca. 5€)\n• Cutter-Messer\n• Fugenglätter oder feuchter Finger\n\n**Schritt für Schritt:**\n1. Altes Silikon mit Cutter einschneiden\n2. Silikon-Entferner auftragen, 30 Min warten\n3. Reste abziehen, Fläche entfetten\n4. Abklebeband links und rechts\n5. Silikon gleichmäßig auftragen\n6. Mit feuchtem Finger glattziehen\n7. Band sofort abziehen, 24h trocknen lassen\n\n⏱️ Zeit: 2 Stunden\n💰 Kosten: ca. 15€\n⭐ Schwierigkeit: Anfänger";

  if (t.match(/vinyl|laminat|boden verlegen|klick/)) return "Boden verlegen – machst du selbst! 💪\n\n**SPC-Vinyl (für Bad & Küche):**\n• 100% wasserfest, über alte Fliesen möglich\n• Kosten: 15–25€/m² bei OBI/Bauhaus\n• Kein Kleber nötig – Klicksystem\n\n**Laminat (nur Trockenbereiche!):**\n• Kosten: 8–18€/m²\n• Nicht für Bad oder Küche!\n\n**Schritt für Schritt:**\n1. Untergrund prüfen – max. 3mm Unebenheit\n2. Schaumunterlage auslegen\n3. Erste Reihe mit 10mm Abstand zur Wand\n4. Reihe für Reihe einrasten\n5. Letzte Reihe zuschneiden (Cutter reicht für Vinyl!)\n6. Sockelleisten kleben\n\n⏱️ Zeit: 1 Tag für 20m²\n💰 Kosten: ab 15€/m²\n⭐ Schwierigkeit: Anfänger\n\n💡 Tipp: Immer 10–15% mehr kaufen – für Verschnitt!";

  if (t.match(/bad|badezimmer|dusche|wc|toilette|waschtisch/)) return "Badezimmer renovieren – hier ist mein Plan für dich! 🚿\n\n**Budget 50–150€ (Sofort-Upgrades):**\n• Silikon komplett erneuern (Soudal Bad-Silikon)\n• LED-Spiegel mit IP44: Emke Amazon ab 80€\n• Mattschwarz-Accessoires Set: ~40€\n\n**Budget 150–500€:**\n• Armaturen auf Mattschwarz tauschen (VINGO Amazon)\n• SPC-Vinyl über alte Fliesen legen\n• Stauraum über WC montieren\n\n**Budget 500–2.000€:**\n• Mikrozement über Fliesen (kein Stemmen!)\n• Walk-In Dusche einbauen\n• Waschtisch komplett tauschen\n\n⚠️ Wichtig: Immer Bad-Silikon mit Schimmelschutz! IP44 bei Lampen Pflicht!\n\n💡 Was ist dein Budget? Dann gebe ich dir einen konkreten Schritt-für-Schritt-Plan!";

  if (t.match(/küche|kueche|fronten|schrank|arbeitsplatte|griffe/)) return "Küche aufwerten – top Investition! 🍳\n\n**Günstigste Möglichkeiten:**\n\n🔩 **Griffe tauschen (30 min, 30–80€)**\n→ 128mm Bügel Mattschwarz auf Amazon. Schrauber raus, neuen rein.\n\n🎨 **Fronten folieren (1–2 Tage, 80–200€)**\n→ Klebefolie Holz/Beton/Marmor-Optik. Reversibel für Mietwohnung!\n→ Wichtig: erst entfetten mit Aceton!\n\n🖌️ **Fronten lackieren (2–3 Tage, 100–300€)**\n→ Schleifen (P120) → Haftgrund → 3× Seidenmatt-Lack\n→ RAL 7044 Seidengrau oder RAL 5011 Navy = Trend 2025\n\n💡 LED-Strip unter Oberschränken: 20–60€, 2700K warm, macht Essen appetitlicher!\n\n⚠️ Schnittkanten der Arbeitsplatte IMMER abdichten – sonst quillt sie auf!";

  if (t.match(/wohnzimmer|wand streichen|akzent|farbe|streichen/)) return "Wand streichen – einfachstes Upgrade mit größter Wirkung! 🎨\n\n**Die Akzentwand:**\nNur EINE Wand dunkel streichen → sofort anderer Raum!\n\n**Aktuelle Trendfarben 2025:**\n• Dunkelgrün (RAL 6009)\n• Navy Blau (RAL 5011)\n• Anthrazit (RAL 7016)\n• Terrakotta (RAL 3012)\n\n**Schritt für Schritt:**\n1. Wand abkleben (Tesa Precision!)\n2. Testfeld 30×30cm malen – trocknen lassen!\n3. Tiefengrund auftragen\n4. 2 Schichten Farbe (Rolle 18cm)\n5. Klebeband feucht abziehen\n\n💰 Kosten: 30–60€\n⏱️ Zeit: 1 Tag\n⭐ Schwierigkeit: Anfänger ✓\n\n💡 Tipp: Alpina oder Schöner Wohnen – keine Billigfarbe. 2 Schichten immer einplanen!";

  if (t.match(/decke|rigips|led.*decke|decke.*led|abgehängt|einbaustrahler/)) return "Deckenrenovierung – handwerklich! 🏗️\n\n**Option 1: Abgehängte Rigips-Decke**\n→ Metallständerwerk an Decke schrauben\n→ Rigips-Platten verschrauben (Feuchtraumplatte im Bad!)\n→ Spachteln, schleifen, streichen\n→ Kosten: 15–30€/m²\n\n**Option 2: LED-Kanal einbauen (Profi-Look)**\n→ Alu-Profil auf Decke kleben/schrauben\n→ Mit Spachtelmasse bündig einspachteln\n→ Schleifen, streichen\n→ LED-Strip einlegen → unsichtbare Lichtquelle!\n→ Kosten: 40–100€\n\n**Option 3: Einbaustrahler setzen**\n→ Lochsäge 68mm, Strahler einclipsen\n→ ⚠️ Elektriker für Anschluss nötig!\n→ IP44 Pflicht im Bad!\n\n💡 Warm 2700K im Wohnbereich, kalt 4000K nur für Arbeitsbereiche!";

  if (t.match(/terrasse|balkon|outdoor|außen|garten/)) return "Terrasse & Balkon aufwerten! 🌿\n\n**Sofort-Upgrades:**\n• Solar-Lichterketten: 15–50€, kein Kabel nötig\n• Bambus-Sichtschutz: 3 Matten ~45€ bei OBI\n• Outdoor-Teppich: ab 30€\n\n**Mittel-Projekte:**\n• Klick-Holzfliesen auflegen: 25–50€/m² – kein Kleber!\n• Paletten-Lounge: fast gratis – EPAL-Stempel prüfen!\n• Hochbeet bauen: ab 60€\n\n**Größere Projekte:**\n• WPC-Dielen auf Unterkonstruktion: 35–65€/m² – wartungsfrei!\n• Pergola-Bausatz: 500–2.000€ – Douglasie oder Lärche\n\n⚠️ Paletten: NUR EPAL-gestempelte nehmen – andere können Giftstoffe enthalten!\n💡 Holz einmal jährlich ölen – hält dann 20 Jahre!";

  if (t.match(/schlafzimmer|bett|kopfteil|kleiderschrank/)) return "Schlafzimmer neu gestalten! 🛏️\n\n**Größte Wirkung:**\n\n🎨 **Akzentwand hinterm Bett**\nNur diese eine Wand in Terrakotta, Salbeigrün oder Dunkelblau.\nKosten: 25–60€ | Zeit: 1 Tag\n\n💡 **Licht auf 2200K umstellen**\nNachttischlampen statt Deckenlampe.\nKosten: 40–120€ | Sofort-Upgrade\n\n🪵 **Kopfteil selbst bauen**\nMDF-Platte (OBI schneidet auf Maß) + Polsterstoff + Schaumstoff tackern.\nKosten: 50–150€ | Zeit: 1 Wochenende\n\n🌙 **Dunkle Decke**\nNachtblau oder Dunkelgrün an der Decke = Geborgenheitsgefühl!\nKosten: 20–50€\n\n🪟 **Blackout-Vorhänge bis Decke**\nIKEA MAJGULL ~50€/Paar. Stange direkt unter Decke.\n\n💡 2200K = wärmstes Licht = beste Schlafqualität!";

  if (t.match(/budget|günstig|billig|preiswert|wenig geld|50|100|200|300|500/)) return "Günstig renovieren – meine besten Tipps! 💰\n\n**Unter 50€ – Sofort-Wirkung:**\n• Silikon erneuern: 15€ → Bad wirkt sauber\n• Griffe tauschen: 30–50€ → neue Küche\n• Streichen: 25–40€ → Raum komplett anders\n• LED-Leuchtmittel 2700K: 15–25€ → Atmosphäre\n\n**Unter 200€ – Spürbarer Unterschied:**\n• Vinyl-Boden verlegen: 80–150€\n• Regal montieren + dekorieren: 50–80€\n• Mattschwarz-Accessoires Bad: 80–120€\n\n**Unter 500€ – Komplett-Upgrade:**\n• Küchenfronten folieren: 80–200€\n• Badezimmer komplett: Silikon + Spiegel + Armaturen\n• Balkon aufwerten: Klickfliesen + Licht + Pflanzen\n\n💡 Größte Wirkung pro Euro: Streichen > Licht > Griffe tauschen > Silikon!";

  if (t.match(/mietwohnung|miete|vermieter|erlaubt/)) return "Mietwohnung renovieren – was ist erlaubt? 🔑\n\n**Ohne Genehmigung erlaubt:**\n✓ Streichen (beim Auszug zurückstreichen)\n✓ Möbel aufstellen, Regale montieren (Dübellöcher spachteln)\n✓ Klebefolie auf Fliesen/Fronten (reversibel!)\n✓ Griffe tauschen (Original aufbewahren!)\n✓ LED-Spiegel (Stecker-Anschluss)\n✓ Klick-Bodenbelag ohne Kleber\n\n**Mit Genehmigung:**\n⚠️ Neue Steckdosen, Leitungen\n⚠️ Wände durchbrechen\n⚠️ Fest verkleben (Fliesen, Tapete)\n\n**NIE ohne Genehmigung:**\n❌ Elektro-Festinstallation\n❌ Tragende Wände verändern\n❌ Gasleitungen\n\n💡 Tipp: Alles Original-Material aufbewahren! Griffe, Türknöpfe, Lampen in einer Kiste.\n\nBei Fragen zum Mietrecht: Mieterverein kontaktieren.";

  if (t.match(/werkzeug|bohrmaschine|schlagbohr|akkuschrauber|was brauche/)) return "Das brauchst du – Grundausstattung für Anfänger! 🔨\n\n**Pflicht (kaufen):**\n• Bohrmaschine/Schlagbohrer: Bosch PSB 1800 LI (~80€) – für Dübel in Beton\n• Akkuschrauber: Bosch GO 2 (~50€) – für Montage\n• Wasserwaage 60cm: 5–15€ – unverzichtbar!\n• Cutter-Messer + Klingen: 10€\n• Abdeckband Tesa Precision: 5€ – kein billiges!\n\n**Mieten bei OBI (statt kaufen):**\n• Fliesenschneider: 15–25€/Tag\n• Schleifmaschine: 20–35€/Tag\n• Stichsäge: 15€/Tag\n\n**Verbrauchsmaterial immer griffbereit:**\n• Dübel 6mm + 8mm Sortiment\n• Schrauben Torx (besser als Schlitz!)\n• Montagekleber (Pattex/Sika)\n• Silikon Bad-Silikon (Soudal)\n\n💡 Tipp: Nie billige Werkzeuge kaufen – lieber mieten als mit schlechtem Werkzeug kämpfen!";

  if (t.match(/mikrozement|beton.*optik|beton.*look/)) return "Mikrozement – der Trend-Look 2025! 🏛️\n\n**Was ist Mikrozement?**\nEin dünner Zementputz (2–3mm) direkt auf Fliesen, Wand oder Boden. Kein Stemmen, fugenlos, edel.\n\n**Schritt für Schritt:**\n1. Fliesen schleifen (80er Papier), entfetten\n2. Haftgrund auftragen, 2h trocknen\n3. 1. Schicht Mikrozement (1mm), trocknen\n4. Schleifen (120er), entstauben\n5. 2. Schicht Mikrozement (1–2mm)\n6. Schleifen (180er)\n7. 2× Versiegelung auftragen\n\n**Kosten:**\n• Material: 60–120€/m²\n• Komplett-Set (10m²): ~200–400€\n• Bei OBI, Bauhaus oder Amazon\n\n⏱️ Zeit: 3–4 Tage (wegen Trocknungszeiten)\n⭐ Schwierigkeit: Mittel – 1 Übungsfläche empfohlen!\n\n💡 Günstige Alternative: Mikrozement-Klebefolie – 10–15€/m², Mietwohnung-safe!";

  if (t.match(/fliesen|kacheln/)) return "Fliesen – alle Möglichkeiten! 🔲\n\n**Option 1: Über Fliesen legen (einfachste)**\n→ Spezial-Haftkleber (z.B. Murfix/Schöck)\n→ Neue Fliesen drüber setzen\n→ Kein Stemmen! Boden +1–2cm\n→ Kosten: 20–50€/m² Material\n\n**Option 2: Folieren (Mietwohnung)**\n→ Klebefolie Metro/Beton/Marmor\n→ Fett entfernen, Folie aufkleben\n→ Reversibel!\n→ Kosten: 5–15€/m²\n\n**Option 3: Streichen**\n→ Fliesenfarbe + Primer\n→ Günstiger, hält 5–8 Jahre\n→ Kosten: 40–100€ für Bad\n\n**Option 4: Stemmen & neu fliesen**\n→ Meißel + Schlagbohrer\n→ Neuer Kleber, neue Fliesen\n→ Zeitaufwändigste aber dauerhafteste Lösung\n→ Kosten: 30–80€/m²\n\n💡 Kreuzfugen IMMER mit Abstandshaltern! Randfuge immer Silikon, nicht Fugenmasse!";

  if (t.match(/licht|lampe|led|beleuchtung|hell|dunkel|atmosphäre/)) return "Beleuchtung – größter Stimmungsmacher! 💡\n\n**Die wichtigste Regel:**\n2700K = warm = Wohnzimmer/Schlafzimmer/Bad\n4000K = neutral = Küche/Arbeitszimmer\n6000K = kalt = NIE im Wohnbereich!\n\n**Günstige Upgrades:**\n• LED-Strips hinter TV: 20–50€ (Ambilight-Effekt)\n• LED-Strip unter Küchenschränken: 20–60€\n• Nachttischlampen statt Deckenlampe: 40–120€\n• Stehlampen strategisch: 50–150€\n\n**Badezimmer:**\n⚠️ IP44 Pflicht! Immer auf Verpackung prüfen!\n• LED-Spiegel mit Beleuchtung: 80–200€\n• Einbaustrahler: Elektriker nötig!\n\n**Indirektes Licht (Profi-Effekt):**\n→ LED-Strip an der Deckenrandzone\n→ Oder LED-Strip hinter einem Rigips-Kasten\n→ Licht kommt von oben ohne sichtbare Quelle\n\n💡 Dimmer einbauen: 15–30€ bei OBI – lohnt sich überall!";

  if (t.match(/epoxidharz|epoxy|boden.*beschicht|beschicht.*boden/)) return "Epoxidharz vs. andere Bodenbeschichtungen! 🏭\n\n**Epoxidharz:**\n• Sehr harte, glänzende Oberfläche (Industrielook)\n• Ideal für Garagen, Keller, Werkstatt\n• 2-Komponenten-System: Harz + Härter mischen\n• Boden muss absolut trocken sein (CM-Wert <2%)\n• Kosten: ca. 50–120€ für 20m²\n• ⚠️ Einmal aufgetragen kaum noch entfernbar!\n\n**Mikrozement:**\n• 2–3mm dünn, fugenlos, auch für Wände\n• Eher matt und samtig (Spa-Look)\n• Flexibler als Epoxy, auch auf Fliesen möglich\n• 3 Schichten + Versiegelung nötig\n• Kosten: 60–130€/m²\n• Für Wohnräume, Bad, Küche ideal\n\n**Wann was?**\n🔧 Garage/Werkstatt → Epoxidharz\n🛁 Bad/Küche/Wohnzimmer → Mikrozement";

  if (t.match(/spc|rigid core|lvt|vinyl.*unterschied|unterschied.*vinyl/)) return "Vinyl-Boden Typen erklärt! 🏠\n\n**SPC (Stone Polymer Composite = Rigid Core):**\n• Steifster, stabilster Vinylboden\n• Komplett wasserfest auch bei stehenden Wasser\n• Für Bad, Küche, Keller geeignet\n• Kaum Ausdehnung bei Temperaturwechsel\n• Stärke: 4–6mm reicht\n• Preis: 18–35€/m²\n\n**LVT (Luxury Vinyl Tile):**\n• Flexibler, weicher\n• Für Wohnräume gut\n• Nicht für dauerhaft feuchte Bereiche\n\n**WPC (Wood Polymer Composite):**\n• Wie SPC aber mit Schaumkern\n• Wärmer, weicher unter den Füßen\n• Dicker (8–12mm), teurer\n\n**Empfehlung:**\n✅ Bad/Küche → SPC Rigid Core\n✅ Wohnzimmer/Schlafzimmer → LVT oder WPC";

  if (t.match(/zellige|marokkan|handgemacht.*fliesen/)) return "Zellige-Fliesen – der Trend 2025! 🌍\n\n**Was sind Zellige?**\nHandgemachte marokkanische Tonkacheln. Jede ist einzigartig – kleine Unregelmäßigkeiten sind gewollt und Teil des Charmes!\n\n**Formate:**\n• 10×10cm – klassisch\n• 7,5×15cm – modernes Metro-Format\n• 5×5cm – sehr fein\n\n**Verlegung:**\n• Fugenstärke: 3–5mm (größer als normal!)\n• Weißzement-Fugenmasse empfohlen\n• Haftkleber C2 (Flexkleber)\n• Unregelmäßige Stärke = mehr Kleber einplanen\n\n**Pflege:**\n• Imprägnieren nach dem Verfugen\n• Säurefreie Reiniger verwenden\n• Keine aggressiven Scheuermittel\n\n**Kosten:** 40–120€/m² je nach Qualität\n**Bezug:** Bauhaus, Fliesenprofi, online bei Mosaic del Sur";

  if (t.match(/rigips.*abstand|schrauben.*rigips|rigips.*schrauben|dübel.*rigips|hohlraum/)) return "Rigips richtig verarbeiten! 🔩\n\n**Schraubenabstände:**\n• An Rändern: alle 15cm\n• In der Fläche: alle 25cm\n• Schrauben leicht versenken (0,5mm)\n\n**Spachteln (Qualitätsstufen):**\n• Q1: Grobe Spachtelung (hinter Fliesen ok)\n• Q2: Standard (Malerbetrieb normal)\n• Q3: Fein gespachtelt (für Glattputz)\n• Q4: Hochglanz (Lacke, Tapeten)\n\n**Dübeln in Rigips:**\n• Niemals normale Dübel!\n• Hohlraumdübel (Molly, Toggler) für leichte Lasten bis 15kg\n• Für schwere Lasten: nur in Ständer schrauben!\n• Ständer orten mit Magnetdetektor oder klopfen\n\n**Fugen bandagieren:**\n• Fugenband (Papier oder Glasfaser) einspachteln\n• 1. Lage: Fugenspachtel + Band\n• 2. Lage: Finishspachtel dünn\n• Schleifen: 120er, dann 180er";

  if (t.match(/feuchtigkeits|cm.wert|estrich.*trocken|boden.*feucht/)) return "Feuchtigkeit im Boden – so prüfst du! 💧\n\n**CM-Messung (Calcium-Carbid-Methode):**\n• Standardverfahren der Profis\n• Zementestrich muss unter 2,0 CM-% sein\n• Anhydritestrich: max. 0,5 CM-%\n• Messgerät ausleihen oder Fachmann rufen\n\n**Günstigere Alternativen:**\n• Folientest: Folie auf Boden kleben, 24h warten\n• Wenn Kondenswasser = zu feucht!\n\n**Wartezeiten Estrich:**\n• Zementestrich: ca. 1 Tag pro mm Dicke\n• 60mm Estrich = ca. 60 Tage!\n• Mit Fußbodenheizung kürzer (Aufheizprotokoll!)\n• Schnellestrich: 24–48h\n\n**Wenn zu feucht:**\n• Bauentfeuchter aufstellen\n• Fenster öffnen\n• Nochmal messen nach 2 Wochen\n• Nie zu früh Boden verlegen = Schimmelgefahr!";

  if (t.match(/schutzklasse|ip44|ip65|ip.*bad|spritzwasser/)) return "Schutzklassen IP – was bedeutet das? ⚡\n\n**IP = Ingress Protection (Schutz vor Eindringen)**\n\n**Erste Ziffer = Staubschutz:**\n• IP4x = Schutz gegen feste Teile >1mm\n• IP6x = vollständig staubdicht\n\n**Zweite Ziffer = Wasserschutz:**\n• IPx4 = Spritzwasser von allen Seiten\n• IPx5 = Strahlwasser\n• IPx6 = starkes Strahlwasser\n• IPx7 = Tauchen bis 1m\n\n**Pflichtbereiche im Bad (DIN VDE 0100-701):**\n• Zone 0 (IN der Wanne/Dusche): IP67\n• Zone 1 (über Wanne/Dusche): IP65\n• Zone 2 (60cm um Dusche): IP44\n• Restlicher Badbereich: IP44 empfohlen\n\n**Merke:**\n✅ IP44 = reicht für normalen Badbereich\n✅ IP65 = Pflicht über Dusche/Wanne\n❌ IP20 (normale Lampe) VERBOTEN im Bad!";

  if (t.match(/wärmebrücke|dämmung|kälte.*wand|feuchte.*wand|schimmel.*wand|kondensation/)) return "Schimmel & Wärmebrücken – so löst du das! 🌡️\n\n**Ursachen verstehen:**\n• Wärmebrücken = Stellen wo Wärme entweicht\n• Dort kondensiert Feuchtigkeit → Schimmel\n• Typische Stellen: Außenwandecken, Fensterlaibungen, Rollladenkästen\n\n**Sofortmaßnahmen:**\n• Regelmäßig Stoßlüften (3× täglich 5 Min.)\n• Nicht dauerhaft Kippen!\n• Luftfeuchtigkeit unter 60% halten\n• Hygrometer kaufen (5€) und messen\n\n**Schimmel entfernen:**\n• Leichter Schimmel: Isopropanol 70%\n• Tiefengrund mit Schimmelsperre auftragen\n• Schimmelschutzfarbe (Alpina, Schöner Wohnen)\n\n**Langfristige Lösung:**\n• Innendämmung mit Kalziumsilikat-Platten (Klimaplatte)\n• Dämmung von außen (Fachmann!)\n• Thermografiekamera-Check zeigt alle Wärmebrücken\n• Fördermittel: BAFA, KfW für Dämmung prüfen!";

  if (t.match(/abdicht|wannen.*silikon|dusche.*dicht|wasser.*dicht|abdichtung/)) return "Abdichtung richtig machen! 🚿\n\n**Abdichtungssystem vor dem Fliesen (Pflicht!):**\n1. Haftbrücke auf Untergrund\n2. Dichtband in alle Ecken + Anschlüsse\n3. Dichtmanschetten um Rohre\n4. 2× Dichtschlämme (Schlämmung) auftragen\n5. 24h Trockenzeit zwischen Lagen\n6. Dann erst Fliesen setzen!\n\n**Produkte:**\n• Schlüter KERDI: Foliensystem, sehr zuverlässig\n• Mapei Mapelastic: flexible Dichtschlämme\n• Ardex 8+9: bewährtes 2K-System\n\n**Silikon an Fugen:**\n• Randfuge (Boden-Wand, Wand-Wand): IMMER Silikon\n• Kein starren Fugenmörtel an Bewegungsfugen!\n• Bad-Silikon mit Schimmelpilzschutz: Soudal S100, Ottoseal\n• Abkleben, gleichmäßig auftragen, nassen Finger drüber, Band sofort ab!\n\n**Fehler hier = teurer Wasserschaden!**";

  if (t.match(/fluted|gerillte.*panel|wandpanel.*gerille|rillen.*wand/)) return "Fluted Panels – der Trend 2025! 📐\n\n**Was sind Fluted Panels?**\nGerillte MDF- oder Holzpaneele mit vertikalen oder horizontalen Rillen. Kommen aus der Architektur, jetzt im DIY angekommen.\n\n**Varianten:**\n• Schmale Rillen (1cm) = sehr elegant\n• Breite Rillen (3cm) = moderner Farmhouse-Look\n• Eiche furniert = teurer aber echter Holzlook\n• MDF grundiert = günstig, einfach lackierbar\n\n**Verlegung:**\n• Auf Holzlattung schrauben (unsichtbar von vorne)\n• Oder direkt mit Montagekleber auf Wand\n• VOR Montage lackieren/ölen – Zwischenräume kaum erreichbar danach!\n• Abschluss oben: Holzleiste auf Maß\n\n**Kosten:**\n• MDF-Paneele: 20–40€/m² (OBI, Bauhaus)\n• Eiche-Furniert: 60–120€/m²\n• Fertige Sets: IKEA, Amazon\n\n**Ideal für:** TV-Wand, Schlafzimmer hinter Bett, Flur";

  if (t.match(/tadelakt|kalkputz|kalk.*putz|kalk.*wand/)) return "Tadelakt & Kalkputz – Naturmaterialien! 🏛️\n\n**Tadelakt:**\n• Traditioneller marokkanischer Kalkputz\n• Wird mit Steinen poliert bis er glänzt\n• 100% wasserdicht wenn richtig verarbeitet\n• Ideal für Dusche, Badewanne, Waschtisch\n• 2–3 Schichten, zwischen Schichten polieren\n• Seife (schwarze Seife) als Versiegelung\n• Sehr aufwändig – Profi empfohlen\n• Kosten: 80–200€/m²\n\n**Limewash / Kalkfarbe:**\n• Einfachere Variante für Anfänger\n• Atmungsaktiv, antibakteriell\n• Aufgetragen mit Brush in Lagen\n• Jede Lage leicht anders wischen → lebendige Textur\n• Marken: Bauwerk Colour, Keim, Kreidezeit\n• Kosten: 40–120€\n\n**Marmorino/Venetiano:**\n• Marmorkalk-Putz mit Poliertechnik\n• Seidenglanz durch Stahlkelle polieren\n• Sehr dekorativ aber Übung nötig\n• Kosten: 60–150€";

  if (t.match(/osmo|arbeitsplatte.*öl|holz.*öl|öl.*holz|parkett.*pflege/)) return "Holz ölen & pflegen – richtig gemacht! 🌳\n\n**Warum ölen statt lackieren?**\n• Öl dringt ins Holz ein, Lack liegt obenauf\n• Geöltes Holz ist atmungsaktiv und lebendiger\n• Kleine Kratzer leicht ausbesserbar (nachölen)\n• Nachteil: öfter nachpflegen (1× jährlich)\n\n**Produkte (Empfehlung):**\n• Osmo Hartwachsöl 3032: Standardprodukt für alles\n• Osmo UV-Schutzöl: für Außenbereich\n• Rubio Monocoat: 1 Schicht reicht (teurer)\n• Livos: Naturfarben-Öle\n\n**Auftragen:**\n1. Holz schleifen (120er→180er)\n2. Staub mit feuchtem Tuch abwischen\n3. Öl dünn auftragen (zu viel = klebriger Film!)\n4. 30 Min einziehen lassen\n5. Überschuss mit Tuch aufnehmen\n6. 12h trocknen\n7. 2. Schicht (dünner)\n\n**Küchenarbeitsplatte:**\n• Jährlich nachölen\n• Nach Wasserflecken abschleifen + nachölen\n• Nie stehende Nässe lassen!";

  // ── Video-Transkript Wissen (19 Videos) ──────────────────────────────────────

  if (t.match(/wand.*streichen|streichen.*wand|mäuschen|rolle.*farbe|farbrolle/)) return "Wände streichen – Profi-Technik! 🎨\n\n**Vorbereitung:**\n• Kreppband 25mm (Goldband) – fingerspitzenartig andrücken, nie sofort voll drücken!\n• Wasserwaage oder Laser für gerade Abklebelinie\n• Angrenzende Wände mit Folienmaske abdecken\n• Böden mit Abdeckfolie schützen\n\n**Streichen:**\n• Erst 'Mäuschen' – Pinsel an Kanten/Ecken\n• Lammfellrolle 12–18mm Florhöhe auf Teleskopstange\n• Rolle kurz anfeuchten vor Gebrauch\n• Immer von oben nach unten durchziehen – keine halben Züge!\n• Nicht weiß vorstreichen nötig – Farbe direkt auf Altfarbe möglich\n• Qualitätsfarbe vom Fachmarkt (Mega Rekord, Klasse 1)\n\n**Kreppband entfernen:**\n• Dispersionsfarbe: auch getrocknet abziehbar\n• Latexfarbe: UNBEDINGT im nassen Zustand abziehen!\n\n💡 Tipp: Erste 2 Rollbreiten = Einarbeitungsphase, danach gleichmäßig";

  if (t.match(/renovier.*planen|planung.*renovier|ablauf.*renovier|reihenfolge.*renovier/)) return "Renovierung richtig planen – 8-Schritte-System! 📋\n\n**Der professionelle Ablauf:**\n1. Bestandsaufnahme & Grundrissanalyse (~5%)\n2. Abbruch & Entrümpelung (~20%)\n3. Sanitär & Elektroleitungen ROH – IMMER ZUERST!\n4. Trockenbau, Putz, Fenster\n5. Malen, Spachteln, Elektro-Abdeckungen (~60%)\n6. Fußboden (so spät wie möglich!)\n7. Türen, Armaturen, WC montieren\n8. Silikon + Details + Abschluss (~15%)\n\n**Kritische Regeln:**\n• Sanitär/Leitungen IMMER zuerst\n• Malen VOR Elektro-Abdeckungen\n• Fußboden nach den Malern\n• Silikon ganz am Schluss\n\n**Material-Planung:**\n• 15% Puffer bei ALLEN Materialien!\n• Sonderteile in Woche 1–2 bestellen (Lieferzeiten)\n• Handwerker früh einbeziehen";

  if (t.match(/fliesen.*verlegen|verlegen.*fliesen|fliesenkleber|verfugen|fugenmasse|kreuzfuge/)) return "Fliesen verlegen – Schritt für Schritt! 🔲\n\n**Vorbereitung:**\n• Untergrund reinigen, Grundierung auftragen (~1h trocknen)\n• Wände/Decke/Elektro VORHER fertigstellen!\n\n**Planung:**\n• Raummaß geteilt durch Fliesenbreite inkl. Fuge = Reststreifen\n• Letzter Streifen mind. halbe Fliese\n• Werkskante immer nach außen, Schnittkante in Ecken\n\n**Verlegen:**\n• Flexkleber C2 – nicht Standardkleber!\n• Buttering-Floating: Kleber auf Fliese UND Untergrund\n• Kreuzfugen: 2mm Bad, 3mm Boden\n• Mit Gummihammer und Richtlatte nivellieren\n\n**Verfugen:**\n• Mind. 24h warten nach Verlegen\n• Fugenmasse diagonal einarbeiten\n• Nach 20 Min. mit feuchtem Schwamm abwischen\n• Randfuge: IMMER Silikon, kein Mörtel!\n\n💡 Werkzeug mieten bei OBI: Fliesenschneider 15–25€/Tag";

  if (t.match(/led.*strip|led.*profil|led.*leiste|led.*kanal|indirekte.*beleucht|beleucht.*indirek/)) return "LED-Profile & indirekte Beleuchtung! 💡\n\n**3 Einbau-Varianten:**\n\n🔹 Aufputz-Profil (einfachste)\n→ Alu-Profil schrauben, Spachtel bündig, schleifen, streichen\n\n🔹 Unterputz in Rigips fräsen (unsichtbarste)\n→ Nut fräsen, Profil einlegen, einspachteln\n→ Ergebnis: 100% unsichtbar, nur Licht sichtbar\n\n🔹 In Fliesen einlegen (Profi-Look Bad)\n→ Nische in Fliesenreihe, SMP-Kleber, Silikon\n\n**LED-Temperaturen:**\n• Küche/Bad: 4000K neutralweiß\n• Wohnzimmer/Schlafzimmer: 2700–3000K warmweiß\n• Dimmer immer einplanen!\n• COB-LED-Strips: gleichmäßigeres Licht\n\n**Smart Home günstig:**\n• Shelly Dimmer hinter Lichtschalter (ab 12€)\n• Tradfri von IKEA = günstigster Einstieg";

  if (t.match(/trockenbau.*decke|abgehäng.*decke|rigips.*decke|decke.*rigips|cove.*light/)) return "Abgehängte Trockenbaudecke! 🏗️\n\n**Materialien:**\n• Rigips GKFI (grüne Feuchtraumplatte) – PFLICHT im Bad!\n• CD-Profile 60/27 + Direktabhänger alle 80cm\n• UD-Wandprofil für Randanschluss\n\n**Schritt für Schritt:**\n1. UD-Profil an Wand (Wasserwaage!)\n2. Direktabhänger an Decke dübeln\n3. CD-Profile einhängen, nivellieren\n4. Platten verschrauben (25cm Fläche, 15cm Rand)\n5. Fugen mit Glasflies bandagieren\n6. Q2 spachteln → trocknen → schleifen → grundieren → streichen\n\n**LED-Cove-Licht:**\n• Holzkastenrahmen 15–20cm breit an Deckenrand\n• LED-Strip dahinter, 2700K, dimmbarer Trafo\n• Licht strahlt zur Decke = perfekter Spa-Effekt\n\n⚠️ Mindesthöhe: 2,30m einhalten! Typischer Höhenverlust: 8–12cm";

  if (t.match(/trockenbau.*fehler|fehler.*trockenbau|rigips.*fehler/)) return "Trockenbau-Fehler vermeiden! ⚠️\n\n❌ Falsche Plattentype\n→ Im Bad IMMER grüne GKFI (Feuchtraum)\n→ Normale GKB quellen auf!\n\n❌ Schrauben falsch\n→ Kopf muss 0,5mm versenkt sein\n→ Zu tief = Karton beschädigt!\n\n❌ Fugenband falsch\n→ Gitternetz bei runden Kanten VERBOTEN\n→ Glasflies oder Papierband verwenden\n\n❌ Ausgleichsmasse ohne Abdichtung\n→ Flüssige Masse läuft durch Fugen ins Treppenhaus!\n→ Vorher alle Spalten abdichten\n\n❌ Türen vergessen\n→ Neuer Boden = höher als vorher → Türen kürzen!\n\n❌ Zu wenig Steckdosen\n→ Altbau: viel zu wenig → großzügig neue setzen!";

  if (t.match(/holzpaneel|wandpaneel|paneele.*wand|selbstklebend.*paneel|fluted/)) return "Holzpaneele & Fluted Panels – Montage! 🪵\n\n**Untergrund prüfen:**\n• Gestrichene Wand: Klebebandtest – hält = ok\n• Putz/Beton: Finger reiben → schmiert = erst grundieren!\n\n**Montage:**\n• Laser-Wasserwaage = Pflicht für gerade Linien\n• Von unten nach oben arbeiten\n• Dicke Kante nach unten, dünne nach oben\n• Einmal gesetzt = NICHT mehr schieben! (Kleber greift sofort)\n\n**Verband-Varianten:**\n• Wilder Verband: Reststück = Anfang nächste Reihe → natürliches Muster\n• Halbverband: Fugen immer gleiche Höhe → geordneter Look\n\n**Profi-Tipps:**\n• VOR Montage lackieren/ölen – Zwischenräume kaum erreichbar danach!\n• In Schlafzimmer: verbessert Raumakustik!\n• Abschlussleiste oben aus gleichem Material";

  if (t.match(/luxury|teuer.*wirk|hochwertig.*aussehen|günstig.*luxus|billig.*edel/)) return "Teuer wirken ohne teures Budget – Profi-Tricks! ✨\n\n**Die 7 besten Tricks aus Profi-Videos:**\n\n1. Konsequentes Stilkonzept (0€ extra)\n→ Eiche + Mattschwarz + Indirektlicht ÜBERALL durchziehen\n→ Türzargen, Griffe, Leisten aufeinander abstimmen\n\n2. Dünne Arbeitsplatten Küche\n→ 12mm statt 38mm = moderner, teurer wirkender Look\n\n3. Grifflose Fronten\n→ Push-to-Open (Tip-On) = cleaner Premium-Look\n\n4. Verputzen statt Tapezieren\n→ 0,5er Körnung, gefilzt + glattgezogen = hochwertiger\n\n5. Durchgehende LED unten (Küche)\n→ Unter allen Unterschränken, schaltbar = Wow-Effekt für ~30€\n\n6. Kochfeld mit Unterflur-Abzug\n→ Kein Dunstabzug sichtbar = saubereres, teureres Design\n\n7. Fugfarbe heller wählen\n→ Fugen trocknen immer dunkler als erwartet!";

  if (t.match(/laminat.*verlegen|verlegen.*laminat|trittschalldämm|klick.*system.*boden/)) return "Laminat verlegen – Schritt für Schritt! 🪵\n\n**Vorbereitung:**\n• Trittschalldämmung: Bahnen zusammenfächern, Stöße kleben\n• 10mm Abstand zur Wand IMMER (Ausdehnung!)\n• Laminat 3–4 Tage vorher im Raum akklimatisieren lassen!\n\n**Verlegen:**\n• Von links nach rechts, Reststück = Anfang nächste Reihe\n• Gummihammer + Holzklotz (keine Kanten beschädigen)\n• Letzte Reihe = aufwendigste – Zug-Eisen nutzen\n• Schiefer Raum → erste Reihe anwinkeln\n\n**Profi-Tipps:**\n• Längs zur Fensterseite verlegen = Raum wirkt größer!\n• Sockelleisten kleben statt nageln (kein Lärm)\n• Ecken auf Gehrung 45° = sauberer Look\n\n**Typische Fehler:**\n• Zu wenig Dehnungsfuge → Wellen\n• Trittschalldämmung vergessen → Klappern\n• Zu früh betreten → Fugen gehen auf";

  if (t.match(/fix.*flip|kernsanierung|komplett.*renovier|wohnung.*sanieren|apartment.*sanieren/)) return "Kernsanierung & Fix & Flip – Ablauf! 🏠\n\n**Typischer Ablauf:**\n1. Entkernen: Böden raus, alte Leitungen, nicht-tragende Wände\n2. Neue Leitungen: Elektro + Sanitär ROH\n3. Trockenbau-Vorbauwände für Installationen\n4. Putz: 0,5er Körnung gefilzt + glattgezogen (nicht Strukturputz!)\n5. Elektro-Abdeckungen + Malern\n6. Parkett verklebt (wertiger als Laminat)\n7. Sanitär + Küche einbauen\n8. Silikon, Leisten, Abschluss\n\n**Skandinavischer Stil (Trend 2025):**\n• Eiche + Mattschwarz + Indirektlicht konsequent durchziehen\n• Türzargen grau lackieren statt tauschen = günstiger\n• Türen vom Fachhändler statt Baumarkt!\n\n**Lessons Learned:**\n• Ausgleichsmasse: Fugen vorher abdichten (läuft ins Treppenhaus!)\n• Türen kürzen wenn Boden dicker wird\n• Viel zu wenig Steckdosen im Altbau → großzügig neue setzen!\n• Käufer früh einbeziehen = mehr Zufriedenheit";

  // Default
  return "Super Frage! 💪 Als Renovierungs-Experte helfe ich dir gerne.\n\nSchreib mir mehr Details:\n• **Welchen Raum** möchtest du renovieren?\n• **Was stört dich** am meisten?\n• **Wie viel Budget** hast du ungefähr?\n\n**Ich kann dir helfen mit:**\n🚿 Bad • 🍳 Küche • 🛋️ Wohnzimmer • 🛏️ Schlafzimmer • 🌿 Terrasse\n\nOder lade ein Foto hoch – dann sehe ich direkt was möglich ist!";
}

// ─── AI BILD via Pollinations (free, no API key) ──────────────────────────────
function genImageUrl(prompt) {
  const seed = Math.floor(Math.random() * 99999);
  const full = prompt + ", professional interior design photography, realistic, high quality, 4k";
  return "https://image.pollinations.ai/prompt/" + encodeURIComponent(full) + "?width=512&height=384&seed=" + seed + "&nologo=1&enhance=true";
}

const RAUM_PROMPTS = {
  bad: [
    { label: "Modern & Spa", prompt: "luxury spa bathroom renovation, frameless walk-in rain shower, large format 120x60cm dark charcoal porcelain tiles, floating teak wood vanity, LED backlit mirror, matte black Grohe faucets, warm 2700K cove lighting, architectural magazine editorial, photorealistic 8k" },
    { label: "Skandinavisch & Warm", prompt: "scandinavian bathroom renovation, white handmade zellige subway tiles, natural oak wood vanity and shelves, brushed gold Hansgrohe faucets, monstera plant, warm 2200K candlelight, herringbone marble floor, architectural magazine editorial, photorealistic 8k" },
    { label: "Mikrozement", prompt: "microcement bathroom renovation, seamless tadelakt concrete finish on all walls and floor, custom floating walnut vanity, minimal matte black tapware, hidden indirect LED cove lighting, zen minimalist, architectural magazine editorial, photorealistic 8k" },
  ],
  kueche: [
    { label: "Navy & Messing", prompt: "stunning modern kitchen renovation, deep navy blue shaker cabinets, unlacquered brass hardware, open floating white oak shelves, three Edison pendant lights over island, calacatta marble waterfall island, 12mm slim countertop, architectural magazine editorial, photorealistic 8k" },
    { label: "Seidengrau", prompt: "sleek contemporary kitchen renovation, silk grey lacquered flat front cabinets RAL7044, integrated Siemens appliances, matte black Quooker tap, large white ceramic backsplash, seamless 12mm countertop, continuous LED strip under all cabinets, architectural magazine editorial, photorealistic 8k" },
    { label: "Salbeigrün & Holz", prompt: "warm farmhouse kitchen renovation, sage green shaker cabinets, aged brass bin pulls, live edge walnut open shelves, white zellige tile backsplash, butcher block countertop, wicker pendant light, architectural magazine editorial, photorealistic 8k" },
  ],
  wohnzimmer: [
    { label: "Dunkelgrün Akzent", prompt: "dramatic living room renovation, deep forest green limewash accent wall, wide plank white oak herringbone floor, curved cream bouclé sofa, brass arc floor lamp, built-in bookcase with hidden LED cove strips, large fiddle leaf fig, architectural magazine editorial, photorealistic 8k" },
    { label: "Terrakotta warm", prompt: "earthy living room renovation, burnt terracotta venetian plaster accent wall, natural jute rug, curved rattan armchairs, low solid oak coffee table, warm 2200K ambient lighting, abundant indoor plants, architectural magazine editorial, photorealistic 8k" },
    { label: "TV-Wand Fluted Panel", prompt: "modern living room renovation, vertical fluted oak wood slat TV feature wall with hidden LED cove lighting behind top edge, minimalist floating shelf, warm oak herringbone floor, architectural magazine editorial, photorealistic 8k" },
  ],
  schlafzimmer: [
    { label: "Terrakotta & Bouclé", prompt: "serene bedroom renovation, warm terracotta venetian plaster accent wall, king size upholstered bouclé headboard with integrated LED frame, layered linen bedding oatmeal, aged brass wall sconces 2200K, vertical oak wood slat panels, architectural magazine editorial, photorealistic 8k" },
    { label: "Dunkle Decke", prompt: "moody luxury bedroom renovation, deep midnight navy ceiling, white limewash walls, indirect LED cove lighting 2700K, custom built-in wardrobe, velvet platform bed, brass bedside pendants, cinematic hotel aesthetic, architectural magazine editorial, photorealistic 8k" },
    { label: "Japandi", prompt: "japandi bedroom renovation, horizontal natural wood panel accent wall, neutral linen bedding sand tones, low platform bed in solid oak, minimal brass wall sconces 2700K, zen calm, architectural magazine editorial, photorealistic 8k" },
  ],
  terrasse: [
    { label: "WPC & Lounge", prompt: "beautiful modern terrace renovation, premium teak WPC decking with invisible clip system, modular outdoor sofa thick Sunbrella cushions, powder coated steel pergola with climbing jasmine, Edison string lights 2200K, large terracotta planters with olive trees, architectural magazine editorial, photorealistic 8k" },
    { label: "Mediterran", prompt: "mediterranean courtyard terrace renovation, natural limestone tiles, white limewashed walls, terracotta pots lavender and olive, wooden pergola with wisteria, ceramic pendant light, warm golden hour summer, architectural magazine editorial, photorealistic 8k" },
    { label: "Urban Jungle Balkon", prompt: "urban balcony jungle renovation, composite decking, lush tropical plants in matte black pots, bamboo privacy screen, curved rattan chair, solar warm white fairy lights, city apartment rooftop view, architectural magazine editorial, photorealistic 8k" },
  ],
};

const STIL_IDS = {
  bad: ["bad-modern", "bad-warm", "bad-mikro"],
  kueche: ["kueche-navy", "kueche-grau", "kueche-gruen"],
  wohnzimmer: ["wohn-gruen", "wohn-terra", "wohn-gruen"],
  schlafzimmer: ["schlaf-terra", "schlaf-dunkel", "schlaf-terra"],
  terrasse: ["terrasse-wpc", "terrasse-wpc", "terrasse-wpc"],
};

const VERCEL_URL = "";  // Empty = relative URL on Vercel

function MakeoverKarte({ preset, imgUrl, imgBase64 }) {
  const [aktiv, setAktiv] = useState(null);
  const [genImgs, setGenImgs] = useState({});
  const [loadingIdx, setLoadingIdx] = useState(null);
  const [errors, setErrors] = useState({});

  // Detect room type from preset labels
  function getRoomType() {
    const label = preset[0]?.label?.toLowerCase() || "";
    if (label.includes("spa") || label.includes("bad") || label.includes("dusche")) return "bad";
    if (label.includes("navy") || label.includes("küche") || label.includes("fronten")) return "kueche";
    if (label.includes("grün") || label.includes("terra") || label.includes("tv")) return "wohnzimmer";
    if (label.includes("japandi") || label.includes("decke") || label.includes("bett")) return "schlafzimmer";
    return "terrasse";
  }

  async function handleStilClick(i) {
    setAktiv(aktiv === i ? null : i);
    if (genImgs[i] || loadingIdx === i) return;
    setLoadingIdx(i);
    setErrors(prev => ({ ...prev, [i]: null }));
    const roomType = getRoomType();
    const styleIds = STIL_IDS[roomType] || STIL_IDS.bad;
    const styleId = styleIds[i] || styleIds[0];
    try {
      const res = await fetch(VERCEL_URL + "/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: imgBase64, style: styleId }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setGenImgs(prev => ({ ...prev, [i]: data.imageUrl }));
      } else {
        throw new Error(data.error || "Kein Bild erhalten");
      }
    } catch (e) {
      setErrors(prev => ({ ...prev, [i]: e.message }));
    } finally {
      setLoadingIdx(null);
    }
  }

  return (
    <div className="fu" style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, overflow: "hidden", marginTop: 8 }}>
      <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid " + C.border }}>
        <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 700 }}>Dein Makeover – 3 Stile</p>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Tippe auf einen Stil für das KI-Bild</p>
      </div>

      {/* Vorher */}
      <div style={{ padding: "12px 16px 8px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>📷 Vorher – Dein Raum</p>
        {imgUrl && <img src={imgUrl} alt="Vorher" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 10 }} />}
      </div>

      {/* Stil Buttons */}
      <div style={{ padding: "0 16px 10px", display: "flex", gap: 8 }}>
        {preset.map((stil, i) => (
          <button key={i} onClick={() => handleStilClick(i)} style={{
            flex: 1, padding: "8px 4px", borderRadius: 10,
            border: "2px solid " + (aktiv === i ? C.accent : C.border),
            background: aktiv === i ? C.accentBg : C.bg,
            color: aktiv === i ? C.accent : C.muted,
            fontSize: 11, fontWeight: 600, cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s",
            lineHeight: 1.3,
          }}>
            {stil.label}
          </button>
        ))}
      </div>

      {/* Nachher Bild */}
      {aktiv !== null && (
        <div className="fu" style={{ padding: "0 16px 16px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            ✨ Nachher – {preset[aktiv].label}
          </p>
          <div style={{ width: "100%", height: 200, borderRadius: 12, overflow: "hidden", background: C.border, position: "relative" }}>
            {genImgs[aktiv] ? (
              <img src={genImgs[aktiv]} alt={preset[aktiv].label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : errors[aktiv] ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8, padding: 16 }}>
                <p style={{ fontSize: 13, color: "#B91C1C", textAlign: "center" }}>⚠️ {errors[aktiv]}</p>
                <button onClick={() => { setErrors(prev => ({ ...prev, [aktiv]: null })); handleStilClick(aktiv); }} style={{ padding: "6px 14px", borderRadius: 20, background: C.accent, color: "white", border: "none", cursor: "pointer", fontSize: 12 }}>
                  Nochmal versuchen
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10 }}>
                <LoadingSpinner size={28} />
                <p style={{ fontSize: 13, color: C.muted }}>KI generiert Bild… (15-30 Sek.)</p>
              </div>
            )}
          </div>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 8, textAlign: "center" }}>
            KI-generierte Visualisierung · Kann je nach Gerät einige Sekunden dauern
          </p>
        </div>
      )}
    </div>
  );
}

// ─── TAB 1: CHAT ─────────────────────────────────────────────────────────────
function ChatTab({ onSave, messages, setMessages }) {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    const text = inputText.trim();
    if (!text || loading) return;
    const userMsg = { role: "user", text };
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    const allMsgs = [...messages, userMsg];
    const firstUser = allMsgs.findIndex(m => m.role === "user");
    const apiMessages = allMsgs.slice(firstUser).map(m => ({ role: m.role, content: m.text }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });
      const data = await res.json();
      const reply = data?.reply;
      if (reply) {
        setMessages(prev => [...prev, { role: "assistant", text: reply }]);
      } else {
        throw new Error("Keine Antwort");
      }
    } catch (e) {
      const offline = getRenovierungsAntwort(text, false);
      setMessages(prev => [...prev, { role: "assistant", text: offline }]);
    }
    setLoading(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Chat ist jetzt Teil der vollständigen App */}

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px" }}>
        {messages.map((msg, i) => (
          <div key={i} className="fu" style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            marginBottom: 14, gap: 8, alignItems: "flex-end",
          }}>
            {msg.role === "assistant" && (
              <div style={{ width: 30, height: 30, background: C.accent, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🔨</div>
            )}
            <div style={{ maxWidth: "85%" }}>
              <div style={{
                background: msg.role === "user" ? C.accent : C.card,
                color: msg.role === "user" ? "#fff" : C.text,
                border: msg.role === "assistant" ? "1px solid " + C.border : "none",
                borderRadius: msg.role === "user" ? "16px 16px 3px 16px" : "16px 16px 16px 3px",
                padding: "11px 15px", fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap",
              }}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
            <div style={{ width: 30, height: 30, background: C.accent, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🔨</div>
            <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: "16px 16px 16px 3px", padding: "12px 16px", display: "flex", gap: 5 }}>
              {[0,1,2].map(j => <div key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: C.muted, animation: "blink 1.2s ease " + j*0.2 + "s infinite" }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "8px 14px 14px", borderTop: "1px solid " + C.border, background: C.card }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Frag mich alles über Renovierung…"
            rows={2}
            style={{ flex: 1, resize: "none", border: "2px solid " + C.border, borderRadius: 12, padding: "9px 13px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", background: C.bg, lineHeight: 1.5 }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !inputText.trim()}
            style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: loading || !inputText.trim() ? C.border : C.accent,
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontSize: 18,
            }}
          >
            {loading ? <LoadingSpinner size={18} /> : "→"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TAB 2: IDEEN & TRENDS ────────────────────────────────────────────────────

const TRENDS = [
  { title: "Dunkle Küchenfronten", desc: "Navy, Dunkelgrün, Anthrazit – weg von Weiß. Mattschwarz-Armaturen dazu = Magazin-Look.", how: "Fronten folieren oder lackieren", cost: "ab 80€", emoji: "🖤", color: "#1a1a2e", img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=220&fit=crop&q=80" },
  { title: "Warme Erdetöne", desc: "Terrakotta, Ocker, Sandstein statt kaltem Grau. In Farbe, Kissen, Keramik.", how: "Akzentwand + Deko tauschen", cost: "ab 30€", emoji: "🍂", color: "#c4622d", img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=220&fit=crop&q=80" },
  { title: "Mikrozement-Optik", desc: "Beton-Look auf Wänden und Böden. Edel, zeitlos. Klebefolie als günstige Alternative.", how: "Folie oder echter Mikrozement", cost: "ab 50€", emoji: "🏛️", color: "#6b6b6b", img: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=600&h=220&fit=crop&q=80" },
  { title: "Großformatige Fliesen", desc: "60×60 oder 120×60 statt kleiner Kacheln. Lässt Räume sofort größer wirken.", how: "Über alte Fliesen möglich", cost: "ab 20€/m²", emoji: "⬛", color: "#2c2c2c", img: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&h=220&fit=crop&q=80" },
  { title: "Mattschwarz überall", desc: "Armaturen, Griffe, Lampen – ein Farbton, kompletter Stil-Shift.", how: "Armaturen + Griffe selbst tauschen", cost: "ab 40€", emoji: "🔩", color: "#1a1a1a", img: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=600&h=220&fit=crop&q=80" },
  { title: "Offene Regale", desc: "Küche und Wohnzimmer: offen, luftig, persönlich. Holzbretter statt Schränke.", how: "Schwebende Regale montieren", cost: "ab 60€", emoji: "📚", color: "#8B6F47", img: "https://images.unsplash.com/photo-1556909211-36987e6e9a65?w=600&h=220&fit=crop&q=80" },
  { title: "Indoor-Pflanzen als Design", desc: "Monstera, Ficus, Olivenbaum als Hauptelement statt Deko-Beiwerk.", how: "Sofort umsetzbar", cost: "ab 20€", emoji: "🌿", color: "#3a7a56", img: "https://images.unsplash.com/photo-1416879595882-b3d065a0e45d?w=600&h=220&fit=crop&q=80" },
  { title: "Wellness-Bad", desc: "Walk-In Dusche, Regendusche, warmes Licht, Holz-Elemente. Hotel-Feeling zuhause.", how: "Licht + Armaturen als Start", cost: "ab 100€", emoji: "🚿", color: "#2a4858", img: "https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=600&h=220&fit=crop&q=80" },
  { title: "Statement-Wand", desc: "Wandpaneele aus MDF, Holzlatten oder Bouclé-Tapete. Hinter dem TV oder Bett.", how: "MDF zuschneiden + lackieren", cost: "ab 80€", emoji: "🎨", color: "#5a4a3a", img: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=220&fit=crop&q=80" },
  { title: "Goldene Akzente", desc: "Gebürstetes Gold bei Griffen, Lampen, Spiegelrahmen. Warm und luxuriös.", how: "Griffe + Leuchtmittel tauschen", cost: "ab 30€", emoji: "✨", color: "#B8860B", img: "https://images.unsplash.com/photo-1618220179428-22790b461013?w=600&h=220&fit=crop&q=80" },
  { title: "Outdoor-Lounge", desc: "Terrasse oder Balkon als echtes Wohnzimmer draußen. Holz, Polster, Licht.", how: "Klickfliesen + Paletten-Sofa", cost: "ab 100€", emoji: "🌴", color: "#3d6b47", img: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=600&h=220&fit=crop&q=80" },
  { title: "Holz als Akzent", desc: "Echte Holzelemente gegen sterile Oberflächen. Eiche, Nuss, Akazie – warm und zeitlos.", how: "Regale + Arbeitsplatte + Deko", cost: "ab 50€", emoji: "🪵", color: "#7B4F2E", img: "https://images.unsplash.com/photo-1556909045-6bfe81e67c53?w=600&h=220&fit=crop&q=80" },
];

// ─── AFFILIATE PRODUKT-DATENBANK ─────────────────────────────────────────────
// Ersetze "DEIN-TAG" mit deinem Amazon Partnernet Tag (Format: xyz-21)
const AFFILIATE_TAG = "renopilot-21";

function amazonLink(search) {
  return "https://www.amazon.de/s?k=" + encodeURIComponent(search) + "&tag=" + AFFILIATE_TAG;
}

const PRODUKTE = {
  // Bad
  "Silikon":         { name: "Soudal Bad-Silikon (Schimmelschutz)", link: amazonLink("Soudal Bad Silikon Schimmelschutz") },
  "LED-Spiegel":     { name: "LED-Spiegel IP44 (Emke)", link: amazonLink("LED Spiegel Bad IP44 Emke") },
  "SPC-Vinyl":       { name: "SPC Vinyl Boden 5mm (wasserfest)", link: amazonLink("SPC Vinyl Boden wasserfest Rigid Core") },
  "Mikrozement":     { name: "Mikrozement Set (inkl. Versiegelung)", link: amazonLink("Mikrozement Set Boden Wand Versiegelung") },
  "Mattschwarz-Armatur": { name: "Mattschwarz Armatur (Waschtisch)", link: amazonLink("Waschtischarmatur mattschwarz") },
  "Fliesenhaftkleber": { name: "Flexkleber C2 (Fliesen über Fliesen)", link: amazonLink("Flexkleber C2 Fliesen über Fliesen Murfix") },
  "Dichtschlämme":   { name: "Dichtschlämme 2K (Abdichtung Bad)", link: amazonLink("Dichtschlaemme 2K Dusche Abdichtung") },
  "Fugenband":       { name: "Fugenband Glasflies (Trockenbau)", link: amazonLink("Fugenband Glasflies Trockenbau") },
  // Küche
  "Griffe-Mattschwarz": { name: "Küchen-Griffe Mattschwarz 128mm (20er Set)", link: amazonLink("Küchen Griffe mattschwarz 128mm Set") },
  "Klebefolie-Holz": { name: "Klebefolie Holzoptik (für Fronten)", link: amazonLink("Klebefolie Holzoptik Küche selbstklebend") },
  "LED-Streifen":    { name: "LED-Strip 2700K warmweiß (5m)", link: amazonLink("LED Streifen warmweiss 2700K 5m dimmbar") },
  "Fliesenlack":     { name: "Fliesenfarbe + Primer Set", link: amazonLink("Fliesenfarbe Primer Set Bad Küche") },
  // Boden
  "Laminat":         { name: "Laminat Eiche 8mm Klick (Musterset)", link: amazonLink("Laminat Eiche 8mm Klick Muster") },
  "Trittschalldämmung": { name: "Trittschalldämmung 3mm (Rolle 15m²)", link: amazonLink("Trittschalldaemmung 3mm Laminat Vinyl") },
  "Parkett-Öl":      { name: "Osmo Hartwachsöl 3032 (750ml)", link: amazonLink("Osmo Hartwachsöl 3032 750ml") },
  // Wand
  "Wandfarbe":       { name: "Wandfarbe Seidenmatt (Testmuster)", link: amazonLink("Wandfarbe seidenmatt Erdtöne Terrakotta") },
  "Fluted-Panel":    { name: "Wandpaneele MDF Fluted (1m²)", link: amazonLink("Wandpaneele MDF Fluted Panel Holzoptik") },
  "Holzpaneele":     { name: "Echtholz-Wandpaneele selbstklebend", link: amazonLink("Echtholz Wandpaneele selbstklebend") },
  "Rigips":          { name: "Fertigspachtel 5kg (Knauf)", link: amazonLink("Knauf Fertigspachtel 5kg Gipskarton") },
  // Decke
  "LED-Profil":      { name: "Alu LED-Profil flach + Abdeckung (2m)", link: amazonLink("Alu LED Profil flach Unterputz 2m") },
  "Einbaustrahler":  { name: "LED Einbaustrahler GU10 IP44 (5er Set)", link: amazonLink("LED Einbaustrahler GU10 IP44 Set") },
  // Werkzeug
  "Fugenschneider":  { name: "Silikon-Entferner Werkzeug Set", link: amazonLink("Silikon Entferner Fugenreiniger Set") },
  "Fliesenkreuzchen":{ name: "Fliesenkreuze 2mm + Fugenglätter Set", link: amazonLink("Fliesenkreuze 2mm Fugenglätter Set") },
  "Gummihammer":     { name: "Gummihammer 500g (Fliesen/Laminat)", link: amazonLink("Gummihammer 500g Fliesen Laminat") },
  "Kreppband":       { name: "Kreppband Goldband 25mm (10 Rollen)", link: amazonLink("Kreppband Goldband 25mm Malerkrepp") },
};

// Map idea titles to relevant products
const IDEEN_PRODUKTE = {
  "Silikon komplett erneuern": ["Silikon", "Fugenschneider"],
  "LED-Spiegel tauschen": ["LED-Spiegel"],
  "Armaturen auf Mattschwarz": ["Mattschwarz-Armatur"],
  "Mikrozement / Tadelakt Boden": ["Mikrozement"],
  "Mikrozement Boden fugenlos": ["Mikrozement"],
  "Mikrozement Wand": ["Mikrozement"],
  "SPC-Vinyl (Rigid Core) über Fliesen": ["SPC-Vinyl"],
  "SPC-Vinyl über Fliesen": ["SPC-Vinyl"],
  "SPC-Vinyl Holzoptik warm": ["SPC-Vinyl", "Trittschalldämmung"],
  "Großformatige Feinsteinzeug-Fliesen": ["Fliesenhaftkleber", "Fliesenkreuzchen"],
  "Wandpaneele MDF/Holz": ["Holzpaneele", "Fluted-Panel"],
  "Fluted Panel / Gerillte Paneele hinter Bett": ["Fluted-Panel"],
  "TV-Wand aus Holzlatten": ["Fluted-Panel"],
  "Wandpaneele / Holzpaneele montieren": ["Holzpaneele"],
  "Griffe tauschen": ["Griffe-Mattschwarz"],
  "Küchenfronten folieren": ["Klebefolie-Holz"],
  "Unter-Schrank-Beleuchtung LED-Profil": ["LED-Streifen", "LED-Profil"],
  "LED-Kanal in Rigips fräsen": ["LED-Profil"],
  "LED-Kanal in Spachtel einlassen": ["LED-Profil"],
  "LED-Kanal bündig einspachteln": ["LED-Profil"],
  "Einbaustrahler in Rigips setzen": ["Einbaustrahler"],
  "Einbaustrahler Raster (IP65)": ["Einbaustrahler"],
  "Laminat komplett verlegen": ["Laminat", "Trittschalldämmung"],
  "Laminat verlegen": ["Laminat", "Trittschalldämmung"],
  "Parkett schleifen & ölen": ["Parkett-Öl"],
  "Akzentwand in Beton-Optik": ["Wandfarbe"],
  "Akzentwand spachteln Erdton": ["Wandfarbe"],
  "Wände spachteln & glätten": ["Rigips"],
  "Wand spachteln & glatt ziehen": ["Rigips"],
  "Dusche komplett abdichten": ["Dichtschlämme", "Fugenband"],
  "Alte Fliesen stemmen & neu fliesen": ["Fliesenhaftkleber", "Fliesenkreuzchen", "Gummihammer"],
  "Fliesen über Fliesen": ["Fliesenhaftkleber", "Fliesenkreuzchen"],
};


const IDEAS = [
  {
    cat: "Badezimmer 🚿", bg: "#E8F4F8",
    sections: [
      { label: "🪵 Boden – komplett neu", color: "#7B4F2E", items: [
        { t: "Großformatige Feinsteinzeug-Fliesen", d: "120×60cm oder 60×60cm Fliesen in Beton- oder Steinoptik. Kein Stemmen nötig – direkt über alte Fliesen mit Fliesenhaftkleber (z.B. Murfix). Weniger Fugen = hygienischer. Tipp: Rektifizierte Fliesen = sauberere Fugenbilder (1mm Fuge möglich).", lvl: "Mittel", cost: "25–70€/m²", yt: "großformatige Fliesen Bad verlegen Anleitung" },
        { t: "Mikrozement / Tadelakt Boden", d: "Fugenloser Betonlook – der größte Trend 2025/2026. Tadelakt ist marokkanischer Kalkputz, Mikrozement ist moderner. Direkt über Estrich oder Fliesen. 3 Schichten: Haftgrund → Mikrozement → 2× Polyurethan-Versiegelung. Zwischen jeder Schicht schleifen.", lvl: "Mittel", cost: "60–130€/m²", yt: "Mikrozement Bad Boden auftragen Anleitung fugenlos" },
        { t: "SPC-Vinyl (Rigid Core) über Fliesen", d: "100% wasserfest, keine Feuchtigkeit von unten. SPC = Stone Polymer Composite – stabiler als normales Vinyl. Klicksystem direkt über Fliesen, max. 3mm Unebenheit erlaubt. Keine Verklebung, keine Fuge nötig. Stärke: mind. 5mm wählen.", lvl: "Anfänger ✓", cost: "18–35€/m²", yt: "SPC Vinyl Bad verlegen über Fliesen Anleitung" },
        { t: "Elektrische Fußbodenheizung nachrüsten", d: "Heizmatte (z.B. Dimplex, Warmup) unter Fliesen verlegen. Anschluss an Thermostat. Ca. 100W/m² Verbrauch. Elektriker nötig für Anschluss. Einbau vor dem Fliesen – Matte in Fliebenkleber einbetten.", lvl: "Elektriker nötig", cost: "50–150€/m²", yt: "Fußbodenheizung nachrüsten elektrisch Fliesen Bad" },
      ]},
      { label: "🧱 Wände – Sanierung & Gestaltung", color: "#6B6B6B", items: [
        { t: "Wandpaneele (RenoDeco / Alu-Verbund)", d: "3mm Alu-Verbundplatten direkt über Fliesen kleben – fugenlos, hygienisch, schnell. Kein Stemmen, kein Handwerker. RenoDeco, Kerradeco oder Aquapanel sind bekannte Systeme. Mit Silikon an Rändern abdichten. Kosten ca. 30–60€/m².", lvl: "Anfänger ✓", cost: "30–60€/m²", yt: "Wandpaneele Bad kleben über Fliesen RenoDeco Anleitung" },
        { t: "Mikrozement Wand über Fliesen", d: "Fugenloser Beton-Look. Fliesen schleifen (80er), Haftgrund auftragen, 2× Mikrozement aufspachteln, schleifen, 2× Polyurethan-Versiegelung. Kein Stemmen! Marken: Topciment, Cementec, OBI Eigenmarke.", lvl: "Mittel", cost: "60–120€/m²", yt: "Mikrozement Wand Bad Fliesen drüber Anleitung" },
        { t: "Zellige-Fliesen setzen (Handgemacht)", d: "Trend 2025/2026 – marokkanische handgemachte Fliesen mit unregelmäßiger Oberfläche. 10×10cm oder 7,5×15cm. Charme durch Unvollkommenheit. Fugenstärke 3–5mm, Fugenmasse in Weiß oder Grau. Mehr Aufwand beim Verlegen wegen ungleichmäßiger Stärke.", lvl: "Mittel", cost: "40–120€/m²", yt: "Zellige Fliesen verlegen Anleitung Bad Küche" },
        { t: "Silikon komplett erneuern", d: "Pflicht bei jeder Badsanierung! Altes Silikon mit Cuttermesser + Silikonentferner raus. Fläche mit Isopropanol entfetten. Abklebeband, Bad-Silikon mit Schimmelpilzschutz (Soudal, Ottoseal S100), mit feuchtem Finger glätten. 24h trocknen.", lvl: "Anfänger ✓", cost: "15–35€", yt: "Silikonfuge Bad erneuern komplett Anleitung Soudal" },
        { t: "Dusche komplett abdichten", d: "Vor dem Fliesen: Dichtband + Dichtmanschetten an alle Ecken und Anschlüsse. Produkte: Schlüter KERDI, Mapei Mapelastic, Ardex. Mindestens 2 Lagen Dichtschlämme. Trockenzeit zwischen Lagen. Fehler hier = Wasserschaden!", lvl: "Fortgeschritten", cost: "80–200€", yt: "Dusche abdichten Dichtschlämme Anleitung KERDI" },
      ]},
      { label: "🔝 Decke – handwerklich", color: "#2c2c2c", items: [
        { t: "Abgehängte Rigips-Decke (Feuchtraumplatte)", d: "Grüne Rigips-Platten (GKFI) für Feuchträume! Metallständerwerk mit Direktabhängern an Bestandsdecke, Platten verschrauben, Fugen bandagieren, Spachtelmasse Q2, schleifen, Feuchtraumfarbe. Mindesthöhe: 2,30m einhalten.", lvl: "Fortgeschritten", cost: "20–40€/m²", yt: "abgehängte Decke Bad Rigips GKFI Feuchtraum Anleitung" },
        { t: "LED-Einbaustrahler Raster (IP65)", d: "IP65 Pflicht im Bereich 1 (über Wanne/Dusche)! Raster planen (alle 50–60cm), Lochsäge 75mm, GU10 LED-Strahler 2700K einsetzen. Elektriker für Anschluss. Warm-weiß 2700K = Spa-Atmosphäre. Dimmer einplanen!", lvl: "Elektriker nötig", cost: "15–30€/Spot + Elektriker", yt: "Einbaustrahler Bad IP65 IP44 setzen Raster Anleitung" },
        { t: "LED-Profil in Rigips einspachteln", d: "Alu-Profil (z.B. Häfele, Lumines) auf Rigipsdecke schrauben, mit Spachtelmasse bündig einarbeiten, schleifen, streichen. LED-Strip 2700K einlegen, Diffusor-Abdeckung drauf. Unsichtbare Lichtquelle – nur warmes Licht sichtbar.", lvl: "Fortgeschritten", cost: "40–100€", yt: "LED Profil Decke einspachteln bündig Bad Anleitung" },
        { t: "Dunkle Deckenfarbe Feuchtraum", d: "Anthrazit oder Dunkelgrün an der Baddecke mit Feuchtraumfarbe (Schimmelschutz!). Erzeugt Wellness-Intimität. Abkleben an Wandübergang. 2 Schichten. Marken: Schöner Wohnen Bad & Küche, Alpina Feuchtraum.", lvl: "Anfänger ✓", cost: "25–50€", yt: "Bad Decke dunkel streichen Feuchtraumfarbe Anleitung" },
      ]},
      { label: "✨ Ausstattung & Armaturen", color: "#3a7a56", items: [
        { t: "Walk-In Dusche (bodengleich)", d: "Badewanne raus → bodengleiche Duschwanne (Steinlin, Kaldewei, Bette) → Glasabtrennung (mind. 8mm ESG). Wichtig: Gefälleestrich mind. 1,5%, Ablauf mittig oder wandseitig. Wasseranschluss = Installateur. Regendusche an Decke = Wow-Effekt.", lvl: "Fortgeschritten", cost: "800–3.000€", yt: "Walk in Dusche einbauen bodengleich Anleitung Gefälle" },
        { t: "Freistehende Badewanne installieren", d: "Trend 2025: Freistehende Acryl- oder Gusseisenwanne als Raumblickfang. Wannenanschluss über Boden-Wannenarmatur (z.B. Grohe, Hansgrohe). Klempner für Zu- und Ablauf. Unter Wanne: Wannenträger oder Wanne mit Füßen.", lvl: "Fortgeschritten", cost: "600–3.000€", yt: "freistehende Badewanne anschließen installieren Anleitung" },
        { t: "Spülrandloses WC montieren", d: "Trend 2025/2026: kein Spülrand = hygienischer, leichter zu reinigen. WC abflankieren, WC-Anschluss mit flexiblem WC-Anschlussrohr, Anker in Wand. Vorwandinstallation (z.B. Geberit Duofix) für schwebende Optik.",  lvl: "Mittel", cost: "200–800€", yt: "spülrandloses WC montieren Vorwandinstallation Anleitung" },
        { t: "Mattschwarz-Armaturen tauschen", d: "Trend 2025: Mattschwarz (z.B. Grohe Essence, Hansgrohe Metropol) statt Chrom. Wasser abstellen, Siphon lösen, neue Armatur montieren. Hanf + Teflonband für dichte Verschraubungen. Kalkschutz-Beschichtung auf mattschwarzen Armaturen beachten.", lvl: "Mittel", cost: "80–400€", yt: "Armatur tauschen montieren Anleitung Mattschwarz Bad" },
        { t: "LED-Spiegel mit Beschlagfrei-Heizung", d: "IP44 Pflicht! LED-Spiegel mit Spiegelheizung (z.B. Emke, Badspiegel24) montieren. Wanddübel, Spiegel hängen. Kabelanschluss: Schuko-Stecker oder Festanschluss (Elektriker). Farbtemperatur: 3000–4000K für Make-up, 2700K für Atmosphäre.", lvl: "Anfänger ✓", cost: "80–350€", yt: "LED Spiegel Bad montieren IP44 Beschlagfrei Anleitung" },
        { t: "Handtuchheizkörper elektrisch", d: "Elektrischer Handtuchheizkörper (z.B. Kermi, Zehnder) direkt an Steckdose oder Festanschluss. Montage mit Wanddübeln, Wasserwaage. Verbrauch ca. 40–100W. Modelle mit Timer und Thermostat empfohlen.", lvl: "Anfänger ✓", cost: "100–400€", yt: "Handtuchheizkörper elektrisch montieren Bad Anleitung" },
      ]},
    ],
  },
  {
    cat: "Küche 🍳", bg: "#F8F3E8",
    sections: [
      { label: "🪵 Boden – Untergrund & Belag", color: "#7B4F2E", items: [
        { t: "Untergrund vorbereiten & ausgleichen", d: "Pflicht vor jedem Bodenbelag! Unebenheiten >3mm mit selbstverlaufender Ausgleichsmasse (Knauf Nivello, Ardex K39) ausgleichen. Risse mit Haftbrücke + Mörtel schließen. 24h Trockenzeit. Feuchtigkeitsmessung: max. 2% CM-Wert bei Zementestrich.", lvl: "Anfänger ✓", cost: "20–60€", yt: "Boden ausgleichen Ausgleichsmasse Küche Anleitung" },
        { t: "SPC-Vinyl in Holzoptik", d: "Wasserfest, robust, Klicksystem. Eiche Natur, Nussbaum oder Esche – aktuelle Trendoptiken. Stärke mind. 5mm, Nutzschicht 0,5mm. Über alte Fliesen möglich. HARO, Parador, Quick-Step empfohlen. Fischgrät-Muster besonders edel.", lvl: "Anfänger ✓", cost: "20–45€/m²", yt: "SPC Vinyl Küche verlegen Holzoptik Klicksystem" },
        { t: "Feinsteinzeug großformatig", d: "60×120cm oder 90×90cm Großformat macht Küche optisch größer. Rektifiziert = 1mm Fugen möglich. Betonoptik oder Marmoroptik. R10 Rutschhemmung für Küchenboden. Über alte Fliesen: Spezialhaftkleber verwenden.", lvl: "Mittel", cost: "30–80€/m²", yt: "Feinsteinzeug Großformat Küche verlegen Anleitung" },
        { t: "Terrakotta-Fliesen (Trend 2025/2026)", d: "Handgemachte Terrakotta oder Terrakotta-Optik-Fliesen – Trend aus Südeuropa. Hexagonal oder quadratisch. Natürliche Unregelmäßigkeiten erwünscht. Imprägnieren vor der Nutzung! Warm und einladend.", lvl: "Mittel", cost: "35–90€/m²", yt: "Terrakotta Fliesen verlegen Küche Anleitung pflegen" },
      ]},
      { label: "🧱 Fronten & Wände – alles neu", color: "#6B6B6B", items: [
        { t: "Fronten lackieren (Profi-Finish)", d: "Schritte: Fronten ausbauen, schleifen (P120→P180), Haftgrund auftragen, trocknen, 2–3× Seidenmatt-Lack (Jotun Sens, Farrow & Ball, Alpina). Trendfarben 2026: Moody Neutrals (Sandbeige, Taupe), Salbeigrün, Mitternachtsblau. Zwischen Schichten leicht anschleifen.", lvl: "Mittel", cost: "100–400€", yt: "Küchenfronten lackieren Profi Anleitung Schritt" },
        { t: "Grifflose Fronten nachrüsten", d: "Trend 2025/2026: grifflose Fronten durch J-Pull oder integrierte Griffleiste. Nachrüsten: Griffmulden-Fräsung oder Tip-On Druckschnapper (Blum). Sieht hochwertig aus und spart Reinigungs-Aufwand.", lvl: "Mittel", cost: "50–300€", yt: "grifflose Fronten nachrüsten Küche Tip-On Anleitung" },
        { t: "Zellige / marokkanische Rückwand", d: "Trend 2025/2026 laut Archiproducts: handgemachte Zellige-Fliesen als Küchenrückwand. 10×10cm in Weiß, Grün oder Ocker. Charme durch Unregelmäßigkeit. Fugenstärke 3–5mm. Über alte Fliesen möglich mit Haftkleber.", lvl: "Mittel", cost: "50–150€", yt: "Zellige Fliesen Küche Rückwand verlegen Anleitung" },
        { t: "Naturstein Arbeitsplatte (Quarzit/Granit)", d: "Trend 2025/2026: Naturstein mit sichtbarer Maserung statt Hochglanz. Quarzit, Granit, Travertin oder Marmor. Auf Maß schneiden lassen. Fugen mit Silikon, kein harter Mörtel. Jährlich versiegeln. Langlebiger als Laminat.", lvl: "Fortgeschritten", cost: "300–1.200€", yt: "Naturstein Arbeitsplatte Küche einbauen montieren" },
        { t: "Stahl-Arbeitsplatte (Trend 2026)", d: "Laut Archiproducts ist Stahl das führende Material 2026 – als monolithischer Block oder Arbeitsplatte. Gebürstet oder satiniert. Pflegeleicht, hygienisch. Kann auf Maß gefertigt werden. Kombination mit Holz besonders beliebt.", lvl: "Fortgeschritten", cost: "400–1.500€", yt: "Stahl Edelstahl Arbeitsplatte Küche einbauen" },
        { t: "Offene Regale aus Massivholz", d: "Eiche oder Nussbaum auf schwebenden Wandträgern (Hairpin oder Konsolen). Oberschränke demontieren, Wand ausbessern, Träger in Mauerwerk dübeln (mind. 8cm tief, Stahlträger!). Brett mind. 4cm stark. Ölen vor Montage.", lvl: "Mittel", cost: "100–400€", yt: "schwebende Regale Küche Massivholz montieren Anleitung" },
      ]},
      { label: "🔝 Decke & Licht", color: "#2c2c2c", items: [
        { t: "Einbaustrahler Raster planen", d: "Abstand zwischen Strahlern: ca. 80–100cm. Von Wand: 40–50cm. Lochsäge 68mm, GU10 LED 3000K (Küche = neutraler als Wohnraum). Dimmer einplanen. Elektriker für neue Stromkreise. Watt: 5–7W pro Spot reicht.", lvl: "Elektriker nötig", cost: "10–25€/Spot + Elektriker", yt: "Einbaustrahler Raster Küche planen setzen Anleitung" },
        { t: "Pendelleuchten über Insel/Esstisch", d: "Abstand Unterkante Lampe zu Tischplatte: 65–75cm. 3 Pendelleuchten im gleichen Abstand. Baldachin an Decke, Kabel kürzen. Warmweiß 2700K. Messing oder Mattschwarz – Trend 2025. Ohne Elektriker wenn Steckdosenanschluss.", lvl: "Anfänger ✓", cost: "60–300€", yt: "Pendelleuchten Kücheninsel montieren Abstand Anleitung" },
        { t: "Unter-Schrank-Beleuchtung LED-Profil", d: "Alu-LED-Profil (Häfele, Lumines) an Unterseite Oberschränke. Slim-Profile 6mm unsichtbar. Warm 2700K – macht Essen appetitlicher. Zuleitung durch Schrank verstecken. Dimmbarer Trafo empfohlen.", lvl: "Anfänger ✓", cost: "30–80€", yt: "LED Profil unter Schrank Küche montieren Anleitung" },
      ]},
      { label: "✨ Ausstattung & Details", color: "#3a7a56", items: [
        { t: "Quooker Kochendwasserhahn", d: "Trend 2025/2026: Multifunktionsarmatur – kochendes, gekühltes und gefiltertes Wasser. Einbau statt normaler Armatur. Tank unter Spüle (4L). Stromanschluss nötig. Grohe, Franke, Quooker. Spart Zeit und Energie.", lvl: "Mittel", cost: "500–1.500€", yt: "Quooker Kochendwasserhahn einbauen montieren Anleitung" },
        { t: "Spüle tauschen (Granit/Silgranit)", d: "Blanco Silgranit, Franke Fragranit – kratzfest, hitzebeständig, hygienisch. Ausschnitt anpassen (Stichsäge), Haltefedern von unten, Silikon abdichten. Siphon anschließen. Unterbau-Spülen = maximaler Platz.", lvl: "Mittel", cost: "200–600€", yt: "Küchenspüle tauschen einbauen Granit Silgranit Anleitung" },
        { t: "Griffe & Beschläge aufwerten", d: "Trendfarben 2025/2026: Bronzefarben, Kupfer, gebürstetes Messing. Standard-Abstand: 128mm oder 192mm. 30 Minuten für ganze Küche. Marken: Häfele, SO-TECH, IKEA. Hochwertiger Look für kleines Geld.", lvl: "Anfänger ✓", cost: "40–150€", yt: "Küchen Griffe Beschläge tauschen aufwerten Anleitung" },
        { t: "Dunstabzug tauschen (Deckenhaube)", d: "Trend 2026: Inselhaube oder Flachdeckenhaube statt Wand-Haube. Maß: mind. so breit wie Kochfeld, besser 10cm breiter. Umluft oder Abluft. Siemens, Bosch, AEG. Anschluss oft Plug&Play an vorhandene Leitungen.", lvl: "Mittel", cost: "150–600€", yt: "Dunstabzugshaube tauschen Deckenhaube Anleitung" },
      ]},
    ],
  },
  {
    cat: "Wohnzimmer 🛋️", bg: "#F0EDF8",
    sections: [
      { label: "🪵 Boden – komplett neu", color: "#7B4F2E", items: [
        { t: "Landhausdielen-Optik Vinyl/Laminat", d: "Breite Dielen (20cm+) in Eiche, Nussbaum oder Räuchereiche – Trend 2025. Klicksystem, Trittschalldämmung (mind. 3mm) darunter. HARO, Pergo, Parador. Fischgrät-Verlegung besonders edel aber zeitaufwändiger.", lvl: "Anfänger ✓", cost: "15–45€/m²", yt: "Laminat Vinyl Landhausdiele verlegen Fischgrät Anleitung" },
        { t: "Parkett schleifen & ölen (Aufarbeitung)", d: "Schleifmaschine mieten (OBI/Bauhaus, 40–60€/Tag). Körnung: 40er→80er→120er. Staubabsaugung anschließen! Zwischen Schichten Parkett nass aufnehmen. Hartwachsöl (Osmo) 2× auftragen, 12h trocknen. Kanten mit Kantenschleifer.", lvl: "Mittel", cost: "80–200€ + Miete", yt: "Parkett abschleifen ölen aufarbeiten Anleitung Osmo" },
        { t: "Teppich richtig verlegen", d: "Teppich 10cm größer zuschneiden als Raum, mit Teppichklebeband fixieren oder lose verlegen. Teppichunterlage (Filz/Schaumstoff) darunter. Kanten mit Profilleiste oder Teppichmesser sauber abschneiden. Naht in Raumecke oder unter Möbel verstecken.", lvl: "Anfänger ✓", cost: "20–60€/m² + Unterlage", yt: "Teppich verlegen Anleitung richtig zuschneiden Naht" },
      ]},
      { label: "🧱 Wände – Gestaltung & Struktur", color: "#6B6B6B", items: [
        { t: "Limewash / Kalkfarbe (Trend 2025)", d: "Trendwand 2025/2026 – lebendige, atmungsaktive Oberfläche mit Tiefenwirkung. Marken: Bauwerk Colour, Keim Equaplex, Kreidezeit. Auftragen mit Brush in Lagen. Jede Lage etwas abweichend wischen = lebendigere Struktur. Kein Grundieren nötig.", lvl: "Mittel", cost: "40–120€", yt: "Limewash Kalkfarbe Wand auftragen Anleitung Trend" },
        { t: "Venezianischer Putz auftragen", d: "Edler Marmorino- oder Stucco-Venetiano-Putz für Akzentwände. 2–3 Schichten mit Glättekelle auftragen, zwischen Schichten polieren. Dann mit Edelstahlkelle hochpolieren = Seidenglanz. Professionelles Ergebnis braucht Übung.", lvl: "Fortgeschritten", cost: "50–150€", yt: "Venezianischer Putz Stucco auftragen Anleitung Wand" },
        { t: "TV-Wand mit Holzlatten (Fluted Panel)", d: "Trend 2025: Gerillte MDF-Latten (Fluted Panel) hinter TV. Fertige Paneele bei OBI/Bauhaus ab 30€/m². Auf Holzlattung oder direkt auf Wand kleben. Vor Montage lackieren/ölen. Kabel-Kanal hinter Paneelen verstecken. Beleuchtung dahinter = besonderer Effekt.", lvl: "Mittel", cost: "80–300€", yt: "Fluted Panel TV Wand Holzlatten montieren Anleitung" },
        { t: "Rigips Trockenbau-Nische bauen", d: "TV in die Wand einlassen: Metallständer, Rigips verschrauben, Kanten verspachteln, abschleifen. TV-Halterung in Metallständer verankern (NICHT Rigips!). Kabel vorab einziehen. Ergebnis: TV sitzt bündig in der Wand.", lvl: "Fortgeschritten", cost: "150–400€", yt: "Rigips Nische TV Wand einbauen Trockenbau Anleitung" },
        { t: "Wandverkleidung mit Eichenpaneelen", d: "Halbe Wandhöhe oder deckenhohe Eichen-Wandpaneele (Ikea Björköviken, OBI-Eigenmarke). Auf Holzunterkonstruktion oder mit Kleber. Abschlussleiste oben. Geölt oder lackiert. Wärmer als Farbe allein.", lvl: "Mittel", cost: "60–200€/m²", yt: "Wandpaneele Eiche montieren Wohnzimmer Anleitung" },
      ]},
      { label: "🔝 Decke & Lichtkonzept", color: "#2c2c2c", items: [
        { t: "Indirektes Cove-Licht (Kastendecke)", d: "Holzkastenrahmen (15–20cm breit) am Deckenrand mit Schrauben an Wand. Vorderkante nach unten → LED-Strip dahinter. Licht strahlt zur Decke = indirekter Effekt. 2700K warm, dimmbarer Trafo. Rigips oder Holz als Blende.", lvl: "Fortgeschritten", cost: "150–400€", yt: "indirektes Deckenlicht Kastenrahmen Cove Anleitung bauen" },
        { t: "Abgehängte Decke (Systemdecke)", d: "Metallprofil-Unterkonstruktion (Rigips USP/UW-Profile), GKF-Platten verschrauben, spachteln Q3, schleifen. Für Einbaustrahler: Lochsäge 68mm. Elektriker für Stromkreise. Höhe verlieren aber Rohre und Leitungen verschwinden.", lvl: "Fortgeschritten", cost: "25–50€/m²", yt: "abgehängte Decke Wohnzimmer bauen Rigips Anleitung" },
        { t: "Stuckleisten & Deckenmedaillon", d: "Polystyrol- oder Gips-Zierleisten – schnelle Eleganz. Trockener Sternkleber (Pattex No More Nails), Gehrungsschnitt an Ecken (Gehrungssäge oder Schablone). Deckenmedaillon unter Kronleuchter. Dann streichen.", lvl: "Anfänger ✓", cost: "30–100€", yt: "Stuckleisten Deckenmedaillon kleben Anleitung Gehrung" },
      ]},
      { label: "✨ Ausstattung & Atmosphäre", color: "#3a7a56", items: [
        { t: "Vorhänge bis Decke (Raumtrick)", d: "Gardinenstange direkt unter Decke → Vorhänge bis Boden = Raum wirkt höher. Stoff: Leinen, Baumwolle oder Velvet. Wellenfaltung statt Ösen = eleganter. IKEA MOLNBRODD oder Maß-Vorhänge. Stange: Wandanker in Mauerwerk, nicht Rigips!", lvl: "Anfänger ✓", cost: "60–300€", yt: "Vorhänge bis Decke montieren Raumtrick Anleitung" },
        { t: "Einbauregal Wand-zu-Wand", d: "Nische oder ganze Wand mit Einbauregal: Holzplatten auf Konsolen oder Regalträgern, eingebaut von Wand zu Wand. Integrierte Beleuchtung (LED-Strip). Objekte: Bücher, Pflanzen, Deko abwechseln. Optisch raumfüllend und hochwertig.", lvl: "Mittel", cost: "200–800€", yt: "Einbauregal Wand zu Wand bauen Anleitung Wohnzimmer" },
        { t: "Smart Home Lichtsteuerung", d: "Philips Hue, IKEA TRÅDFRI oder Shelly-Relais. Dimmbares Licht, Farbtemperatur steuerbar, per App oder Sprachassistent. Shelly-Relais hinter vorhandene Schalter = günstigste Lösung. Kein Elektriker wenn Unterputzdose groß genug.", lvl: "Mittel", cost: "50–300€", yt: "Smart Home Licht Shelly Philips Hue einrichten Anleitung" },
      ]},
    ],
  },
  {
    cat: "Schlafzimmer 🛏️", bg: "#FFF0E8",
    sections: [
      { label: "🪵 Boden – Ruhe & Wärme", color: "#7B4F2E", items: [
        { t: "Parkett oder Fertigparkett verlegen", d: "Schlafzimmer = wärmste Raumatmosphäre. Fertigparkett (3-Schicht) schwimmend verlegen. Klickparkett einfacher als Klebeparkett. Eiche geölt oder gebürstet – natürliche Oberfläche. Akzeptiert kleine Unebenheiten besser als Laminat.", lvl: "Mittel", cost: "30–80€/m²", yt: "Fertigparkett verlegen Schlafzimmer Anleitung schwimmend" },
        { t: "Großer Teppich als Hauptelement", d: "Mind. 200×300cm für Doppelbett, Vorderfüße Bett auf Teppich. Naturmaterialien: Schurwolle, Sisal, Jute, Baumwolle. Antirutschmatte darunter. IKEA, Depot, Westwing. Teppich definiert den Schlafbereich als Insel.", lvl: "Anfänger ✓", cost: "100–600€", yt: "Teppich Schlafzimmer Größe richtig wählen Tipps" },
      ]},
      { label: "🧱 Wände – Kopfteil & Gestaltung", color: "#6B6B6B", items: [
        { t: "Kopfteilwand mit LED-Kanal (Hotel-Look)", d: "MDF-Rahmen auf Wand hinter dem Bett: Kanthölzer als Unterkonstruktion, MDF verschrauben, Gehrungsschnitt an Ecken. LED-Profil im Rahmen integrieren, verspachteln, lackieren. Warmes Licht 2200K = Wellnessatmosphäre.", lvl: "Fortgeschritten", cost: "150–400€", yt: "Kopfteilwand MDF LED Rahmen Schlafzimmer bauen" },
        { t: "Fluted Panel / Gerillte Paneele hinter Bett", d: "Gerillte MDF-Paneele (Fluted Panel) direkt auf Wand kleben oder auf Holzunterkonstruktion. Fertig-Paneele ab 30€/m² bei OBI. Lackieren oder ölen vor Montage. Breite Rippen: 3cm, schmale: 1cm. Trend 2025/2026.", lvl: "Mittel", cost: "80–250€", yt: "Fluted Panel Paneele Schlafzimmer hinter Bett Anleitung" },
        { t: "Venezianischer Putz Akzentwand", d: "Stucco Venetiano oder Marmorino als Akzentwand hinter dem Bett. 2–3 Lagen, polieren für Seidenglanz. Trendfarben: Warme Beige-Töne, zartes Rosa, Terrakotta. Atemaktiv – gut fürs Raumklima.", lvl: "Fortgeschritten", cost: "60–150€", yt: "Venezianischer Putz Akzentwand Schlafzimmer Anleitung" },
        { t: "Einbauschrank deckenhohe Lösung", d: "IKEA PAX bis Decke: Füllleisten für sauberen Deckenabschluss. Oder Eigenbaur aus Holzplatten. Türen: Schiebetüren sparen Platz. Grifflose Ausführung = modern. Innenbeleuchtung LED. Sockelleiste verdecken mit Blende.", lvl: "Mittel", cost: "500–2.500€", yt: "IKEA PAX deckenhohe Lösung Füllleiste Anleitung Einbau" },
      ]},
      { label: "🔝 Decke – Schlafatmosphäre", color: "#2c2c2c", items: [
        { t: "Dunkle Decke (Nachtblau/Dunkelgrün)", d: "Nachtblau oder Waldgrün an der Decke erzeugt Geborgenheit und Tiefe. Mit Abklebeband sauber zur Wand abschließen. Farbton 5–10% dunkler wählen als Wandfarbe. Kontrast zur hellen Wand = dramatischer Effekt.", lvl: "Anfänger ✓", cost: "25–60€", yt: "Schlafzimmer Decke dunkel streichen Anleitung Tipps" },
        { t: "Indirektes Licht Bettkopfseite", d: "LED-Kanal hinter Blende an der Wand über dem Bett. Warmweiß 2200K (wärmste Farbe) – verbessert Schlafqualität. Dimmer Pflicht. Höhe: ca. 1,60m über Boden. Schalter beidseitig neben Bett.", lvl: "Mittel", cost: "80–250€", yt: "indirektes Licht Schlafzimmer Bettkopfseite LED bauen" },
        { t: "Akustikdecke (Schallschutz)", d: "Holzwolle-Platten oder Akustikschaum-Deckenplatten reduzieren Hall. Besonders sinnvoll bei Betondecken. Befestigung mit speziellem Kleber oder Schrauben. Verbessert Schlafqualität merklich. OWA oder Knauf Akustik.", lvl: "Mittel", cost: "30–80€/m²", yt: "Akustikdecke einbauen Schlafzimmer Anleitung" },
      ]},
      { label: "✨ Ausstattung & Wohlbefinden", color: "#3a7a56", items: [
        { t: "Polsterung Kopfteil (DIY)", d: "MDF 18mm auf Maß (OBI schneidet): Bettbreite + 20cm × 80–100cm Höhe. 5cm Schaumstoff (RG35 Kaltschaum) tackern, Stoff spannen (Möbelstoff/Bouclé/Velvet), tackern. An Wand mit verdeckten Schrauben hängen. Material Trend 2025: Bouclé, Boucle-Wolle, Samtvelvet.", lvl: "Mittel", cost: "80–250€", yt: "Kopfteil Bett polstern DIY Anleitung Bouclé" },
        { t: "Wandleuchten beidseitig (Leseleuchten)", d: "Beidseitig neben dem Bett auf 60–70cm Höhe. Mit Leuchtmittelwechsel: 2200K, dimmbar. Kabel in Kabelkanal oder durch Wand (Elektriker). Marken: Artemide, FLOS, IKEA RANARP. Stecker-Wandleuchten: kein Elektriker nötig!", lvl: "Anfänger ✓", cost: "50–300€", yt: "Wandleuchten Schlafzimmer montieren beidseitig Anleitung" },
        { t: "Blackout + Verdunklungsrollo kombiniert", d: "Kombination: Verdunklungsrollo direkt am Fenster (IKEA TRETUR) + Vorhang davor. Stange so hoch wie möglich. Seitliche Lichtfugen mit Klettband-Vorhangstreifen schließen. Raumverdunkelung verbessert Schlafqualität messbar.", lvl: "Anfänger ✓", cost: "50–200€", yt: "Verdunklungsrollo Blackout Vorhang kombinieren Schlafzimmer" },
      ]},
    ],
  },
  {
    cat: "Terrasse 🌿", bg: "#EEF5EC",
    sections: [
      { label: "🪵 Boden – Unterkonstruktion & Belag", color: "#7B4F2E", items: [
        { t: "Unterkonstruktion aus Lärche/Douglasie", d: "Kanthölzer 45×70mm im Abstand 50cm auf Stelzlagern oder Betonfüßen. Höhenverstellbar. Gefälle 2% einplanen für Wasserablauf. Holzschutzöl auftragen vor Verlegung. Belüftung unter Deck wichtig gegen Schimmel.", lvl: "Mittel", cost: "15–30€/m²", yt: "Unterkonstruktion Terrasse Holz Stelzlager bauen Anleitung" },
        { t: "WPC-Dielen mit unsichtbarer Clip-Befestigung", d: "WPC (Wood Plastic Composite) – wartungsfrei, vergraut nicht, splitterfrei. Clip-System: keine Schrauben sichtbar. Aufheizung beachten (dunkle Farben). Co-Extrusion WPC besser als Standard. Marken: Cedral, BPC.", lvl: "Mittel", cost: "40–80€/m²", yt: "WPC Dielen verlegen Clip Unterkonstruktion Anleitung" },
        { t: "Naturstein-Platten auf Splittbett", d: "Granit, Sandstein, Travertin oder Basalt. 4–6cm Dicke. Splittbett 3–5cm einbringen, abziehen, Platten setzen mit Gummihammer. Fugen 3–5mm mit Fugensand verfüllen. Naturstein jährlich imprägnieren.", lvl: "Mittel", cost: "30–80€/m²", yt: "Naturstein Platten Terrasse setzen Splittbett Anleitung" },
      ]},
      { label: "🧱 Sichtschutz & Pergola", color: "#6B6B6B", items: [
        { t: "Sichtschutzwand aus Lärchenholz", d: "Rahmen aus Kanthölzern 7×7cm, Lärche-Latten 2cm Abstand. Holzschutz-Lasur auftragen. Fundament: Einschlaghülsen oder Betonfundament. Lebenserwartung: 20+ Jahre mit jährlicher Pflege. Edler als Bambus.", lvl: "Mittel", cost: "80–250€", yt: "Sichtschutzwand Lärche bauen Terrasse Anleitung" },
        { t: "Pergola mit Rankpflanzen", d: "Douglasie oder Lärche. Einschlaghülsen oder Fundamenthülsen. Pfosten 10×10cm, Querbalken 10×8cm. Rankgitter anbringen. Pflanzen: Glyzinie (stark!), Clematis, Wein. Pergola muss statisch berechnet sein bei Größen >20m².", lvl: "Fortgeschritten", cost: "500–2.500€", yt: "Pergola Holz selber bauen Anleitung Pfosten Fundament" },
        { t: "Aluminium-Überdachung Bausatz", d: "Wetterfest, wartungsarm, modern. Wandmontage-Profil, Pfosten setzen (Betonfundament!), Sparren auflegen, Polycarbonat-Platten (opal/klar) einlegen. Marken: Karibu, Gardendreams, Gutta. Genehmigungspflichtig prüfen!", lvl: "Fortgeschritten", cost: "800–4.000€", yt: "Alu Überdachung Bausatz Terrasse montieren Anleitung" },
      ]},
      { label: "✨ Ausstattung & Atmosphäre", color: "#3a7a56", items: [
        { t: "Outdoor-Steckdose IP44 installieren", d: "IP44 Minimum für Außenbereich. Unterputz oder Aufputz. Elektriker Pflicht! Dann: Lichterketten, Außenstrahler, Elektrogrill alles nutzbar ohne Verlängerungskabel.", lvl: "Elektriker nötig", cost: "80–250€", yt: "Außensteckdose IP44 installieren Garten Anleitung" },
        { t: "Paletten-Lounge Outdoor (EPAL)", d: "Nur EPAL-gestempelte Paletten (kein Chemikalien-Risiko)! Schleifen mit 80er Schleifpapier, 2× Holzschutzöl/-lasur. Hochstapeln für Rücklehne. Outdoor-Kissen: mind. 10cm stark, Sunbrella-Stoff wasserfest. Mit Winkeln sichern.", lvl: "Anfänger ✓", cost: "80–300€", yt: "Paletten Lounge EPAL bauen Anleitung Outdoor" },
        { t: "Hochbeet Lärche selbst gebaut", d: "Lärchenbohlen 40×200mm, verschraubt. Innen: Teichfolie oder Noppenfolie. Schichtaufbau: Kies 10cm (Drainage) → Astholz → Kompost → Erde. Breite max. 120cm (beide Seiten erreichbar). Höhe 80cm = rückenschonend.", lvl: "Mittel", cost: "60–200€", yt: "Hochbeet bauen Lärche Anleitung Schichten Drainage" },
      ]},
    ],
  },
  {
    cat: "Flur 🚪", bg: "#F5F0EC",
    sections: [
      { label: "🪵 Boden – Charakter geben", color: "#7B4F2E", items: [
        { t: "Fischgrät-Vinyl verlegen", d: "Fischgrät = aufwändigere Verlegung: Raummitte bestimmen, Hilfslinie ziehen, von Mitte aus starten. Vinyl-Klicksystem. 45°-Winkel-Schnitte mit Cuttermesser oder Kreissäge. Besonders edel im Flur.", lvl: "Mittel", cost: "25–55€/m²", yt: "Fischgrät Vinyl verlegen Anleitung Muster Flur" },
        { t: "Hexagon-Fliesen (Statement-Boden)", d: "Sechseckige Fliesen setzen: Mittelachse finden, von Mitte starten. Netzverklebte Matten einfacher. Fugenstärke 2–3mm. Fugenmasse: Grau oder Weiß. Kleine Hexagone (5–10cm) besonders edel.", lvl: "Mittel", cost: "30–80€/m²", yt: "Hexagon Fliesen Flur verlegen Anleitung Mitte starten" },
      ]},
      { label: "🧱 Wände & Einbau", color: "#6B6B6B", items: [
        { t: "Lambris / Holzvertäfelung anbringen", d: "Untere 90cm verkleiden (Stuhlhöhe). Holzleisten, MDF-Paneele oder Nut-Feder-Bretter. Auf Holzlattung (3×3cm) nageln/schrauben. Oben Abschlussleiste. Streichen oder ölen. Klassisch englisch oder modern skandinavisch.", lvl: "Mittel", cost: "40–120€", yt: "Lambris Wandvertäfelung Flur anbringen Anleitung" },
        { t: "Dunkle Wandfarbe (Geheimtipp)", d: "Kleiner Flur mit dunkler Farbe wirkt intimer und edler als weißer Flur! Dunkelgrün, Anthrazit, Dunkelblau. Kontrastreiche Accessoires (helle Spiegel, Messing). Decke weiß lassen – dann wirkt Raum höher.", lvl: "Anfänger ✓", cost: "25–60€", yt: "kleiner Flur dunkle Farbe Geheimtipp Anleitung Ideen" },
        { t: "Einbauschrank Nische ausbauen", d: "Nische mit Tür verschließen: Rigips-Tür auf Metallrahmen oder Holztür auf Holzzarge. Scharniere, Türband einstellen. Innen Einlegeböden + Beleuchtung. Stauraum verdoppelt sich. Kosten je nach Ausführung.", lvl: "Fortgeschritten", cost: "200–800€", yt: "Nische ausbauen Einbauschrank Flur Rigips bauen Anleitung" },
      ]},
      { label: "✨ Ausstattung & Funktion", color: "#3a7a56", items: [
        { t: "Schwebende Garderobe maßangefertigt", d: "MDF-Platte mit Wandhaken-Reihe, Ablage oben, Schuhfach unten – alles auf Maß. Schwebende Optik durch versteckte Wandmontage. LED-Stripe unten für Lichteffekt. Kosten je nach Maß.", lvl: "Mittel", cost: "150–500€", yt: "schwebende Garderobe bauen Flur Anleitung Maß MDF" },
        { t: "Rundspiegel mit Wandbeleuchtung", d: "Großer Rundspiegel (mind. 60cm Ø) optisch vergrößert Flur enorm. Wandleuchten links/rechts für gleichmäßige Ausleuchtung. LED 3000K. Messing-Rahmen oder schlicht matt schwarz – Trend 2025. Hängen: 160cm Mitte Boden.", lvl: "Anfänger ✓", cost: "80–350€", yt: "Rundspiegel Flur aufhängen Wandleuchten montieren Anleitung" },
      ]},
    ],
  },
];


function IdeenTab() {
  const [view, setView] = useState("trends");
  const [activeCategory, setActiveCategory] = useState(0);
  const [openItem, setOpenItem] = useState(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [answerLoading, setAnswerLoading] = useState(false);

  function askExpert() {
    if (!question.trim()) return;
    setAnswerLoading(true);
    const reply = getRenovierungsAntwort(question, false);
    setAnswer(reply || "Gute Frage! Schreib mir mehr Details – zum Beispiel welchen Raum du renovieren möchtest, was das Problem ist oder was du verändern möchtest. Ich helfe dir gerne konkret weiter!");
    setAnswerLoading(false);
  }

  function handleExpertKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askExpert(); }
  }

  return (
    <div style={{ overflowY: "auto", height: "100%", padding: "16px" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 14 }}>Ideen & Trends 2025</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["trends", "🔥 Trends"], ["ideen", "💡 Alle Ideen"]].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            style={{
              padding: "8px 18px", borderRadius: 20, border: "1px solid " + (view === id ? C.accent : C.border),
              background: view === id ? C.accent : C.card, color: view === id ? "white" : C.muted,
              fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "trends" && (
        <div>
          <p style={{ color: C.muted, fontSize: 14, marginBottom: 16 }}>Was gerade in modernen Wohnungen angesagt ist – und wie du es günstig umsetzt.</p>
          {TRENDS.map((trend, i) => (
            <div
              key={i}
              className="fu"
              style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, marginBottom: 14, overflow: "hidden", animationDelay: i * 0.04 + "s" }}
            >
              <div style={{ position: "relative", height: 160, overflow: "hidden" }}>
                <img
                  src={trend.img}
                  alt={trend.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  onError={(e) => { e.target.style.display = "none"; e.target.parentNode.style.background = trend.color; e.target.parentNode.style.display = "flex"; e.target.parentNode.style.alignItems = "center"; e.target.parentNode.style.justifyContent = "center"; }}
                />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)" }} />
                <div style={{ position: "absolute", bottom: 12, left: 14, right: 14 }}>
                  <p style={{ color: "white", fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{trend.emoji} {trend.title}</p>
                </div>
              </div>
              <div style={{ padding: "14px 16px" }}>
                <p style={{ fontSize: 13, color: "#555", lineHeight: 1.65, marginBottom: 10 }}>{trend.desc}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Pill bg={C.greenBg} color={C.green}>{"✓ " + trend.how}</Pill>
                  <Pill>{"💰 " + trend.cost}</Pill>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "ideen" && (
        <div>
          {/* Room selector */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
            {IDEAS.map((cat, i) => (
              <button
                key={i}
                onClick={() => { setActiveCategory(i); setOpenItem(null); }}
                style={{
                  padding: "7px 14px", borderRadius: 20, border: "1px solid " + (activeCategory === i ? C.accent : C.border),
                  background: activeCategory === i ? C.accent : C.card,
                  color: activeCategory === i ? "white" : C.text,
                  fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {IDEAS[i].cat}
              </button>
            ))}
          </div>

          {/* Chronological sections: Boden → Wände → Decke → Deko */}
          {IDEAS[activeCategory].sections.map((sec, si) => (
            <div key={si} style={{ marginBottom: 22 }}>
              {/* Section header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, paddingBottom: 8, borderBottom: "2px solid " + C.border }}>
                <div style={{ width: 4, height: 22, background: sec.color, borderRadius: 2 }} />
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: C.text }}>{sec.label}</p>
                <span style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>{sec.items.length} Ideen</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sec.items.map((idea, i) => {
                  const key = si + "-" + i;
                  return (
                    <div
                      key={key}
                      className="fu"
                      onClick={() => setOpenItem(openItem === key ? null : key)}
                      style={{
                        background: openItem === key ? IDEAS[activeCategory].bg : C.card,
                        border: "1px solid " + (openItem === key ? C.accent : C.border),
                        borderRadius: 13, overflow: "hidden", cursor: "pointer",
                        animationDelay: i * 0.04 + "s",
                      }}
                    >
                      <div style={{ padding: "12px 15px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 7 }}>
                          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, flex: 1, paddingRight: 8 }}>{idea.t}</p>
                          <span style={{ fontSize: 12, color: C.muted }}>{openItem === key ? "▲" : "▼"}</span>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <Pill
                            bg={idea.lvl.includes("✓") ? C.greenBg : idea.lvl.includes("Elek") ? "#FEF3C7" : idea.lvl.includes("Fort") ? "#FEE2E2" : "#FFF3E0"}
                            color={idea.lvl.includes("✓") ? C.green : idea.lvl.includes("Elek") ? "#92400E" : idea.lvl.includes("Fort") ? "#B91C1C" : "#E65100"}
                          >
                            {idea.lvl}
                          </Pill>
                          <Pill>{"💰 " + idea.cost}</Pill>
                        </div>
                      </div>
                      {openItem === key && (
                        <div className="fu" style={{ padding: "0 15px 15px", borderTop: "1px solid " + C.border, paddingTop: 12 }}>
                          <p style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>{idea.d}</p>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuestion("Erkläre mir wie ich " + idea.t + " mache als kompletter Anfänger");
                                setTimeout(() => {
                                  const el = document.getElementById("expert-box");
                                  if (el) el.scrollIntoView({ behavior: "smooth" });
                                }, 100);
                              }}
                              style={{ background: C.accentBg, color: C.accent, border: "none", borderRadius: 20, padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}
                            >
                              🤖 KI fragen →
                            </button>
                            {idea.yt && (
                              <a
                                href={"https://www.youtube.com/results?search_query=" + encodeURIComponent(idea.yt)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{ background: "#FFF0F0", color: "#CC0000", borderRadius: 20, padding: "7px 16px", fontSize: 13, fontWeight: 500, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}
                              >
                                ▶ YouTube Tutorial
                              </a>
                            )}
                          </div>
                          {IDEEN_PRODUKTE[idea.t] && (
                            <div style={{ marginTop: 12, padding: "10px 12px", background: "#F0F5EC", borderRadius: 10 }} onClick={e => e.stopPropagation()}>
                              <p style={{ fontSize: 11, fontWeight: 700, color: "#3a7a56", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>🛒 Produkte auf Amazon</p>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {IDEEN_PRODUKTE[idea.t].map((key, pi) => PRODUKTE[key] ? (
                                  <a key={pi} href={PRODUKTE[key].link} target="_blank" rel="noopener noreferrer"
                                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "white", borderRadius: 8, padding: "7px 10px", textDecoration: "none", border: "1px solid #D0E8D0" }}>
                                    <span style={{ fontSize: 12, color: "#1a1a1a", fontWeight: 500 }}>{PRODUKTE[key].name}</span>
                                    <span style={{ fontSize: 11, color: "#3a7a56", fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>Amazon →</span>
                                  </a>
                                ) : null)}
                              </div>
                              <p style={{ fontSize: 10, color: "#888", marginTop: 6 }}>* Affiliate-Links – für dich keine Mehrkosten</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div style={{ marginBottom: 24 }} />
        </div>
      )}
    </div>
  );
}

// ─── TAB 3: RECHNER ──────────────────────────────────────────────────────────
const MATERIALS = [
  { name: "SPC Vinyl (Bad/Küche)", price: 22, extra: "+5€/m² Unterlage, +8€/lm Sockelleiste", shop: "OBI / Bauhaus" },
  { name: "Laminat (Trockenbereich)", price: 15, extra: "+5€/m² Unterlage (nicht für Bad!)", shop: "Bauhaus / Hornbach" },
  { name: "Fliesen", price: 25, extra: "+12€/m² Kleber, +4€/m² Fugenmasse", shop: "OBI / Bauhaus" },
  { name: "Mikrozement", price: 65, extra: "+15€/m² Versiegelung nötig", shop: "Amazon / Bauhaus" },
  { name: "Klickfliesen Outdoor", price: 35, extra: "Kein Kleber nötig!", shop: "OBI / Hornbach" },
  { name: "Wandfarbe (2 Schichten)", price: 4, extra: "+3€/m² Haftgrund falls nötig", shop: "OBI / Toom" },
  { name: "Feuchtraumfarbe", price: 6, extra: "Pflicht für Bad & Küche!", shop: "OBI / Bauhaus" },
  { name: "Fliesenfolie", price: 10, extra: "Kein Kleber, mietfreundlich", shop: "Amazon / OBI" },
];

const FEHLER_LIST = {
  "Badezimmer": [
    { f: "Normales Silikon statt Bad-Silikon", w: "Normal-Silikon schimmelt innerhalb von Monaten! Immer Soudal oder Ottoseal Bad-Silikon mit Pilzschutz kaufen." },
    { f: "Laminat im Bad verlegen", w: "Laminat ist NICHT wasserfest – quillt auf und schimmelt. Immer SPC-Vinyl für Badezimmer!" },
    { f: "LED-Spiegel ohne IP44", w: "Im Badezimmer Pflicht: Schutzklasse mindestens IP44. Steht auf der Verpackung – immer prüfen!" },
    { f: "Fliesen ohne Entfetten kleben", w: "Alte Fliesen müssen komplett fettfrei sein. Speziellen Fliesenreiniger verwenden, sonst hält Kleber nicht." },
    { f: "Elektro selbst installieren", w: "Festinstallation ist in Deutschland ILLEGAL ohne Elektrikerschein. Stecker = okay, alles andere = Elektriker!" },
  ],
  "Küche": [
    { f: "Fronten lackieren ohne Schleifen", w: "Lack haftet auf Glanzflächen ohne Schleifen + Haftgrund nicht. Blättert nach Wochen ab!" },
    { f: "Arbeitsplatte Schnittkante offen lassen", w: "Laminat-Arbeitsplatten müssen an Schnittkanten SOFORT abdichten – sonst quillt die Kante auf." },
    { f: "Herd direkt neben Holzschrank", w: "Mindestabstand: 50cm seitlich, 70cm nach oben. Brandgefahr!" },
    { f: "Folie ohne Entfetten aufkleben", w: "Küchenfronten sind fettbedeckt. Ohne Aceton/Entfetter haftet Folie nicht und löst sich ab." },
  ],
  "Wände & Böden": [
    { f: "Boden auf nassem Untergrund verlegen", w: "Neuer Estrich braucht 4 Wochen zum Trocknen! Zu früh = Schimmel unter dem Boden." },
    { f: "Keine Dehnungsfuge beim Laminat", w: "Laminat dehnt sich aus! Immer 10-15mm Abstand zur Wand. Ohne Fuge wölbt sich der Boden." },
    { f: "Dübel ohne Untergrundprüfung", w: "Erst klopfen: hohl = Gipskarton (andere Dübel!), massiv = Beton. Falscher Dübel = Regal fällt." },
    { f: "Asbest selbst entfernen", w: "Altbau vor 1990? Eternit-Platten können Asbest enthalten. NIEMALS selbst entfernen – Krebsgefahr!" },
  ],
  "Terrasse & Balkon": [
    { f: "Paletten ohne EPAL-Stempel", w: "Industriepaletten können giftige Chemikalien enthalten! IMMER auf EPAL-Stempel achten." },
    { f: "Holz ohne Behandlung lassen", w: "Unbehandeltes Holz vergraut und reißt innerhalb einer Saison. Holzöl VOR dem ersten Regen!" },
    { f: "Blumenkästen ohne Ablaufloch", w: "Staunässe tötet Pflanzen innerhalb von Wochen. Immer Töpfe mit Abzugsloch!" },
  ],
};

const QUIZ = [
  { q: "Hast du schon mal selbst etwas repariert?", opts: ["Noch gar nichts", "Kleinkram (IKEA etc.)", "Ja, schon einiges", "Regelmäßig, bin handwerklich"] },
  { q: "Welches Werkzeug hast du zuhause?", opts: ["Fast keins", "Hammer, Schrauber", "Bohrmaschine + Grundausstattung", "Volle Werkzeugausstattung"] },
  { q: "Wie viel Zeit kannst du pro Wochenende investieren?", opts: ["2-3 Stunden max", "Einen halben Tag", "Einen ganzen Tag", "Das ganze Wochenende"] },
  { q: "Wie gehst du mit Fehlern um?", opts: ["Gebe schnell auf", "Lasse es dann lieber", "Suche eine Lösung", "Fehler gehören dazu"] },
  { q: "Was ist dein Ziel?", opts: ["Nur kleine Verschönerungen", "Ein Raum umgestalten", "Mehrere Räume renovieren", "Komplette Wohnung transformieren"] },
];

function QuizResult({ result, onReset }) {
  return (
    <div className="fu">
      <div style={{ background: result.bg, border: "2px solid " + result.color, borderRadius: 16, padding: "24px", textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>{result.icon}</div>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: result.color, marginBottom: 8 }}>{result.level}</p>
        <p style={{ fontSize: 14, color: C.text, lineHeight: 1.7 }}>{result.desc}</p>
      </div>
      <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "16px", marginBottom: 14 }}>
        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Deine passenden Projekte:</p>
        {result.projects.map((p, i) => (
          <p key={i} style={{ fontSize: 14, padding: "8px 0", borderBottom: i < result.projects.length - 1 ? "1px solid " + C.border : "none" }}>{"✓ " + p}</p>
        ))}
      </div>
      <button onClick={onReset} style={{ width: "100%", padding: "12px", borderRadius: 50, border: "2px solid " + C.border, background: "none", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
        Quiz wiederholen
      </button>
    </div>
  );
}

const SEASON_TIPS = {
  summer: [
    { icon: "🌿", title: "Terrasse & Balkon", desc: "Die beste Zeit für Outdoor-Projekte. Holz ölen, Klickfliesen legen, Lounge aufbauen. Nur bei trockenem Wetter über 10°C." },
    { icon: "🎨", title: "Außenanstrich", desc: "Fassaden, Zäune, Gartenmöbel streichen. Nicht in praller Sonne – trocknet zu schnell." },
    { icon: "🏗️", title: "Große Projekte starten", desc: "Sommermonate = Baumarkt hat volle Lager. Aktionen bei OBI und Bauhaus nutzen." },
  ],
  winter: [
    { icon: "🛋️", title: "Innenräume renovieren", desc: "Winter = perfekt für Wohnzimmer, Schlafzimmer, Küche. Akzentwand, neue Möbel, Licht upgraden." },
    { icon: "🚿", title: "Bad-Renovierung", desc: "Kein Wetter-Stress. Idealer Zeitpunkt für Vinyl verlegen, Silikon erneuern, neuen Spiegel." },
    { icon: "💡", title: "Licht & Atmosphäre", desc: "Dunkle Monate = Licht-Upgrade zahlt sich sofort aus. LED-Strips, Stehlampen, Dimmer. 2700K warm." },
    { icon: "📐", title: "Projekte planen & bestellen", desc: "Viele Shops haben Winter-Sale im Januar. Für Frühjahr vorplanen und Material bestellen." },
  ],
};

function RechnerTab() {
  const [section, setSection] = useState("budget");
  const [roomLen, setRoomLen] = useState("");
  const [roomWid, setRoomWid] = useState("");
  const [selectedMats, setSelectedMats] = useState([]);
  const [matType, setMatType] = useState("SPC Vinyl (Bad/Küche)");
  const [matLen, setMatLen] = useState("");
  const [matWid, setMatWid] = useState("");
  const [fehlerCat, setFehlerCat] = useState("Badezimmer");
  const [customCheck, setCustomCheck] = useState("");
  const [checkResult, setCheckResult] = useState("");
  const [checkLoading, setCheckLoading] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizDone, setQuizDone] = useState(false);

  const area = parseFloat(roomLen) * parseFloat(roomWid) || 0;
  const areaWithBuffer = area * 1.15;
  const matArea = parseFloat(matLen) * parseFloat(matWid) || 0;
  const matAreaBuffer = matArea * 1.15;

  function toggleMat(name) {
    setSelectedMats((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]);
  }

  function calcBudget() {
    const items = selectedMats.map((name) => {
      const mat = MATERIALS.find((m) => m.name === name);
      const qty = Math.ceil(areaWithBuffer);
      return { name, qty, price: qty * mat.price, extra: mat.extra, shop: mat.shop };
    });
    const total = items.reduce((s, it) => s + it.price, 0);
    return { items, total };
  }

  function runFehlerCheck() {
    if (!customCheck.trim()) return;
    setCheckLoading(true);
    const reply = getRenovierungsAntwort(customCheck, false);
    setCheckResult(reply);
    setCheckLoading(false);
  }

  const quizScore = Object.values(quizAnswers).reduce((s, v) => s + v, 0);

  function getQuizResult() {
    if (quizScore <= 5) return { level: "Einsteiger", icon: "🌱", bg: C.greenBg, color: C.green, desc: "Starte mit Level-1-Projekten: Streichen, Spiegel tauschen, Regale montieren, Griffe wechseln. Schau dir vorher 1-2 YouTube-Videos an!", projects: ["Silikon erneuern (10-25€)", "Griffe tauschen (30-80€)", "Streichen & Abkleben (30-80€)", "LED-Spiegel montieren (80-200€)", "Regale montieren (30-100€)"] };
    if (quizScore <= 10) return { level: "Fortschreiter", icon: "🔨", bg: "#FFF8E1", color: "#E65100", desc: "Du bist bereit für Level-2-Projekte: Vinyl verlegen, Armaturen tauschen, Küchenfronten folieren. Mit Vorbereitung packst du das!", projects: ["SPC Vinyl verlegen (15-30€/m²)", "Armaturen tauschen (60-200€)", "Fronten folieren/lackieren (80-300€)", "Gardinenstange bis Decke (40-100€)", "Balkon aufwerten (50-200€)"] };
    return { level: "Macher", icon: "🏆", bg: C.accentBg, color: C.accent, desc: "Du kannst ambitionierte Projekte angehen: Fliesen, Walk-In Dusche, Holzterrasse. Plane gut und du schaffst fast alles!", projects: ["Fliesen verlegen (20-50€/m²)", "Walk-In Dusche (1.500-3.000€)", "Holzterrasse bauen (500-2.000€)", "Kücheninsel (300-800€)", "Trockenbau-Wand (200-500€)"] };
  }

  const month = new Date().getMonth();
  const season = month >= 3 && month <= 8 ? "summer" : "winter";
  const tips = SEASON_TIPS[season];

  const budget = area > 0 && selectedMats.length > 0 ? calcBudget() : null;
  const selectedMaterial = MATERIALS.find((m) => m.name === matType);

  return (
    <div style={{ overflowY: "auto", height: "100%", padding: "16px" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 14 }}>Werkzeuge & Rechner</h2>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
        {[["budget", "💰 Budget"], ["material", "📐 Material"], ["fehler", "⚠️ Fehler-Check"], ["quiz", "🎯 Quiz"], ["saison", "🌿 Saison"]].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            style={{
              padding: "8px 14px", borderRadius: 20, border: "1px solid " + (section === id ? C.accent : C.border),
              background: section === id ? C.accent : C.card, color: section === id ? "white" : C.muted,
              fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {section === "budget" && (
        <div>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, marginBottom: 4 }}>Budgetrechner</h3>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Gib Raumgröße ein – ich rechne die Materialkosten aus.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[["Länge (m)", roomLen, setRoomLen], ["Breite (m)", roomWid, setRoomWid]].map(([label, val, setVal]) => (
              <div key={label}>
                <p style={{ fontSize: 12, color: C.muted, marginBottom: 5 }}>{label}</p>
                <input value={val} onChange={(e) => setVal(e.target.value)} type="number" placeholder="z.B. 3.5" style={{ width: "100%", padding: "10px 13px", borderRadius: 10, border: "2px solid " + C.border, fontSize: 15, fontFamily: "'DM Sans', sans-serif", background: C.bg }} />
              </div>
            ))}
          </div>
          {area > 0 && (
            <div style={{ background: C.accentBg, borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14 }}>Grundfläche</span>
              <span style={{ fontWeight: 700, color: C.accent }}>{area.toFixed(1)} m² → mit Puffer: {areaWithBuffer.toFixed(1)} m²</span>
            </div>
          )}
          <p style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Was möchtest du erneuern?</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {MATERIALS.map((mat) => (
              <div
                key={mat.name}
                onClick={() => toggleMat(mat.name)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
                  borderRadius: 10, border: "2px solid " + (selectedMats.includes(mat.name) ? C.accent : C.border),
                  background: selectedMats.includes(mat.name) ? C.accentBg : C.card, cursor: "pointer",
                }}
              >
                <div style={{ width: 18, height: 18, borderRadius: 4, border: "2px solid " + (selectedMats.includes(mat.name) ? C.accent : C.border), background: selectedMats.includes(mat.name) ? C.accent : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {selectedMats.includes(mat.name) && <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{mat.name}</p>
                  <p style={{ fontSize: 12, color: C.muted }}>{mat.shop} · ca. {mat.price}€/m²</p>
                </div>
              </div>
            ))}
          </div>
          {budget && (
            <div className="fu" style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ background: C.accent, padding: "12px 16px" }}>
                <p style={{ color: "white", fontFamily: "'Playfair Display', serif", fontSize: 16 }}>Kostenschätzung</p>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>{area.toFixed(1)} m² · inkl. 15% Puffer</p>
              </div>
              {budget.items.map((item, i) => (
                <div key={i} style={{ padding: "12px 16px", borderBottom: "1px solid " + C.border }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</p>
                    <p style={{ fontWeight: 700, color: C.accent }}>~{item.price.toFixed(0)}€</p>
                  </div>
                  <p style={{ fontSize: 12, color: C.muted }}>{item.qty} m² · {item.extra}</p>
                  <p style={{ fontSize: 12, color: C.green }}>🛒 {item.shop}</p>
                </div>
              ))}
              <div style={{ padding: "14px 16px", background: C.accentBg, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ fontWeight: 600 }}>Gesamt Material</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: C.accent, fontWeight: 700 }}>~{budget.total.toFixed(0)}€</p>
              </div>
              <div style={{ padding: "10px 16px" }}>
                <p style={{ fontSize: 12, color: C.muted }}>⚠️ Werkzeug, Lieferung und Handwerkerkosten nicht enthalten.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {section === "material" && (
        <div>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, marginBottom: 4 }}>Materialmengen-Rechner</h3>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Gib Maße ein – ich sag dir genau was du kaufen musst.</p>
          <p style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Material wählen</p>
          <select value={matType} onChange={(e) => setMatType(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "2px solid " + C.border, fontSize: 14, fontFamily: "'DM Sans', sans-serif", marginBottom: 14, background: C.bg }}>
            {MATERIALS.map((m) => <option key={m.name}>{m.name}</option>)}
          </select>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[["Länge (m)", matLen, setMatLen], ["Breite (m)", matWid, setMatWid]].map(([label, val, setVal]) => (
              <div key={label}>
                <p style={{ fontSize: 12, color: C.muted, marginBottom: 5 }}>{label}</p>
                <input value={val} onChange={(e) => setVal(e.target.value)} type="number" placeholder="z.B. 4" style={{ width: "100%", padding: "10px 13px", borderRadius: 10, border: "2px solid " + C.border, fontSize: 15, fontFamily: "'DM Sans', sans-serif", background: C.bg }} />
              </div>
            ))}
          </div>
          {matArea > 0 && selectedMaterial && (
            <div className="fu" style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ background: C.accent, padding: "12px 16px" }}>
                <p style={{ color: "white", fontFamily: "'Playfair Display', serif", fontSize: 16 }}>{matType}</p>
              </div>
              {[
                ["Grundfläche", matArea.toFixed(2) + " m²"],
                ["+ 15% Verschnitt", (matArea * 0.15).toFixed(2) + " m²"],
                ["Kaufmenge (aufrunden!)", Math.ceil(matAreaBuffer) + " m²"],
                ["Ungefähre Kosten", "~" + (Math.ceil(matAreaBuffer) * selectedMaterial.price).toFixed(0) + "€"],
                ["Empfehlung", selectedMaterial.extra],
                ["Wo kaufen", selectedMaterial.shop],
              ].map(([k, v], i) => (
                <div key={i} style={{ padding: "10px 16px", borderBottom: "1px solid " + C.border, display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <p style={{ fontSize: 13, color: C.muted }}>{k}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, textAlign: "right" }}>{v}</p>
                </div>
              ))}
              <div style={{ padding: "12px 16px", background: "#FFF8F0" }}>
                <p style={{ fontSize: 13, color: "#8B5E3C" }}>💡 Immer aufgerundet kaufen – Reste kann man zurückgeben oder braucht sie für Ausbesserungen.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {section === "fehler" && (
        <div>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, marginBottom: 4 }}>Fehler-Checker</h3>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Was du UNBEDINGT wissen musst bevor du anfängst.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {Object.keys(FEHLER_LIST).map((cat) => (
              <button key={cat} onClick={() => setFehlerCat(cat)} style={{ padding: "7px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", background: fehlerCat === cat ? C.accent : C.border, color: fehlerCat === cat ? "white" : C.text }}>
                {cat}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {FEHLER_LIST[fehlerCat].map((item, i) => (
              <div key={i} className="fu" style={{ background: "#FFF5F5", border: "1px solid #F5D0D0", borderRadius: 12, padding: "14px 16px", animationDelay: i * 0.06 + "s" }}>
                <p style={{ fontWeight: 600, fontSize: 14, color: "#B91C1C", marginBottom: 6 }}>{"❌ " + item.f}</p>
                <p style={{ fontSize: 13, color: "#7F1D1D", lineHeight: 1.6 }}>{item.w}</p>
              </div>
            ))}
          </div>
          <div style={{ background: C.accentBg, border: "1px solid #F0C4A0", borderRadius: 14, padding: "16px" }}>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>🤖 Konkretes Projekt prüfen lassen</p>
            <input value={customCheck} onChange={(e) => setCustomCheck(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runFehlerCheck()} placeholder="z.B. Ich will Fliesen über Fliesen kleben…" style={{ width: "100%", padding: "10px 13px", borderRadius: 10, border: "1px solid #F0C4A0", fontSize: 13, fontFamily: "'DM Sans', sans-serif", marginBottom: 10, background: "white" }} />
            <button onClick={runFehlerCheck} disabled={checkLoading || !customCheck.trim()} style={{ width: "100%", padding: "11px", borderRadius: 50, border: "none", background: checkLoading || !customCheck.trim() ? "#DDD" : C.accent, color: "white", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {checkLoading ? <><LoadingSpinner size={16} /> Analysiere…</> : "Fehler-Check starten →"}
            </button>
            {checkResult && (
              <div className="fu" style={{ marginTop: 12, background: "white", borderRadius: 10, padding: "13px" }}>
                <p style={{ fontSize: 14, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{checkResult}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {section === "quiz" && (
        <div>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, marginBottom: 4 }}>Schwierigkeits-Quiz</h3>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>Finde heraus welche Projekte zu dir passen.</p>
          {!quizDone ? (
            <div>
              {QUIZ.map((q, qi) => (
                <div key={qi} style={{ marginBottom: 20 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, lineHeight: 1.5 }}>{(qi + 1) + ". " + q.q}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {q.opts.map((opt, oi) => (
                      <div key={oi} onClick={() => setQuizAnswers((prev) => ({ ...prev, [qi]: oi }))} style={{ padding: "10px 14px", borderRadius: 10, border: "2px solid " + (quizAnswers[qi] === oi ? C.accent : C.border), background: quizAnswers[qi] === oi ? C.accentBg : C.card, cursor: "pointer", fontSize: 14 }}>
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={() => Object.keys(quizAnswers).length === QUIZ.length && setQuizDone(true)} disabled={Object.keys(quizAnswers).length < QUIZ.length} style={{ width: "100%", padding: "13px", borderRadius: 50, border: "none", background: Object.keys(quizAnswers).length < QUIZ.length ? "#DDD" : C.accent, color: Object.keys(quizAnswers).length < QUIZ.length ? "#AAA" : "white", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 15 }}>
                Ergebnis anzeigen →
              </button>
            </div>
          ) : (
            <QuizResult result={getQuizResult()} onReset={() => { setQuizDone(false); setQuizAnswers({}); }} />
          )}
        </div>
      )}

      {section === "saison" && (
        <div>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, marginBottom: 4 }}>{season === "summer" ? "☀️ Sommer-Tipps" : "❄️ Winter-Tipps"}</h3>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>Was jetzt die beste Zeit ist um anzufangen.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {tips.map((tip, i) => (
              <div key={i} className="fu" style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "16px 18px", animationDelay: i * 0.08 + "s" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 28, flexShrink: 0 }}>{tip.icon}</span>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 5 }}>{tip.title}</p>
                    <p style={{ fontSize: 13, color: "#555", lineHeight: 1.65 }}>{tip.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TAB 4: PLANER ───────────────────────────────────────────────────────────
const CHECKLIST_DATA = [
  { cat: "🧱 Wände & Decke", bg: "#FFF0E8", items: ["Feuchtraumfarbe (Bad/Küche) – Schimmelschutz!", "Wandfarbe (2 Schichten einplanen)", "Abdeckband Tesa Precision (kein billiges!)", "Malervlies / Abdeckfolie für Boden", "Spachtelmasse für Löcher und Risse", "Fliesenfolie (Klebefolie) – Mietwohnung-safe", "Mikrozement – 30-80€/m²", "Tapete (Vlies klebt einfacher als Papier)"] },
  { cat: "🪟 Boden", bg: "#F0F5EC", items: ["SPC Vinyl-Boden wasserfest – 15-30€/m²", "Laminat (NUR für Trockenbereiche!)", "Schaumstoff-Unterlage nicht vergessen!", "Sockelleisten – werden oft vergessen!", "Abstandskeile für Dehnungsfuge", "Klick-Fliesen Outdoor – kein Kleber", "Bodenausgleichsmasse wenn uneben"] },
  { cat: "🚿 Bad & Fliesen", bg: "#E8F4F8", items: ["Bad-Silikon MIT Schimmelschutz (Soudal!)", "Fliesenkleber (Spezial-Haftkleber bei über-Fliesen)", "Fugenmasse – Farbe passend wählen", "Silikon-Entferner für altes Silikon", "Fliesen-Abstandshalter 2mm/3mm", "Dichtband für Wannenübergang", "Fliesenreiniger zum Entfetten"] },
  { cat: "💡 Licht & Elektro", bg: "#F8F3E8", items: ["LED E27 warm 2700K (nie kalt im Wohnbereich!)", "LED-Strip 2700K unter Schränken", "LED-Einbaustrahler IP44 (Pflicht im Bad!)", "Kabelkanal zum Verstecken", "Dimmer-Schalter ca. 15-30€"] },
  { cat: "🔩 Befestigung", bg: "#F5F0EC", items: ["Dübel 6mm + 8mm Sortiment", "Schrauben Torx (besser als Schlitz)", "Montagekleber Pattex/Sika", "Acryl überstreichbar (nicht im Nassbereich!)", "Teflon-Band für Wasseranschlüsse"] },
  { cat: "🔨 Werkzeug", bg: "#ECF0F5", items: ["Bohrmaschine / Schlagbohrmaschine", "Akkuschrauber (Bosch GO 2 ca. 50€)", "Wasserwaage 60cm", "Cutter-Messer + frische Klingen", "Gummihammer für Vinyl/Fliesen", "Rakel / Gummispachtel", "Malerrolle 18cm + Wanne", "Stichsäge – OBI Verleih möglich!"] },
  { cat: "🌿 Outdoor", bg: "#EDF5EC", items: ["Holzöl / Holzschutzlasur (1x/Jahr!)", "WPC-Dielen – wartungsfrei", "Outdoor-Teppich", "Solarleuchten – kein Kabel nötig", "Bambus-Sichtschutz 3 Matten ca. 45€", "Pflanzerde + Blumenkästen mit Ablaufloch"] },
  { cat: "🪑 Möbel & Deko", bg: "#F5EEF8", items: ["Kreidefarbe für Möbel (kein Schleifen!)", "Möbelfolie für IKEA-Möbel aufwerten", "Pflanzen (Monstera, Pothos pflegeleicht)", "Bilderleiste flexibel ohne neue Löcher", "Körbe/Aufbewahrung IKEA DRONA"] },
];

const PROJECT_TEMPLATES = [
  { name: "Bad Upgrade", icon: "🚿", steps: ["Altes Silikon mit Entferner ablösen", "Wand entfetten und säubern", "Neues Bad-Silikon ziehen und glätten", "24h trocknen lassen", "Spiegel prüfen oder tauschen", "Armaturen auf Mattschwarz tauschen"] },
  { name: "Boden verlegen", icon: "🪟", steps: ["Alten Boden reinigen und prüfen", "Unebenheiten mit Ausgleichsmasse füllen", "Unterlage auslegen", "Vinyl Reihe für Reihe einrasten", "Randstücke zuschneiden", "Sockelleisten montieren"] },
  { name: "Küche aufwerten", icon: "🍳", steps: ["Fronten abschrauben und entfetten", "Griffe tauschen", "Fronten schleifen und Haftgrund auftragen", "2-3 Schichten Lack auftragen", "Rückwand folieren", "LED-Strip unter Oberschränken kleben"] },
  { name: "Terrasse aufwerten", icon: "🌿", steps: ["Boden reinigen und ausmessen", "Klick-Fliesen von Mitte aus legen", "Sichtschutz montieren", "Paletten schleifen und lasieren", "Outdoor-Kissen aufstellen", "Lichterketten aufhängen"] },
];

function PlanerTab({ savedMakeovers }) {
  const [section, setSection] = useState("projekte");
  const [projects, setProjects] = useState([{ id: 1, name: "Mein erstes Projekt", icon: "🏠", steps: [{ text: "Raumgröße ausmessen", done: false }, { text: "Material bestellen", done: false }, { text: "Loslegen!", done: false }] }]);
  const [openProject, setOpenProject] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("🏠");
  const [newSteps, setNewSteps] = useState([]);
  const [stepInput, setStepInput] = useState("");
  const [checkItems, setCheckItems] = useState(() => CHECKLIST_DATA.map((cat) => ({ ...cat, items: cat.items.map((text) => ({ text, checked: false })) })));
  const [openTip, setOpenTip] = useState(null);
  const [addingTo, setAddingTo] = useState(null);
  const [addText, setAddText] = useState("");
  const [aiListTopic, setAiListTopic] = useState("");
  const [aiListResult, setAiListResult] = useState("");
  const [aiListLoading, setAiListLoading] = useState(false);

  const totalChecked = checkItems.flatMap((c) => c.items).filter((i) => i.checked).length;
  const totalItems = checkItems.flatMap((c) => c.items).length;

  function toggleStep(pid, si) {
    setProjects((prev) => prev.map((p) => p.id !== pid ? p : { ...p, steps: p.steps.map((s, idx) => idx !== si ? s : { ...s, done: !s.done }) }));
  }

  function createProject(template) {
    const id = Date.now();
    const proj = template
      ? { id, name: template.name, icon: template.icon, steps: template.steps.map((t) => ({ text: t, done: false })) }
      : { id, name: newName || "Mein Projekt", icon: newIcon, steps: newSteps.map((t) => ({ text: t, done: false })) };
    setProjects((prev) => [...prev, proj]);
    setCreating(false);
    setNewName(""); setNewIcon("🏠"); setNewSteps([]);
    setOpenProject(id);
  }

  function addStep() {
    if (stepInput.trim()) {
      setNewSteps((prev) => [...prev, stepInput.trim()]);
      setStepInput("");
    }
  }

  function toggleCheck(ci, ii) {
    setCheckItems((prev) => prev.map((cat, cidx) => cidx !== ci ? cat : { ...cat, items: cat.items.map((item, iidx) => iidx !== ii ? item : { ...item, checked: !item.checked }) }));
  }

  function addCheckItem(ci) {
    if (!addText.trim()) return;
    setCheckItems((prev) => prev.map((cat, cidx) => cidx !== ci ? cat : { ...cat, items: [...cat.items, { text: addText.trim(), checked: false }] }));
    setAddText("");
    setAddingTo(null);
  }

  function removeCheckItem(ci, ii) {
    setCheckItems((prev) => prev.map((cat, cidx) => cidx !== ci ? cat : { ...cat, items: cat.items.filter((_, iidx) => iidx !== ii) }));
  }

  function getAiList() {
    if (!aiListTopic.trim()) return;
    setAiListLoading(true);
    const reply = getRenovierungsAntwort(aiListTopic, false);
    setAiListResult(reply);
    setAiListLoading(false);
  }

  const ICONS = ["🏠", "🚿", "🍳", "🌿", "🛋️", "🛏️", "🔨", "📦"];

  return (
    <div style={{ overflowY: "auto", height: "100%", padding: "16px" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 14 }}>Planer & Checkliste</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
        {[["projekte", "📋 Projekte"], ["checkliste", "✅ Checkliste"]].map(([id, label]) => (
          <button key={id} onClick={() => setSection(id)} style={{ padding: "8px 18px", borderRadius: 20, border: "1px solid " + (section === id ? C.accent : C.border), background: section === id ? C.accent : C.card, color: section === id ? "white" : C.muted, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            {label}
          </button>
        ))}
      </div>

      {section === "makeover" && (
        <div>
          {(!savedMakeovers || savedMakeovers.length === 0) ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <p style={{ fontSize: 40, marginBottom: 16 }}>🏠</p>
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, marginBottom: 8 }}>Noch keine Makeovers</p>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>Lade ein Foto im 💬 Makeover-Tab hoch und speichere dein Ergebnis hier.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {savedMakeovers.map((m) => (
                <div key={m.id} className="fu" style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, overflow: "hidden" }}>
                  <div style={{ height: 160, overflow: "hidden" }}>
                    <img src={m.imgUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 700 }}>{m.titel || "Makeover"}</p>
                      <span style={{ fontSize: 12, color: C.muted }}>{m.date}</span>
                    </div>
                    {m.wunsch && (
                      <p style={{ fontSize: 12, color: C.accent, marginBottom: 8 }}>💬 "{m.wunsch.slice(0, 60)}{m.wunsch.length > 60 ? "…" : ""}"</p>
                    )}
                    {m.materials && (
                      <p style={{ fontSize: 12, color: "#555", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.materials.slice(0, 200)}{m.materials.length > 200 ? "…" : ""}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {section === "projekte" && (
        <div>
          {projects.map((proj) => {
            const doneCount = proj.steps.filter((s) => s.done).length;
            const pct = proj.steps.length ? Math.round((doneCount / proj.steps.length) * 100) : 0;
            return (
              <div key={proj.id} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, marginBottom: 14, overflow: "hidden" }}>
                <div onClick={() => setOpenProject(openProject === proj.id ? null : proj.id)} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 28 }}>{proj.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 15 }}>{proj.name}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                      <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: pct + "%", background: pct === 100 ? C.green : C.accent, borderRadius: 3, transition: "width 0.3s" }} />
                      </div>
                      <span style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>{doneCount}/{proj.steps.length}</span>
                    </div>
                  </div>
                  <span style={{ color: C.muted }}>{openProject === proj.id ? "▲" : "▼"}</span>
                </div>
                {openProject === proj.id && (
                  <div style={{ borderTop: "1px solid " + C.border, padding: "12px 16px" }}>
                    {proj.steps.map((step, si) => (
                      <div key={si} onClick={() => toggleStep(proj.id, si)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: si < proj.steps.length - 1 ? "1px solid " + C.border : "none", cursor: "pointer" }}>
                        <div style={{ width: 20, height: 20, borderRadius: 5, border: "2px solid " + (step.done ? C.green : C.border), background: step.done ? C.green : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {step.done && <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>✓</span>}
                        </div>
                        <p style={{ fontSize: 14, color: step.done ? C.muted : C.text, textDecoration: step.done ? "line-through" : "none" }}>{step.text}</p>
                      </div>
                    ))}
                    {pct === 100 && <div style={{ marginTop: 10, background: C.greenBg, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}><p style={{ color: C.green, fontWeight: 600, fontSize: 14 }}>🎉 Projekt abgeschlossen!</p></div>}
                    <button onClick={() => setProjects((prev) => prev.filter((p) => p.id !== proj.id))} style={{ marginTop: 10, background: "none", border: "none", color: "#B91C1C", fontSize: 13, cursor: "pointer", padding: "4px 0" }}>🗑 Projekt löschen</button>
                  </div>
                )}
              </div>
            );
          })}

          {!creating && (
            <div>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>Schnellstart-Vorlage:</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                {PROJECT_TEMPLATES.map((tmpl, i) => (
                  <div key={i} onClick={() => createProject(tmpl)} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "14px", cursor: "pointer", textAlign: "center" }} onMouseOver={(e) => { e.currentTarget.style.borderColor = C.accent; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = C.border; }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{tmpl.icon}</div>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>{tmpl.name}</p>
                    <p style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{tmpl.steps.length} Schritte</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setCreating(true)} style={{ width: "100%", padding: "12px", borderRadius: 50, border: "2px dashed " + C.accent, background: C.accentBg, color: C.accent, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
                + Eigenes Projekt erstellen
              </button>
            </div>
          )}

          {creating && (
            <div className="fu" style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "16px" }}>
              <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Neues Projekt</p>
              <p style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Symbol wählen</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {ICONS.map((ic) => (
                  <button key={ic} onClick={() => setNewIcon(ic)} style={{ width: 38, height: 38, borderRadius: 10, border: "2px solid " + (newIcon === ic ? C.accent : C.border), background: newIcon === ic ? C.accentBg : "white", cursor: "pointer", fontSize: 20 }}>{ic}</button>
                ))}
              </div>
              <p style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Projektname</p>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="z.B. Bad renovieren" style={{ width: "100%", padding: "10px 13px", borderRadius: 10, border: "2px solid " + C.border, fontSize: 14, fontFamily: "'DM Sans', sans-serif", marginBottom: 14, background: C.bg }} />
              <p style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Schritte ({newSteps.length})</p>
              {newSteps.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 20, height: 20, background: C.accent, color: "white", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>{i + 1}</span>
                  <p style={{ flex: 1, fontSize: 14 }}>{s}</p>
                  <button onClick={() => setNewSteps((prev) => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#CCC", cursor: "pointer" }}>✕</button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <input value={stepInput} onChange={(e) => setStepInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addStep(); }} placeholder="Schritt hinzufügen…" style={{ flex: 1, padding: "9px 13px", borderRadius: 10, border: "1px solid " + C.border, fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: C.bg }} />
                <button onClick={addStep} style={{ padding: "9px 16px", borderRadius: 10, background: C.accent, color: "white", border: "none", cursor: "pointer", fontWeight: 600 }}>+</button>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => createProject(null)} style={{ flex: 1, padding: "12px", borderRadius: 50, background: C.accent, color: "white", border: "none", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Erstellen</button>
                <button onClick={() => setCreating(false)} style={{ flex: 1, padding: "12px", borderRadius: 50, border: "2px solid " + C.border, background: "none", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Abbrechen</button>
              </div>
            </div>
          )}
        </div>
      )}

      {section === "checkliste" && (
        <div>
          <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "13px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, color: C.muted, marginBottom: 5 }}>Fortschritt</p>
              <div style={{ height: 7, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: (totalChecked / totalItems * 100) + "%", background: C.accent, borderRadius: 4, transition: "width 0.3s" }} />
              </div>
            </div>
            <span style={{ fontWeight: 700, fontSize: 20, color: C.accent }}>{totalChecked}/{totalItems}</span>
          </div>

          <div style={{ background: C.accentBg, border: "1px solid #F0C4A0", borderRadius: 12, padding: "14px 16px", marginBottom: 18 }}>
            <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>🤖 KI-Einkaufsliste erstellen</p>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={aiListTopic} onChange={(e) => setAiListTopic(e.target.value)} onKeyDown={(e) => e.key === "Enter" && getAiList()} placeholder="z.B. Badezimmer streichen…" style={{ flex: 1, padding: "8px 12px", borderRadius: 9, border: "1px solid #F0C4A0", fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: "white" }} />
              <button onClick={getAiList} disabled={aiListLoading || !aiListTopic.trim()} style={{ padding: "8px 14px", borderRadius: 9, background: aiListLoading || !aiListTopic.trim() ? "#DDD" : C.accent, color: "white", border: "none", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                {aiListLoading ? <LoadingSpinner size={14} /> : "→"}
              </button>
            </div>
            {aiListResult && (
              <div style={{ marginTop: 10, background: "white", borderRadius: 9, padding: "11px 13px" }}>
                <p style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{aiListResult}</p>
              </div>
            )}
          </div>

          {checkItems.map((cat, ci) => (
            <div key={ci} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{cat.cat}</p>
                <span style={{ fontSize: 12, color: C.muted }}>{cat.items.filter((i) => i.checked).length}/{cat.items.length}</span>
              </div>
              <div style={{ background: cat.bg, border: "1px solid " + C.border, borderRadius: 12, overflow: "hidden" }}>
                {cat.items.map((item, ii) => (
                  <div key={ii} style={{ padding: "10px 14px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", gap: 10 }}>
                    <div onClick={() => toggleCheck(ci, ii)} style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, cursor: "pointer", border: "2px solid " + (item.checked ? C.accent : C.border), background: item.checked ? C.accent : "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {item.checked && <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>✓</span>}
                    </div>
                    <p style={{ flex: 1, fontSize: 13, color: item.checked ? C.muted : C.text, textDecoration: item.checked ? "line-through" : "none" }}>{item.text}</p>
                    <button onClick={() => setOpenTip(openTip === ci + "-" + ii ? null : ci + "-" + ii)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>💡</button>
                    <button onClick={() => removeCheckItem(ci, ii)} style={{ background: "none", border: "none", cursor: "pointer", color: "#CCC", fontSize: 14 }}>✕</button>
                  </div>
                ))}
                {addingTo === ci ? (
                  <div style={{ padding: "8px 12px", borderTop: "1px solid " + C.border, display: "flex", gap: 8 }}>
                    <input autoFocus value={addText} onChange={(e) => setAddText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addCheckItem(ci); if (e.key === "Escape") setAddingTo(null); }} placeholder="Artikel…" style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1px solid " + C.border, fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: "white" }} />
                    <button onClick={() => addCheckItem(ci)} style={{ background: C.accent, color: "white", border: "none", borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontWeight: 700 }}>+</button>
                    <button onClick={() => setAddingTo(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}>✕</button>
                  </div>
                ) : (
                  <button onClick={() => setAddingTo(ci)} style={{ width: "100%", padding: "9px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.accent, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", textAlign: "left", borderTop: "1px solid " + C.border }}>
                    + Hinzufügen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TAB 5: INSPIRATION GALLERY ──────────────────────────────────────────────
// ─── INSPIRATION DATA (outside component) ────────────────────────────────────
// ─── INSPIRATION DATA ────────────────────────────────────────────────────────
const INSPO_DATA = [
  {
    label: "Wellness-Bad", emoji: "🚿",
    cards: [
      { title: "Walk-In Dusche", tag: "Trendiest 2025", grad: ["#2a4858","#1a3040"], accent: "#7EC8E3", icon: "🚿", elems: ["Bodengleich","Regendusche","Glaswand","IP44 Licht"] },
      { title: "Mikrozement fugenlos", tag: "Edel & zeitlos", grad: ["#6b6b6b","#4a4a4a"], accent: "#D4C5B0", icon: "🏛️", elems: ["Kein Stemmen","Über Fliesen","3 Schichten","Versiegelung"] },
      { title: "LED-Spiegel & Mattschwarz", tag: "Sofort-Upgrade", grad: ["#1a1a1a","#2d2d2d"], accent: "#E8C97A", icon: "🪞", elems: ["IP44 Pflicht","Mattschwarz","LED-Rahmen","Warm 2700K"] },
      { title: "Spa-Atmosphäre", tag: "Hotel-Feeling", grad: ["#3d5a4a","#2a3d33"], accent: "#A8D8B0", icon: "🌿", elems: ["Holzakzente","Warm 2700K","Pflanzen","Dunkle Decke"] },
    ],
  },
  {
    label: "Moderne Küche", emoji: "🍳",
    cards: [
      { title: "Dunkle Fronten", tag: "Magazin-Look", grad: ["#1a1a2e","#16213e"], accent: "#E8B87A", icon: "🖤", elems: ["Navy/Dunkelgrün","Messinggriffe","Pendellampen","Eichenholz"] },
      { title: "Offene Holzregale", tag: "Trend 2025", grad: ["#5C3D1E","#7A5230"], accent: "#F5DEB3", icon: "📚", elems: ["Oberschränke raus","Eiche massiv","Schwebeträger","Warm beleuchtet"] },
      { title: "Kücheninsel", tag: "Wow-Projekt", grad: ["#2c2c2c","#1a1a1a"], accent: "#F0EAD6", icon: "🏝️", elems: ["IKEA-Hack","Massivholz","Pendellichter","Barhocker"] },
      { title: "Metro-Fliesen", tag: "Zeitlos", grad: ["#E8E8E8","#D0D0D0"], accent: "#2c2c2c", icon: "⬜", elems: ["7,5×15cm","Weiß zeitlos","Fugenmasse grau","Über Fliesen"] },
    ],
  },
  {
    label: "Wohnzimmer", emoji: "🛋️",
    cards: [
      { title: "Erdetöne & Gemütlichkeit", tag: "Wohlfühl", grad: ["#C4622D","#A0522D"], accent: "#F5DEB3", icon: "🍂", elems: ["Terrakotta Wand","Leinensofas","Rattan","Pflanzen"] },
      { title: "TV-Wand Holzlatten", tag: "Statement", grad: ["#5a4a3a","#3d3028"], accent: "#D4A96A", icon: "📺", elems: ["MDF-Latten","LED dahinter","OBI Zuschnitt","Warm 2700K"] },
      { title: "Akzentwand Dunkelgrün", tag: "Trend 2025", grad: ["#1a3a2a","#0d2218"], accent: "#7EC89A", icon: "🌿", elems: ["Nur 1 Wand","Abkleben","2 Schichten","Testfeld zuerst"] },
      { title: "Indirektes Deckenlicht", tag: "Luxus-Feeling", grad: ["#1C1C2E","#2D2D44"], accent: "#E8C97A", icon: "✨", elems: ["Kastenrahmen","LED-Strip","2700K warm","Rigips Decke"] },
    ],
  },
  {
    label: "Schlafzimmer", emoji: "🛏️",
    cards: [
      { title: "Terrakotta Akzentwand", tag: "Gemütlich", grad: ["#C4622D","#8B4513"], accent: "#F5DEB3", icon: "🍂", elems: ["Nur Bett-Wand","RAL 3012","Leinenbettwäsche","Holzboden"] },
      { title: "LED Kopfteil-Wand", tag: "Hotel-Look", grad: ["#1a1a2e","#0d0d1a"], accent: "#E8C97A", icon: "🌟", elems: ["MDF-Rahmen","LED-Kanal","Polsterung","Warm 2200K"] },
      { title: "Dunkle Decke", tag: "Geborgenheit", grad: ["#0d1a2e","#081015"], accent: "#7EC8E3", icon: "🌙", elems: ["Nachtblau","Indirektes Licht","Helle Wände","Tiefer Schlaf"] },
      { title: "Holzpaneele Japandi", tag: "Minimalistisch", grad: ["#5C3D1E","#3d2810"], accent: "#E8D5B0", icon: "🪵", elems: ["Vertikal","Naturholz","Neutral Töne","Ruhe pur"] },
    ],
  },
  {
    label: "Terrasse", emoji: "🌿",
    cards: [
      { title: "WPC-Boden Lounge", tag: "Sommer-Traum", grad: ["#3d6b47","#2a4d32"], accent: "#A8D8B0", icon: "🌴", elems: ["Wartungsfrei","Holzoptik","Paletten-Sofa","Lichterketten"] },
      { title: "Pergola selbst gebaut", tag: "Wert-Upgrade", grad: ["#5C4A1E","#3d3010"], accent: "#F5DEB3", icon: "🏛️", elems: ["Douglasie","Rankpflanzen","Fundament","Holzschutz"] },
      { title: "Balkon Oase", tag: "Mietwohnung ✓", grad: ["#2d4a3e","#1a3028"], accent: "#7EC89A", icon: "🌱", elems: ["Bambus Sichtschutz","Kräuter","Solarlichter","Klickfliesen"] },
      { title: "Outdoor-Küche", tag: "Geselligkeit", grad: ["#1a1a1a","#2d2d2d"], accent: "#E8B87A", icon: "🔥", elems: ["Holztisch","Gasgrill","Seitenablage","Abendstimmung"] },
    ],
  },
  {
    label: "Flur", emoji: "🚪",
    cards: [
      { title: "Dunkler edler Eingang", tag: "Wow-Effekt", grad: ["#1a2e1a","#0d1a0d"], accent: "#A8D8A8", icon: "🚪", elems: ["Dunkelgrün","Rundspiegel","Messinghaken","Fischgrät"] },
      { title: "Holzvertäfelung", tag: "Hochwertig", grad: ["#5C3D1E","#3d2810"], accent: "#F5DEB3", icon: "🪵", elems: ["Untere Hälfte","MDF-Paneele","Abschlussleiste","Zeitlos"] },
      { title: "Hexagon Boden", tag: "Eyecatcher", grad: ["#2c2c2c","#1a1a1a"], accent: "#F0F0F0", icon: "⬡", elems: ["25–60€/m²","Mitte starten","Fugenmasse grau","Zeitlos"] },
      { title: "Einbauschrank Nische", tag: "Praktisch", grad: ["#E8E8E8","#D0D0D0"], accent: "#2c2c2c", icon: "🗄️", elems: ["Decke bis Boden","Füllleisten","Sitzbank","Stauraum"] },
    ],
  },
];

// ─── VISUAL CARD COMPONENT ────────────────────────────────────────────────────
function VisualCard({ card, onClick, isOpen, size }) {
  const isLarge = size === "large";
  return (
    <div
      onClick={onClick}
      className="fu"
      style={{
        borderRadius: isLarge ? 18 : 14,
        overflow: "hidden",
        cursor: "pointer",
        border: "2px solid " + (isOpen ? card.accent : "rgba(255,255,255,0.15)"),
        transition: "all 0.2s",
        background: "linear-gradient(145deg, " + card.grad[0] + " 0%, " + card.grad[1] + " 100%)",
        position: "relative",
        minHeight: isLarge ? 200 : 160,
      }}
    >
      {/* Decorative background shapes */}
      <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: card.accent, opacity: 0.08 }} />
      <div style={{ position: "absolute", bottom: -30, left: -10, width: 80, height: 80, borderRadius: "50%", background: card.accent, opacity: 0.06 }} />

      <div style={{ padding: isLarge ? "22px 20px 18px" : "16px 14px 14px", position: "relative" }}>
        {/* Emoji + Title */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <span style={{ fontSize: isLarge ? 38 : 28 }}>{card.icon}</span>
            <p style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: isLarge ? 18 : 14,
              color: "white",
              fontWeight: 700,
              marginTop: 8,
              lineHeight: 1.3,
            }}>{card.title}</p>
          </div>
          <span style={{
            background: card.accent,
            color: card.grad[0],
            borderRadius: 20, padding: "4px 10px",
            fontSize: 11, fontWeight: 700,
            flexShrink: 0, marginTop: 4,
          }}>{card.tag}</span>
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {card.elems.map((el, i) => (
            <span key={i} style={{
              background: "rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.85)",
              borderRadius: 20, padding: "3px 9px",
              fontSize: 11, fontWeight: 500,
            }}>{el}</span>
          ))}
        </div>

        {/* Open/close hint */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <span style={{
            fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 500,
          }}>
            {isOpen ? "▲ Schließen" : "▼ Tippen für Beschreibung"}
          </span>
          <div style={{ width: 28, height: 4, borderRadius: 2, background: card.accent, opacity: 0.6 }} />
        </div>
      </div>
    </div>
  );
}

// ─── TAB 5: INSPIRATION ───────────────────────────────────────────────────────
function InspirationTab() {
  const [activeStyle, setActiveStyle] = useState(0);
  const [openIdx, setOpenIdx] = useState(null);
  const [texts, setTexts] = useState({});
  const [loadingKey, setLoadingKey] = useState(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const style = INSPO_DATA[activeStyle];
  const total = INSPO_DATA.length;

  function goTo(i) {
    const next = (i + total) % total;
    setActiveStyle(next);
    setOpenIdx(null);
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) goTo(activeStyle + 1);
      else goTo(activeStyle - 1);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }

  function handleCardClick(i) {
    const key = activeStyle + "_" + i;
    if (openIdx === i) { setOpenIdx(null); return; }
    setOpenIdx(i);
    if (texts[key]) return;
    setLoadingKey(key);
    const card = INSPO_DATA[activeStyle].cards[i];
    const reply = getRenovierungsAntwort(card.title + " " + card.elems.join(" "), false);
    setTexts(prev => ({ ...prev, [key]: reply }));
    setLoadingKey(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ background: C.card, borderBottom: "1px solid " + C.border, padding: "14px 16px 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20 }}>
            🖼️ Visuelle Inspiration
          </h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => goTo(activeStyle - 1)} style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid " + C.border, background: C.card, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
            <button onClick={() => goTo(activeStyle + 1)} style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid " + C.border, background: C.card, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>→</button>
          </div>
        </div>

        {/* Current style + dots */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>{style.emoji}</span>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: C.text }}>{style.label}</p>
            <span style={{ fontSize: 12, color: C.muted }}>{activeStyle + 1}/{total}</span>
          </div>
          {/* Dot indicators */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {INSPO_DATA.map((s, i) => (
              <div key={i} onClick={() => goTo(i)} style={{
                width: activeStyle === i ? 24 : 8,
                height: 8, borderRadius: 4,
                background: activeStyle === i ? C.accent : C.border,
                cursor: "pointer",
                transition: "all 0.3s ease",
                flexShrink: 0,
              }} />
            ))}
          </div>
        </div>

        <p style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
          ← → wischen oder Pfeile nutzen · Tippen für KI-Beschreibung
        </p>
      </div>

      {/* Swipeable content */}
      <div
        style={{ flex: 1, overflowY: "auto", padding: "16px" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Hero card */}
        <div style={{ marginBottom: 12 }}>
          <VisualCard
            card={style.cards[0]}
            onClick={() => handleCardClick(0)}
            isOpen={openIdx === 0}
            size="large"
          />
          {openIdx === 0 && (
            <div className="fu" style={{
              background: "linear-gradient(135deg, " + style.cards[0].grad[0] + "22, " + style.cards[0].grad[1] + "11)",
              border: "1px solid " + style.cards[0].accent + "44",
              borderTop: "none", borderRadius: "0 0 14px 14px",
              padding: "14px 18px",
            }}>
              {loadingKey === activeStyle + "_0" ? (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <LoadingSpinner size={16} />
                  <p style={{ fontSize: 13, color: C.muted }}>KI beschreibt…</p>
                </div>
              ) : (
                <p style={{ fontSize: 14, color: C.text, lineHeight: 1.7 }}>{texts[activeStyle + "_0"]}</p>
              )}
            </div>
          )}
        </div>

        {/* 2-col grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {style.cards.slice(1).map((card, idx) => {
            const i = idx + 1;
            const key = activeStyle + "_" + i;
            return (
              <div key={i}>
                <VisualCard
                  card={card}
                  onClick={() => handleCardClick(i)}
                  isOpen={openIdx === i}
                  size="small"
                />
                {openIdx === i && (
                  <div className="fu" style={{
                    background: card.grad[0] + "22",
                    border: "1px solid " + card.accent + "33",
                    borderTop: "none", borderRadius: "0 0 10px 10px",
                    padding: "10px 12px",
                  }}>
                    {loadingKey === key ? (
                      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                        <LoadingSpinner size={14} />
                        <p style={{ fontSize: 12, color: C.muted }}>…</p>
                      </div>
                    ) : (
                      <p style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{texts[key]}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Nav buttons at bottom */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <button onClick={() => goTo(activeStyle - 1)} style={{
            flex: 1, padding: "12px", borderRadius: 50,
            border: "1px solid " + C.border, background: C.card,
            cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans',sans-serif",
            fontWeight: 500, color: C.text,
          }}>
            ← {INSPO_DATA[(activeStyle - 1 + total) % total].emoji} {INSPO_DATA[(activeStyle - 1 + total) % total].label}
          </button>
          <button onClick={() => goTo(activeStyle + 1)} style={{
            flex: 1, padding: "12px", borderRadius: 50,
            border: "1px solid " + C.border, background: C.card,
            cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans',sans-serif",
            fontWeight: 500, color: C.text,
          }}>
            {INSPO_DATA[(activeStyle + 1) % total].emoji} {INSPO_DATA[(activeStyle + 1) % total].label} →
          </button>
        </div>

        {/* CTA */}
        <div style={{ background: C.accentBg, border: "1px solid #F0C4A0", borderRadius: 14, padding: "16px", textAlign: "center" }}>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Gefällt dir ein Stil?</p>
          <p style={{ fontSize: 13, color: "#7A4A2A", lineHeight: 1.6 }}>
            💬 Makeover-Tab → Foto hochladen → KI zeigt dir wie das bei dir aussieht
          </p>
        </div>
      </div>
    </div>
  );
}


// ─── APP ROOT ────────────────────────────────────────────────────────────────
// ─── TAB 6: HANDWERKER ───────────────────────────────────────────────────────
const HANDWERKER_BEISPIELE = [
  { name: "Fliesenleger Meier", branche: "Fliesen & Bad", ort: "München", rating: 4.9, reviews: 34, tel: "+49 89 123456", beschreibung: "Badsanierungen, Mikrozement, Walk-In Duschen. 20 Jahre Erfahrung.", badge: "Top-Betrieb" },
  { name: "Maler Schmidt & Söhne", branche: "Maler & Lackierer", ort: "Hamburg", rating: 4.8, reviews: 61, tel: "+49 40 654321", beschreibung: "Innen- und Außenarbeiten, Tapezieren, Spachteln, Fassaden.", badge: "Schnell verfügbar" },
  { name: "Elektro Hoffmann", branche: "Elektriker", ort: "Berlin", rating: 5.0, reviews: 28, tel: "+49 30 987654", beschreibung: "Smart Home, Unterverteilung, Steckdosen, LED-Einbau.", badge: "Top-Betrieb" },
  { name: "Sanitär Bauer GmbH", branche: "Sanitär & Heizung", ort: "Frankfurt", rating: 4.7, reviews: 45, tel: "+49 69 111222", beschreibung: "Badsanierung, Heizungsumbau, Wärmepumpen, Boiler.", badge: null },
  { name: "Trockenbau Vogel", branche: "Trockenbau", ort: "Stuttgart", rating: 4.8, reviews: 19, tel: "+49 711 333444", beschreibung: "Rigips, Abgehängte Decken, Vorbauwände, Dämmung.", badge: "Schnell verfügbar" },
];

const BRANCHEN = ["Alle", "Fliesen & Bad", "Maler & Lackierer", "Elektriker", "Sanitär & Heizung", "Trockenbau", "Schreiner", "Bodenleger"];

function HandwerkerTab() {
  const [filter, setFilter] = useState("Alle");
  const [ort, setOrt] = useState("");

  const gefiltert = HANDWERKER_BEISPIELE.filter(h =>
    (filter === "Alle" || h.branche === filter) &&
    (ort === "" || h.ort.toLowerCase().includes(ort.toLowerCase()))
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ background: C.card, borderBottom: "1px solid " + C.border, padding: "14px 16px 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20 }}>🔨 Profis finden</h2>
          <span style={{ background: "#FFF0E8", color: C.accent, borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700 }}>DEMO</span>
        </div>

        {/* Ort-Suche */}
        <input
          value={ort}
          onChange={e => setOrt(e.target.value)}
          placeholder="📍 Stadt oder PLZ eingeben…"
          style={{ width: "100%", border: "1px solid " + C.border, borderRadius: 10, padding: "9px 13px", fontSize: 14, marginBottom: 10, fontFamily: "'DM Sans', sans-serif", background: C.bg }}
        />

        {/* Branchen-Filter */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
          {BRANCHEN.map(b => (
            <button key={b} onClick={() => setFilter(b)} style={{
              padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer",
              background: filter === b ? C.accent : C.bg,
              color: filter === b ? "white" : C.muted,
              fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
              fontFamily: "'DM Sans', sans-serif", flexShrink: 0,
            }}>{b}</button>
          ))}
        </div>
      </div>

      {/* Handwerker-Karten */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>

        {/* Info-Banner */}
        <div style={{ background: "linear-gradient(135deg, #1a1a2e, #2d2d4e)", borderRadius: 14, padding: "14px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 28 }}>💼</span>
          <div>
            <p style={{ color: "white", fontWeight: 700, fontSize: 13, marginBottom: 2 }}>Du bist Handwerker?</p>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>Hier eintragen für nur 39€/Monat – direkt Kunden gewinnen</p>
          </div>
          <span style={{ background: C.accent, color: "white", borderRadius: 20, padding: "6px 12px", fontSize: 12, fontWeight: 700, flexShrink: 0, cursor: "pointer" }}>
            Anfragen →
          </span>
        </div>

        {gefiltert.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🔍</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>Keine Treffer</p>
            <p style={{ fontSize: 13, color: C.muted }}>Versuche einen anderen Ort oder Filter</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            {gefiltert.map((h, i) => (
              <div key={i} className="fu" style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: "16px", animationDelay: i * 0.06 + "s" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: C.text }}>{h.name}</p>
                      {h.badge && (
                        <span style={{ background: h.badge === "Top-Betrieb" ? "#FFF0E8" : "#F0F5EC", color: h.badge === "Top-Betrieb" ? C.accent : "#3a7a56", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
                          {h.badge === "Top-Betrieb" ? "⭐ " : "✅ "}{h.badge}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: C.muted }}>{h.branche} · {h.ort}</p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: C.accent }}>{"★ " + h.rating}</p>
                    <p style={{ fontSize: 11, color: C.muted }}>{h.reviews} Bewertungen</p>
                  </div>
                </div>

                <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6, marginBottom: 12 }}>{h.beschreibung}</p>

                <div style={{ display: "flex", gap: 8 }}>
                  <a href={"tel:" + h.tel} style={{
                    flex: 1, padding: "9px", borderRadius: 50, textAlign: "center",
                    background: C.accent, color: "white", textDecoration: "none",
                    fontSize: 13, fontWeight: 600,
                  }}>
                    📞 Anrufen
                  </a>
                  <button style={{
                    flex: 1, padding: "9px", borderRadius: 50,
                    border: "2px solid " + C.border, background: C.bg,
                    color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    💬 Anfrage senden
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Geschäftsmodell-Hinweis */}
        <div style={{ background: "#F0F5EC", border: "1px solid #C8E6C9", borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "#2e7d32", lineHeight: 1.6 }}>
            💡 <strong>Idee:</strong> Handwerker zahlen 39€/Monat für ihren Eintrag.<br />
            20 Einträge = 780€/Monat passives Einkommen!
          </p>
        </div>
      </div>
    </div>
  );
}

const STILE_MAKEOVER = [
  { id: "bad-modern",    emoji: "🚿", label: "Bad: Modern & Spa" },
  { id: "bad-warm",      emoji: "🚿", label: "Bad: Hell & Warm" },
  { id: "bad-mikro",     emoji: "🚿", label: "Bad: Mikrozement" },
  { id: "kueche-navy",   emoji: "🍳", label: "Küche: Navy & Holz" },
  { id: "kueche-grau",   emoji: "🍳", label: "Küche: Seidengrau" },
  { id: "kueche-gruen",  emoji: "🍳", label: "Küche: Salbeigrün" },
  { id: "wohn-gruen",    emoji: "🛋️", label: "Wohnzimmer: Grün" },
  { id: "wohn-terra",    emoji: "🛋️", label: "Wohnzimmer: Terrakotta" },
  { id: "schlaf-terra",  emoji: "🛏️", label: "Schlafzimmer: Terrakotta" },
  { id: "schlaf-dunkel", emoji: "🛏️", label: "Schlafzimmer: Dunkel" },
  { id: "terrasse-wpc",  emoji: "🌿", label: "Terrasse: WPC & Lounge" },
];

function compressImageFile(file) {
  return new Promise(function(resolve) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement("canvas");
      var max = 1024;
      var w = img.width, h = img.height;
      if (w > h && w > max) { h = Math.round(h * max / w); w = max; }
      else if (h > max) { w = Math.round(w * max / h); h = max; }
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob(function(blob) {
        var reader = new FileReader();
        reader.onload = function() { resolve(reader.result.split(",")[1]); };
        reader.readAsDataURL(blob);
      }, "image/jpeg", 0.85);
    };
    img.src = URL.createObjectURL(file);
  });
}

// ─── Markdown + Affiliate Renderer ───────────────────────────────────────────
function renderMaterialien(text) {
  if (!text) return null;
  var lines = text.split("\n");
  return lines.map(function(line, i) {
    if (!line.trim()) return React.createElement("div", { key: i, style: { height: 8 } });

    // Render bold **text**
    var parts = line.split(/\*\*(.*?)\*\*/g);
    var rendered = parts.map(function(part, j) {
      if (j % 2 === 1) return React.createElement("strong", { key: j, style: { color: C.text, fontWeight: 700 } }, part);
      return part;
    });

    // Check if line has a product keyword for affiliate link
    var lowerLine = line.toLowerCase();
    var affiliateLink = null;
    var linkLabel = null;

    if (lowerLine.match(/fliesen|feinsteinzeug|anthrazit.*fliesen|fliesen.*anthrazit/)) {
      affiliateLink = amazonLink("Feinsteinzeug Fliesen Anthrazit 80x80"); linkLabel = "Amazon";
    } else if (lowerLine.match(/walk.in.*dusche|dusche.*glas|glaswand|esg.glas|glasscheibe/)) {
      affiliateLink = amazonLink("Walk-In Dusche Glaswand 8mm ESG"); linkLabel = "Amazon";
    } else if (lowerLine.match(/waschtisch|waschbecken|unterschrank.*holz|teak.*holz.*wand/)) {
      affiliateLink = amazonLink("Schwebender Waschtisch Holz Wandmontage"); linkLabel = "Amazon";
    } else if (lowerLine.match(/led.*spiegel|spiegel.*led|emke|aquamarin.*spiegel/)) {
      affiliateLink = amazonLink("LED Spiegel Bad beleuchtet IP44 Emke"); linkLabel = "Amazon";
    } else if (lowerLine.match(/armatur|mattschwarz.*armatur|armatur.*mattschwarz|wasserhahn.*schwarz/)) {
      affiliateLink = amazonLink("Waschtisch Armatur mattschwarz"); linkLabel = "Amazon";
    } else if (lowerLine.match(/mikrozement|mikro.zement/)) {
      affiliateLink = amazonLink("Mikrozement Set Boden Wand Versiegelung"); linkLabel = "Amazon";
    } else if (lowerLine.match(/vinyl|spc.*boden|luxury.*vinyl|klick.*boden/)) {
      affiliateLink = amazonLink("SPC Vinyl Boden wasserfest Rigid Core 5mm"); linkLabel = "Amazon";
    } else if (lowerLine.match(/laminat/)) {
      affiliateLink = amazonLink("Laminat Eiche 8mm Klick Trittschall"); linkLabel = "Amazon";
    } else if (lowerLine.match(/parkett/)) {
      affiliateLink = amazonLink("Fertigparkett Eiche geoelt Click"); linkLabel = "Amazon";
    } else if (lowerLine.match(/silikon|silikonfuge/)) {
      affiliateLink = amazonLink("Soudal Bad Silikon Schimmelschutz"); linkLabel = "Amazon";
    } else if (lowerLine.match(/led.*strip|led.*streifen|led.*leiste/)) {
      affiliateLink = amazonLink("LED Strip 2700K warmweiss 5m dimmbar"); linkLabel = "Amazon";
    } else if (lowerLine.match(/einbaustrahler|einbau.*strahler/)) {
      affiliateLink = amazonLink("LED Einbaustrahler GU10 IP44 Set"); linkLabel = "Amazon";
    } else if (lowerLine.match(/pendelleuchte|haengelampe|pendellampe/)) {
      affiliateLink = amazonLink("Pendelleuchte Schwarz Kueche Esstisch"); linkLabel = "Amazon";
    } else if (lowerLine.match(/griffe|tuergriff|schrankgriff/)) {
      affiliateLink = amazonLink("Kuechen Griffe mattschwarz 128mm Set 20"); linkLabel = "Amazon";
    } else if (lowerLine.match(/tapete|vlies.*tapete/)) {
      affiliateLink = amazonLink("Vliestapete Strukturtapete modern"); linkLabel = "Amazon";
    } else if (lowerLine.match(/wandfarbe|wandlack|kreidefarbe/)) {
      affiliateLink = amazonLink("Wandfarbe Erdtöne seidenmatt Terrakotta"); linkLabel = "Amazon";
    } else if (lowerLine.match(/paneele|wandpaneel|holzpaneel|fluted/)) {
      affiliateLink = amazonLink("Wandpaneele MDF Holzoptik selbstklebend"); linkLabel = "Amazon";
    } else if (lowerLine.match(/dichtschl|abdicht|kerdi/)) {
      affiliateLink = amazonLink("Dichtschlaemme 2K Dusche Abdichtung Bad"); linkLabel = "Amazon";
    } else if (lowerLine.match(/osmo|hartwachs.*oel|holzoel/)) {
      affiliateLink = amazonLink("Osmo Hartwachsoel 3032 750ml"); linkLabel = "Amazon";
    } else if (lowerLine.match(/wpc.*diele|holzdiele|terrassen.*diele/)) {
      affiliateLink = amazonLink("WPC Dielen Terrasse Holzoptik Clip"); linkLabel = "Amazon";
    }

    return React.createElement("div", { key: i, style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 } },
      React.createElement("p", { style: { fontSize: 13, color: "#555", lineHeight: 1.7, flex: 1 } }, rendered),
      affiliateLink ? React.createElement("a", {
        href: affiliateLink,
        target: "_blank",
        rel: "noopener noreferrer",
        style: { flexShrink: 0, background: "#F0F5EC", color: "#3a7a56", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" },
      }, "Amazon →") : null
    );
  });
}


function MakeoverTab({ onSaveToPlaner, savedMakeovers }) {
  var fileRef = useRef();
  var s1 = useState(null); var file = s1[0]; var setFile = s1[1];
  var s2 = useState(null); var vorherUrl = s2[0]; var setVorherUrl = s2[1];
  var s3 = useState(null); var nachherUrl = s3[0]; var setNachherUrl = s3[1];
  var s4 = useState(null); var materials = s4[0]; var setMaterials = s4[1];
  var s5 = useState("bad-modern"); var stil = s5[0]; var setStil = s5[1];
  var s6 = useState(false); var loading = s6[0]; var setLoading = s6[1];
  var s7 = useState(null); var error = s7[0]; var setError = s7[1];
  var s8 = useState(0); var progress = s8[0]; var setProgress = s8[1];
  var s9 = useState(""); var wunsch = s9[0]; var setWunsch = s9[1];
  var s10 = useState(false); var chatOpen = s10[0]; var setChatOpen = s10[1];
  var s11 = useState(false); var saved = s11[0]; var setSaved = s11[1];
  var s12 = useState(false); var sidebarOpen = s12[0]; var setSidebarOpen = s12[1];
  var s13 = useState(null); var viewingHistory = s13[0]; var setViewingHistory = s13[1];

  function handleDatei(e) {
    var f = e.target.files[0];
    if (!f) return;
    setFile(f); setVorherUrl(URL.createObjectURL(f));
    setNachherUrl(null); setMaterials(null); setError(null); setSaved(false);
    setViewingHistory(null);
  }

  function generieren() {
    if (!file) return;
    setViewingHistory(null);
    setLoading(true); setNachherUrl(null); setMaterials(null);
    setError(null); setProgress(0); setSaved(false);
    var timer = setInterval(function() {
      setProgress(function(p) { return p < 85 ? p + 2 : p; });
    }, 600);
    compressImageFile(file).then(function(base64) {
      return fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, style: stil, chatContext: wunsch || null }),
      });
    }).then(function(res) { return res.json(); })
    .then(function(data) {
      clearInterval(timer);
      if (data.error) { setError(data.error); setLoading(false); return; }
      setProgress(100);
      setNachherUrl(data.imageUrl);
      setMaterials(data.materials || null);
      setLoading(false);
    }).catch(function(err) {
      clearInterval(timer); setError(err.message); setLoading(false);
    });
  }

  function handleSaveToPlaner() {
    if (!nachherUrl) return;
    var m = {
      id: Date.now(),
      date: new Date().toLocaleDateString("de-DE"),
      time: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
      titel: STILE_MAKEOVER.find(function(s) { return s.id === stil; })?.label || stil,
      vorherUrl: vorherUrl,
      imgUrl: nachherUrl,
      materials: materials,
      wunsch: wunsch,
    };
    onSaveToPlaner(m);
    setSaved(true);
  }

  function neuesMakeover() {
    setFile(null); setVorherUrl(null); setNachherUrl(null);
    setMaterials(null); setError(null); setSaved(false);
    setWunsch(""); setViewingHistory(null);
  }

  var aktuellesMakeover = viewingHistory || (nachherUrl ? { vorherUrl, imgUrl: nachherUrl, materials, wunsch, titel: stil } : null);

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* Sidebar */}
      {sidebarOpen && (
        <div style={{ width: 220, borderRight: "1px solid " + C.border, background: C.card, overflowY: "auto", flexShrink: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 12px 8px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Meine Makeovers</p>
            <button onClick={function() { setSidebarOpen(false); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.muted }}>x</button>
          </div>
          <button onClick={function() { neuesMakeover(); setSidebarOpen(false); }} style={{
            margin: "8px", padding: "8px 12px", borderRadius: 8,
            background: C.accent, color: "white", border: "none",
            cursor: "pointer", fontSize: 13, fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
          }}>+ Neues Makeover</button>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}>
            {(!savedMakeovers || savedMakeovers.length === 0) ? (
              <p style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: "20px 8px" }}>Noch keine gespeicherten Makeovers</p>
            ) : (
              savedMakeovers.map(function(m) {
                return (
                  <div key={m.id} onClick={function() { setViewingHistory(m); setSidebarOpen(false); }} style={{
                    borderRadius: 8, overflow: "hidden", marginBottom: 8, cursor: "pointer",
                    border: "2px solid " + (viewingHistory && viewingHistory.id === m.id ? C.accent : C.border),
                    background: C.bg,
                  }}>
                    {m.imgUrl && <img src={m.imgUrl} alt="" style={{ width: "100%", height: 70, objectFit: "cover", display: "block" }} />}
                    <div style={{ padding: "6px 8px" }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{m.titel}</p>
                      <p style={{ fontSize: 10, color: C.muted }}>{m.date} {m.time}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 40px" }}>

        {/* Top Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20 }}>KI Makeover</h2>
            {savedMakeovers && savedMakeovers.length > 0 && (
              <p style={{ fontSize: 12, color: C.muted }}>{savedMakeovers.length} gespeichert</p>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {(nachherUrl || viewingHistory) && (
              <button onClick={neuesMakeover} style={{
                padding: "7px 14px", borderRadius: 20, border: "1px solid " + C.border,
                background: C.card, cursor: "pointer", fontSize: 12, fontWeight: 600,
                color: C.text, fontFamily: "'DM Sans', sans-serif",
              }}>+ Neu</button>
            )}
            <button onClick={function() { setSidebarOpen(!sidebarOpen); }} style={{
              padding: "7px 14px", borderRadius: 20,
              background: sidebarOpen ? C.accent : C.card,
              color: sidebarOpen ? "white" : C.text,
              border: "1px solid " + (sidebarOpen ? C.accent : C.border),
              cursor: "pointer", fontSize: 12, fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {savedMakeovers && savedMakeovers.length > 0 ? savedMakeovers.length + " gespeichert" : "Verlauf"}
            </button>
          </div>
        </div>

        {/* Viewing History */}
        {viewingHistory ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 14px", background: "#FFF0E8", borderRadius: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>{viewingHistory.titel}</span>
              <span style={{ fontSize: 12, color: C.muted }}>{viewingHistory.date}</span>
            </div>
            {viewingHistory.vorherUrl && (
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Vorher</p>
                <img src={viewingHistory.vorherUrl} alt="Vorher" style={{ width: "100%", borderRadius: 12, maxHeight: 200, objectFit: "cover" }} />
              </div>
            )}
            <p style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Nachher</p>
            <div style={{ borderRadius: 14, overflow: "hidden", marginBottom: 12, boxShadow: "0 6px 24px rgba(0,0,0,0.1)" }}>
              <img src={viewingHistory.imgUrl} alt="Nachher" style={{ width: "100%", display: "block" }} />
            </div>
            {viewingHistory.materials && (
              <div style={{ background: "#FFF0E8", border: "1px solid #F0C4A0", borderRadius: 12, padding: "14px" }}>
                <p style={{ fontWeight: 700, fontSize: 13, color: C.accent, marginBottom: 8 }}>Verwendete Materialien:</p>
                <div>{renderMaterialien(viewingHistory.materials)}</div>
                <p style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>* Affiliate-Links - fuer dich keine Mehrkosten</p>
              </div>
            )}
          </div>
        ) : (
          /* New Makeover Form */
          <div>
            {/* Wunsch */}
            <div style={{ marginBottom: 16 }}>
              <button onClick={function() { setChatOpen(!chatOpen); }} style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                border: "1px solid " + (wunsch ? C.accent : C.border),
                background: wunsch ? "#FFF0E8" : C.card,
                color: wunsch ? C.accent : C.muted,
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span>{wunsch ? "Wunsch: " + wunsch.slice(0, 30) + (wunsch.length > 30 ? "..." : "") : "Wunsche beschreiben (optional)"}</span>
                <span>{chatOpen ? "Schliessen" : "Bearbeiten"}</span>
              </button>
              {chatOpen && (
                <div style={{ border: "1px solid " + C.border, borderTop: "none", borderRadius: "0 0 10px 10px", padding: "10px 12px", background: C.card }}>
                  <textarea
                    value={wunsch}
                    onChange={function(e) { setWunsch(e.target.value); }}
                    placeholder="z.B. Keine Badewanne, dunkle Fliesen, Walk-In Dusche, Budget 2000 Euro..."
                    rows={3}
                    style={{ width: "100%", border: "1px solid " + C.border, borderRadius: 8, padding: "8px 10px", fontSize: 13, resize: "none", fontFamily: "'DM Sans', sans-serif", background: C.bg }}
                  />
                  <p style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>Die KI beruecksichtigt deine Wuensche beim Generieren</p>
                </div>
              )}
            </div>

            {/* Stil */}
            <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Stil</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
              {STILE_MAKEOVER.map(function(s) {
                return (
                  <button key={s.id} onClick={function() { setStil(s.id); }} style={{
                    padding: "8px 10px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                    border: "2px solid " + (stil === s.id ? C.accent : C.border),
                    background: stil === s.id ? "#FFF0E8" : C.card,
                    color: stil === s.id ? C.accent : C.text,
                    fontSize: 12, fontWeight: stil === s.id ? 600 : 400,
                    fontFamily: "'DM Sans', sans-serif",
                  }}>{s.label}</button>
                );
              })}
            </div>

            {/* Upload */}
            <div onClick={function() { fileRef.current.click(); }} style={{
              border: "2px dashed " + (vorherUrl ? C.accent : C.border),
              borderRadius: 16, overflow: "hidden",
              padding: vorherUrl ? 0 : "32px 20px",
              textAlign: "center", cursor: "pointer",
              background: vorherUrl ? "transparent" : C.card, marginBottom: 12,
            }}>
              {vorherUrl
                ? <img src={vorherUrl} alt="Vorher" style={{ width: "100%", display: "block", maxHeight: 260, objectFit: "cover" }} />
                : <div>
                    <p style={{ fontSize: 36, marginBottom: 8 }}>Foto hochladen</p>
                    <p style={{ fontWeight: 600, fontSize: 15, color: C.text, marginBottom: 4 }}>Tippe hier</p>
                    <p style={{ fontSize: 13, color: C.muted }}>Bad, Kueche, Wohnzimmer...</p>
                  </div>
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleDatei} />

            {vorherUrl && (
              <button onClick={generieren} disabled={loading} style={{
                width: "100%", padding: 15, marginBottom: 12,
                background: loading ? "#DDD" : "linear-gradient(135deg, #C4622D, #A0522D)",
                color: loading ? "#999" : "white", border: "none", borderRadius: 50,
                fontSize: 15, fontWeight: 700, cursor: loading ? "default" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {loading ? "KI generiert Bild..." : "Makeover generieren"}
              </button>
            )}

            {loading && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ height: 5, background: C.border, borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
                  <div style={{ height: "100%", width: progress + "%", background: C.accent, borderRadius: 3, transition: "width 0.6s" }} />
                </div>
                <p style={{ fontSize: 12, color: C.muted, textAlign: "center" }}>
                  {progress < 40 ? "Analysiere Bild..." : progress < 80 ? "KI generiert Makeover..." : "Fast fertig..."}
                </p>
              </div>
            )}

            {error && (
              <div style={{ background: "#FFF5F5", border: "1px solid #F5D0D0", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
                <p style={{ fontSize: 13, color: "#B91C1C", fontWeight: 600 }}>Fehler</p>
                <p style={{ fontSize: 12, color: "#7F1D1D", marginTop: 4 }}>{error}</p>
              </div>
            )}

            {nachherUrl && (
              <div>
                <div style={{ borderRadius: 14, overflow: "hidden", marginBottom: 10, boxShadow: "0 6px 24px rgba(0,0,0,0.1)" }}>
                  <img src={nachherUrl} alt="Nachher" style={{ width: "100%", display: "block" }} />
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <button onClick={function() { setNachherUrl(null); setMaterials(null); generieren(); }} style={{
                    flex: 1, padding: 11, background: C.card, border: "2px solid " + C.border,
                    borderRadius: 50, fontSize: 13, fontWeight: 600, cursor: "pointer", color: C.text,
                    fontFamily: "'DM Sans', sans-serif",
                  }}>Nochmal</button>
                  <a href={nachherUrl} download="makeover.jpg" target="_blank" rel="noreferrer" style={{
                    flex: 1, padding: 11, background: C.accent, borderRadius: 50,
                    fontSize: 13, fontWeight: 600, color: "white",
                    textDecoration: "none", textAlign: "center",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'DM Sans', sans-serif",
                  }}>Bild speichern</a>
                </div>
                {materials && (
                  <div style={{ background: "#FFF0E8", border: "1px solid #F0C4A0", borderRadius: 12, padding: "14px" }}>
                    <p style={{ fontWeight: 700, fontSize: 13, color: C.accent, marginBottom: 8 }}>Verwendete Materialien:</p>
                    <div style={{ marginBottom: 12 }}>{renderMaterialien(materials)}</div>
                    <p style={{ fontSize: 10, color: C.muted, marginBottom: 10 }}>* Affiliate-Links - fuer dich keine Mehrkosten</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={handleSaveToPlaner} style={{
                        flex: 1, padding: "11px", borderRadius: 50,
                        background: saved ? "#4ade80" : "linear-gradient(135deg, #1a1a2e, #2d2d4e)",
                        color: "white", border: "none", cursor: saved ? "default" : "pointer",
                        fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
                      }}>
                        {saved ? "Gespeichert!" : "Speichern"}
                      </button>
                      <button onClick={function() {
                        handleSaveToPlaner();
                      }} style={{
                        flex: 2, padding: "11px", borderRadius: 50,
                        background: saved ? "#4ade80" : C.accent,
                        color: "white", border: "none", cursor: saved ? "default" : "pointer",
                        fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
                      }}>
                        {saved ? "Im Planer gespeichert!" : "Als Projekt in Planer"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


const TABS = [
  { id: "makeover", label: "Makeover", icon: "✨" },
  { id: "chat",     label: "Chat",     icon: "💬" },
  { id: "ideen",    label: "Ideen",    icon: "💡" },
  { id: "rechner",  label: "Rechner",  icon: "🧮" },
  { id: "planer",   label: "Planer",   icon: "📋" },
  { id: "profis",   label: "Profis",   icon: "🔨" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("makeover");
  const [savedMakeovers, setSavedMakeovers] = useState([]);
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      text: "Hey! Ich bin dein RenoPilot Experte.\n\nSchreib mir was du renovieren möchtest:\n\n- Bad renovieren\n- Küche aufwerten\n- Boden verlegen\n- Günstig unter 200 Euro\n- Werkzeug Anfänger\n- Mietwohnung erlaubt\n\nOder lade ein Foto hoch!",
    },
  ]);
  return (
    <>
      <Head>
        <title>RenoPilot – KI Renovierungs-App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="description" content="KI-Renovierungsplaner: Foto hochladen, Makeover-Bilder generieren, Ideen und Anleitungen für dein Zuhause." />
        <style dangerouslySetInnerHTML={{__html: globalCSS}} />
      </Head>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.bg, maxWidth: 600, margin: "0 auto" }}>
        <div style={{ background: C.card, borderBottom: "1px solid " + C.border, padding: "13px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700 }}>
            Reno<span style={{ color: C.accent }}>Pilot</span>
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80" }} />
            <span style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>KI aktiv</span>
          </div>
        </div>

        {/* Vercel Banner removed - now full app */}

        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <div style={{ display: activeTab === "makeover" ? "flex" : "none", height: "100%", overflow: "hidden" }}>
            <MakeoverTab onSaveToPlaner={(m) => setSavedMakeovers(prev => [m, ...prev])} savedMakeovers={savedMakeovers} />
          </div>
          <div style={{ display: activeTab === "chat" ? "flex" : "none", flexDirection: "column", height: "100%" }}>
            <ChatTab onSave={(m) => setSavedMakeovers(prev => [...prev, m])} messages={chatMessages} setMessages={setChatMessages} />
          </div>
          {activeTab === "ideen" && <IdeenTab />}
          {activeTab === "galerie" && <InspirationTab />}
          {activeTab === "rechner" && <RechnerTab />}
          {activeTab === "planer" && <PlanerTab savedMakeovers={savedMakeovers} />}
          {activeTab === "profis" && <HandwerkerTab />}
        </div>

        <div style={{ background: C.card, borderTop: "1px solid " + C.border, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr", flexShrink: 0 }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "8px 2px 12px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                borderTop: "2.5px solid " + (activeTab === tab.id ? C.accent : "transparent"),
                transition: "border-color 0.2s",
              }}
            >
              <span style={{ fontSize: 19 }}>{tab.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: activeTab === tab.id ? C.accent : C.muted, fontFamily: "'DM Sans', sans-serif" }}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
