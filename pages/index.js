import React, { useState, useRef, useEffect } from "react";
import Head from "next/head";

const SYSTEM = `Du bist RenoPilot, ein freundlicher DIY-Renovierungsexperte für den deutschsprachigen Markt. Deine Nutzer sind AMATEURE. Erkläre alles einfach, konkret, auf Deutsch, motivierend. Immer mit Produktnamen, deutschen Preisen (OBI/Bauhaus/Hornbach/Amazon/IKEA). Warne bei Elektro-Festinstallation, Asbest und tragenden Wänden immer klar.`;

async function callAPI(messages) {
  const response = await fetch("/api/chat-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json", "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages }),
  });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch(e) { throw new Error("HTTP " + response.status + ": " + raw.substring(0,150)); }
  if (!response.ok || data.error || data.type === "error") throw new Error("HTTP " + response.status + " | " + raw.substring(0,200));
  return data.content?.[0]?.text || "(leer)";
}

const C = {
  bg: "#F8F5F0", card: "#FFFFFF", border: "#EDE8DF",
  accent: "#C4622D", accentBg: "#FFF0E8", text: "#1A1A1A",
  muted: "#888888", green: "#3A7A56", greenBg: "#EDF5F1",
  tag: "#F0EDE8",
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
  return <div style={{ width: sz, height: sz, border: "3px solid " + C.border, borderTop: "3px solid " + C.accent, borderRadius: "50%", flexShrink: 0, animation: "spin 0.85s linear infinite" }} />;
}

function Pill({ children, bg, color }) {
  return <span style={{ background: bg || C.accentBg, color: color || C.accent, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>{children}</span>;
}

// ─── AFFILIATE ────────────────────────────────────────────────────────────────
const AFFILIATE_TAG = "renopilot-21";
function amazonLink(search) {
  return "https://www.amazon.de/s?k=" + encodeURIComponent(search) + "&tag=" + AFFILIATE_TAG;
}

// ─── ANLEITUNGEN DATEN (16 Stück) ────────────────────────────────────────────
const ANLEITUNGEN = [
  { id:"streichen", emoji:"🖌️", titel:"Wände streichen", schwierigkeit:"Leicht", zeit:"1–2 Tage", kosten:"30–80€",
    img:"https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=120&q=80",
    werkzeug:["Teleskopstange","Lammfellrolle 12–18mm","Flachpinsel 5cm","Abklebeband Tesa Precision","Abdeckfolie"],
    schritte:["Möbel raus / abdecken, Steckdosen abkleben","Risse spachteln, schleifen, Staub absaugen","Abkleben mit Wasserwaage – Band fingerspitzenartig andrücken","Farbton auf Pappe testen – Tageslicht UND Kunstlicht!","Erste Schicht mit Rolle gleichmäßig auftragen","Min. 4h trocknen, dann zweite Schicht","Dispersionsfarbe: Band nach Trocknen abziehen. Latexfarbe: Band NASS abziehen!","Anschlüsse (Decke, Fenster) mit Pinsel nacharbeiten"],
    tipp:"Lammfellrolle 12–18mm = beste Oberfläche ohne Flusen.",
    fehler:"Zu wenig abkleben, falscher Abziehmodus, zu dicke Schichten.",
    youtube:"https://www.youtube.com/results?search_query=wände+streichen+profi+anleitung",
    amazon:amazonLink("lammfellrolle teleskopstange set") },
  { id:"spachteln", emoji:"🔧", titel:"Wände spachteln", schwierigkeit:"Mittel", zeit:"2–3 Tage", kosten:"40–120€",
    img:"https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=120&q=80",
    werkzeug:["Glättekelle 40cm","Rakel","Schleifgitter 120er","Glasflies","Pulverspachtel","Fertigspachtel"],
    schritte:["Q1 – Fugen: Pulverspachtel einpressen, Fugendeckstreifen einlegen","Q2 – Übergänge: Fertigspachtel dünn mit Kelle ziehen","Q3 – Abporen: dünner Abrieb über die gesamte Fläche","Glasflies empfohlen: verhindert Rissbildung","Nach jeder Schicht nass mit Rakel überziehen","Schleifen nur Q2/Q3 mit Gitter auf Brett","Vor Streichen: Tiefengrund dünn auftragen"],
    tipp:"Pulverspachtel für Q1 (stabiler), Fertigspachtel für Q2/Q3 (besser schleifbar).",
    fehler:"Q1 und Q2 verwechseln, zu dick auftragen, nicht schleifen.",
    youtube:"https://www.youtube.com/results?search_query=wand+spachteln+anleitung+q1+q2",
    amazon:amazonLink("glättekelle fertigspachtel set") },
  { id:"fliesen", emoji:"⬛", titel:"Fliesen legen", schwierigkeit:"Mittel", zeit:"2–4 Tage", kosten:"100–400€",
    img:"https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=120&q=80",
    werkzeug:["Zahnkelle 8mm","Nivelliersystem","Fliesenschneider","Fugenmasse","Gummihammer"],
    schritte:["Raumbreite ÷ Fliesenbreite – letzter Streifen mind. ¾ Breite","Mitte des Raums als Startpunkt","Untergrund: eben, trocken, tragfähig","Doppelklebung: Kleber auf Boden UND Fliese","Zahnkelle 8mm gleichmäßig aufziehen","1/3-Verband verlegen","Nivelliersystem bei großen Formaten","24h trocknen, dann fugen"],
    tipp:"Große Formate (60×60+) immer Doppelklebung + Nivelliersystem.",
    fehler:"Untergrund nicht prüfen, Doppelklebung vergessen.",
    youtube:"https://www.youtube.com/results?search_query=fliesen+legen+anleitung",
    amazon:amazonLink("fliesen nivelliersystem zahnkelle") },
  { id:"bad", emoji:"🚿", titel:"Bad ohne Abriss renovieren", schwierigkeit:"Mittel", zeit:"3–5 Tage", kosten:"200–800€",
    img:"https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=120&q=80",
    werkzeug:["Cuttermesser","Anlauger","Silikon+Pistole","Abdichtband","SMP-Klebstoff"],
    schritte:["Klopftest: hohle Fliesen markieren (>20% = Abriss nötig)","Altes Silikon komplett raus + Untergrund entfetten","Abdichtung: Wanne, Dusche bis 2m, Boden","SMP-Klebstoff: KEINE Dispersionsgrundierung darunter","Neue Fliesen auf alte legen (Boden +1–2cm)","Silikon mit Finger+Spülmittel glattziehen","Armaturentausch: Wasser ab, Teflonband","Licht, Spiegel, Accessoires"],
    tipp:"Nur Silikon + Oberflächen = 80% Arbeitsersparnis bei gleichem Ergebnis.",
    fehler:"Abdichtung vergessen, Silikon auf Fett, falscher Kleber.",
    youtube:"https://www.youtube.com/results?search_query=bad+renovieren+ohne+abriss",
    amazon:amazonLink("bad renovierung silikon abdichtband set") },
  { id:"laminat", emoji:"🪵", titel:"Laminat verlegen", schwierigkeit:"Leicht", zeit:"1 Tag", kosten:"15–50€/m²",
    img:"https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=120&q=80",
    werkzeug:["Stichsäge","Zugeisen","Trittschalldämmung","Abstandshalter 10mm","Gummihammer"],
    schritte:["Untergrund: eben (max. 3mm/2m), trocken","Trittschalldämmung vollflächig verlegen","48h Laminat akklimatisieren – Pflicht!","Abstandshalter 10mm an alle Wände","Nut zur Wand, erste Reihe ausrichten","Jede Reihe mind. 40cm versetzt","Letzte Reihe messen, schneiden, einziehen","Sockelleisten an Wand schrauben (NICHT ans Laminat)"],
    tipp:"48h akklimatisieren verhindert, dass sich der Boden nach Verlegen wölbt.",
    fehler:"Dehnungsfuge vergessen, keine Folie auf Beton.",
    youtube:"https://www.youtube.com/results?search_query=laminat+verlegen+anleitung",
    amazon:amazonLink("laminat verlegewerkzeug trittschalldämmung") },
  { id:"wandpaneele", emoji:"📐", titel:"Wandpaneele / Fluted Panels", schwierigkeit:"Leicht", zeit:"4–8 Stunden", kosten:"50–200€",
    img:"https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=120&q=80",
    werkzeug:["Bohrschrauber","Stichsäge","SPC-Kleber","Wasserwaage","Abstandshalter"],
    schritte:["Wand: gerade, trocken, tapetenfrei","Paneele 24h akklimatisieren","Erstes Panel mit Wasserwaage ausrichten","Kleber: S-Muster, mind. 5cm vom Rand","Panel andrücken, 2 Min. halten","Stöße versetzen wie Mauerwerk","Steckdosen: Pappe-Schablone, dann Stichsäge","Abschluss mit Profil oder Anstrich"],
    tipp:"Fluted Panels hinter Bett oder Sofa – meistgesuchter Look 2025.",
    fehler:"Erstes Panel nicht ausrichten, Lösungsmittel-Kleber auf Kunststoff.",
    youtube:"https://www.youtube.com/results?search_query=wandpaneele+fluted+panel",
    amazon:amazonLink("wandpaneele fluted panel MDF") },
  { id:"led", emoji:"💡", titel:"LED-Beleuchtung einbauen", schwierigkeit:"Leicht", zeit:"2–4 Stunden", kosten:"30–150€",
    img:"https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=120&q=80",
    werkzeug:["WAGO-Klemmen","Seitenschneider","Spannungsprüfer","LED-Streifen 24V","Dimmer"],
    schritte:["Sicherung raus! Spannungsprüfer nutzen","24V LED-Streifen wählen","WAGO statt Lüsterklemmen","Untergrund entfetten, Ecken mit Verbinder","Streifen kleben, andrücken","Trailing-Edge-Dimmer einbauen","Trafo: min. 20% Leistungsreserve","Test vor dem Abdecken"],
    tipp:"Indirekte LED in Stuckkehle wirkt besser als direkte Spots.",
    fehler:"Zu schwacher Trafo, Streifen knicken, falscher Dimmer.",
    youtube:"https://www.youtube.com/results?search_query=led+streifen+einbauen+anleitung",
    amazon:amazonLink("led streifen 24v wago dimmer set") },
  { id:"silikon", emoji:"🔲", titel:"Silikon erneuern", schwierigkeit:"Leicht", zeit:"2–3 Stunden", kosten:"10–25€",
    img:"https://images.unsplash.com/photo-1484154218962-a197022b5858?w=120&q=80",
    werkzeug:["Silikonentferner","Cuttermesser","Sanitär-Silikon (Soudal)","Silikonpistole","Spülmittel"],
    schritte:["Altes Silikon mit Cuttermesser raus","Reste mit Entferner lösen (15 Min.)","Untergrund mit Isopropanol entfetten","Malerband beidseitig abkleben","Silikon in einem Zug auftragen","Finger mit Spülmittel glattziehen","Band SOFORT (nass) abziehen","24h nicht nass"],
    tipp:"Badewanne vor Abdichten mit Wasser füllen – hält bei Belastung besser.",
    fehler:"Band zu spät, fettig, kein Pilzhemmer.",
    youtube:"https://www.youtube.com/results?search_query=silikon+erneuern+bad+anleitung",
    amazon:amazonLink("soudal sanitär silikon pilzhemmend") },
  { id:"tapezieren", emoji:"🖼️", titel:"Tapete entfernen & tapezieren", schwierigkeit:"Leicht", zeit:"1–2 Tage", kosten:"20–80€",
    img:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&q=80",
    werkzeug:["Tapeziertisch","Tapezierbürste","Tapezierpaste","Cuttermesser","Wasserwalze"],
    schritte:["Alte Tapete einweichen: Wasser + Spülmittel, 15 Min. warten","Tapete in langen Streifen von oben abziehen","Kleisterreste nass abwischen, trocknen lassen","Neue Tapete messen: Raumhöhe + 5cm Zugabe","Kleister anrühren, auf Tapete auftragen","Tapete einschlagen, 5 Min. einweichen","Von oben ansetzen, Luftblasen rausstreichen","Überschuss mit Cuttermesser abschneiden"],
    tipp:"Immer in Richtung des Fensterlichts tapezieren – Stöße werden unsichtbar.",
    fehler:"Zu kurze Einweichzeit, Luftblasen nicht rausstreichen, falscher Kleister.",
    youtube:"https://www.youtube.com/results?search_query=tapete+entfernen+tapezieren+anleitung",
    amazon:amazonLink("tapezierpaste tapezierbürste set") },
  { id:"fugenreinigen", emoji:"🧹", titel:"Fugen reinigen & auffrischen", schwierigkeit:"Leicht", zeit:"2–4 Stunden", kosten:"15–40€",
    img:"https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=120&q=80",
    werkzeug:["Fugenreiniger","Fugenbürste","Dampfreiniger (optional)","Fugenstift weiß","Schleifklotz"],
    schritte:["Fugenreiniger auftragen, 10–15 Min. einwirken","Mit Fugenbürste kräftig schrubben","Dampfreiniger für hartnäckige Stellen","Gründlich abspülen, trocknen lassen","Wenn grau/gelblich: Fugenstift auftragen","Bei komplett verfärbt: ausschleifen + neu verfugen","Fugenschutz-Spray als Abschluss"],
    tipp:"Dampfreiniger leihen statt kaufen – effektivstes Werkzeug für einmalige Nutzung.",
    fehler:"Chlorhaltige Reiniger auf farbigen Fliesen, Fugen nicht vollständig trocknen.",
    youtube:"https://www.youtube.com/results?search_query=fugen+reinigen+auffrischen+anleitung",
    amazon:amazonLink("fugenreiniger fugenstift weiß set") },
  { id:"kueche-fronten", emoji:"🍳", titel:"Küchenfronten austauschen", schwierigkeit:"Leicht", zeit:"1 Tag", kosten:"200–800€",
    img:"https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=120&q=80",
    werkzeug:["Akkuschrauber","Kreuzschlitzschrauber","Wasserwaage","Maßband","Scharnier-Einstellwerkzeug"],
    schritte:["Alte Fronten abschrauben: Scharniere lösen","Scharniere auf neue Fronten – gleiche Position messen","Neue Front einhängen, noch nicht festschrauben","Spaltmaß prüfen: 2–3mm gleichmäßig rundum","Scharniere in 3 Richtungen justieren","Erst wenn alles passt: Schrauben fest","Griffe montieren: Schablone, bohren"],
    tipp:"Küchenfronten-Tausch = halbe neue Küche für 10% des Preises.",
    fehler:"Scharniere falsch justiert, Schablone für Griffe nicht genutzt.",
    youtube:"https://www.youtube.com/results?search_query=küchenfronten+austauschen+anleitung",
    amazon:amazonLink("küchenfronten scharnier einstellwerkzeug") },
  { id:"trockenbau", emoji:"🔩", titel:"Trockenbauwand bauen", schwierigkeit:"Mittel", zeit:"1–2 Tage", kosten:"80–200€",
    img:"https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=120&q=80",
    werkzeug:["Metallprofil-Schere","Akkuschrauber","Wasserwaage + Lot","Rigipsplatten","Schrauben 3,5×35mm"],
    schritte:["Bodenprofile (UW) mit Lot ausrichten und verschrauben","Deckenprofile parallel befestigen","Ständerprofile (CW) alle 62,5cm einsetzen","Elektro-Leerrohr jetzt einziehen","Erste Lage Rigips verschrauben: alle 25cm","Mineralwolle als Dämmung einlegen","Zweite Seite beplanken","Fugen verspachteln: Fugenband + Q1/Q2"],
    tipp:"CW-Profile alle 62,5cm = perfekter Raster für 125cm-Platten.",
    fehler:"Ständer falsch messen, keine Dämmung, Schrauben zu tief.",
    youtube:"https://www.youtube.com/results?search_query=trockenbauwand+bauen+anleitung",
    amazon:amazonLink("rigips ständerwerk CD UW profil set") },
  { id:"parkett-schleifen", emoji:"🪵", titel:"Parkett schleifen & ölen", schwierigkeit:"Mittel", zeit:"2–3 Tage", kosten:"80–300€",
    img:"https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=120&q=80",
    werkzeug:["Parkettschleifer (leihen!)","Deltaschleifer für Ecken","Schleifpapier 40/80/120er","Naturöl oder Versiegelung","Parkettrolle"],
    schritte:["Raum leeren, alle Nägel versenken","Erste Runde: grobes 40er diagonal","Zweite Runde: 80er entlang Maserung","Dritte Runde: 120er Feinschliff","Ecken mit Deltaschleifer nacharbeiten","Saugen + feucht wischen, 2h trocknen","Öl dünn auftragen, in Maserungsrichtung","Nach 12h zweite Ölschicht"],
    tipp:"Parkettschleifer im Baumarkt leihen – 2 Tage reichen. Schutzmaske Pflicht!",
    fehler:"Nägel nicht versenken, zu dicke Ölschicht, Ecken vergessen.",
    youtube:"https://www.youtube.com/results?search_query=parkett+abschleifen+ölen+anleitung",
    amazon:amazonLink("osmo hartwachsöl 3032 parkett") },
  { id:"fenster-abdichten", emoji:"🪟", titel:"Fenster abdichten", schwierigkeit:"Leicht", zeit:"2–4 Stunden", kosten:"20–60€",
    img:"https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=120&q=80",
    werkzeug:["Dichtungsband selbstklebend","Acryl-Dichtstoff","Silikonpistole","Cuttermesser","Isopropanol"],
    schritte:["Alte Dichtungen prüfen: eindrücken – federt? Wenn nicht: erneuern","Alte Gummidichtung aus Nut ziehen","Neue Moosgummi-Dichtung einlegen","Außenfuge prüfen: Acryl gerissen?","Alte Außenfuge raus, Untergrund säubern","Neues Acryl, glatt abziehen, nach 2h übermalen","Innenfuge: Kompriband einlegen"],
    tipp:"Fensterdichtungen alle 10–15 Jahre erneuern. Kosten 5€, sparen 15% Heizenergie.",
    fehler:"Falsches Dichtungsmaß, Acryl auf fettigem Untergrund.",
    youtube:"https://www.youtube.com/results?search_query=fenster+abdichten+dämmen+anleitung",
    amazon:amazonLink("fensterdichtung moosgummi selbstklebend") },
  { id:"duschkabine", emoji:"🚿", titel:"Duschkabine einbauen", schwierigkeit:"Mittel", zeit:"1 Tag", kosten:"150–600€",
    img:"https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=120&q=80",
    werkzeug:["Wasserwaage","Akkuschrauber","Dübel + Schrauben","Sanitär-Silikon","Metallsäge"],
    schritte:["Teile laut Anleitung sortieren","Duschwanne einbauen: Füße bis waagerecht justieren","Ablauf anschließen, auf Dichtigkeit testen","Wandprofil senkrecht anzeichnen, dübeln","Glaselemente einhängen","Alle Verbindungen mit Sanitär-Silikon abdichten","Türen einhängen, Mechanismus prüfen","24h aushärten, dann Wassertest"],
    tipp:"Duschwanne IMMER mit Wasser füllen bevor du abdichtest.",
    fehler:"Wanne nicht waagerecht, Ablauf nicht getestet, Silikon auf nasser Fläche.",
    youtube:"https://www.youtube.com/results?search_query=duschkabine+einbauen+anleitung",
    amazon:amazonLink("duschkabine dichtband sanitär silikon") },
  { id:"aussenputz", emoji:"🧱", titel:"Risse im Außenputz reparieren", schwierigkeit:"Mittel", zeit:"1 Tag", kosten:"30–100€",
    img:"https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=120&q=80",
    werkzeug:["Flex mit Trennscheibe","Putzspachtel","Außenputz-Reparaturmasse","Armierungsband","Grundierung"],
    schritte:["Riss aufweiten: V-förmig aufschlitzen (bessere Haftung)","Losen Putz entfernen, abbürsten","Grundierung auftragen, 30 Min. trocknen","Armierungsband in Riss einlegen","Reparaturmasse in zwei Schichten","Erste Schicht eindrücken, 2h trocknen","Zweite Schicht bündig abglätten","Nach 24h Fassadenfarbe auftragen"],
    tipp:"Risse >3mm immer aufschlitzen. Zugekleisterter Riss reißt nach einem Winter wieder auf.",
    fehler:"Riss nicht aufweiten, kein Armierungsband, Farbton nicht anpassen.",
    youtube:"https://www.youtube.com/results?search_query=außenputz+riss+reparieren+anleitung",
    amazon:amazonLink("außenputz reparatur set armierungsband") },
];

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
const ONBOARDING_STEPS = [
  {
    icon: "✨",
    title: "KI-Makeover",
    desc: "Lade ein Foto deines Raumes hoch. Die KI zeigt dir in 20 Sekunden wie er nach der Renovierung aussehen könnte.",
    tab: "makeover",
    color: C.accent,
  },
  {
    icon: "💬",
    title: "Renovierungs-Experte",
    desc: "Frag den KI-Chat alles: Kosten, Materialien, Schritt-für-Schritt Anleitungen. Wie ein erfahrener Handwerker auf Abruf.",
    tab: "chat",
    color: "#2A6DB5",
  },
  {
    icon: "📋",
    title: "16 Profi-Anleitungen",
    desc: "Von Silikon erneuern bis Mikrozement – hake jeden Schritt während der Arbeit ab. Dein Fortschritt wird gespeichert.",
    tab: "anleit",
    color: C.green,
  },
  {
    icon: "🔨",
    title: "Profis in deiner Nähe",
    desc: "Wenn du doch lieber einen Handwerker beauftragen möchtest: Finde geprüfte Betriebe direkt in der App.",
    tab: "profis",
    color: "#8B4513",
  },
];

function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const current = ONBOARDING_STEPS[step];
  const isLast = step === ONBOARDING_STEPS.length - 1;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:1000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div className="fu" style={{ background:C.card, borderRadius:"24px 24px 0 0", padding:"28px 24px 40px", width:"100%", maxWidth:600 }}>
        {/* Progress dots */}
        <div style={{ display:"flex", justifyContent:"center", gap:8, marginBottom:24 }}>
          {ONBOARDING_STEPS.map((_, i) => (
            <div key={i} style={{ width: i===step?24:8, height:8, borderRadius:4, background:i===step?current.color:C.border, transition:"all 0.3s" }} />
          ))}
        </div>

        {/* Icon */}
        <div style={{ width:72, height:72, borderRadius:20, background:current.color+"22", border:`2px solid ${current.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 20px" }}>
          {current.icon}
        </div>

        {/* Content */}
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, textAlign:"center", color:C.text, marginBottom:12 }}>
          {current.title}
        </h2>
        <p style={{ fontSize:15, color:C.text, textAlign:"center", lineHeight:1.7, marginBottom:28, opacity:0.8 }}>
          {current.desc}
        </p>

        {/* Buttons */}
        <div style={{ display:"flex", gap:10 }}>
          {!isLast && (
            <button onClick={onDone} style={{ flex:1, padding:"12px", borderRadius:50, border:`1px solid ${C.border}`, background:"none", color:C.muted, fontSize:14, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
              Überspringen
            </button>
          )}
          <button onClick={() => isLast ? onDone() : setStep(s => s+1)} style={{ flex:2, padding:"14px", borderRadius:50, background:current.color, color:"white", border:"none", fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
            {isLast ? "Jetzt loslegen! 🚀" : "Weiter →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ANLEITUNGEN TAB (mit localStorage) ──────────────────────────────────────
function AnleitungenTab() {
  const [offen, setOffen] = useState(null);
  const [erledigt, setErledigt] = useState({});

  // Fortschritt laden
  useEffect(() => {
    try {
      const saved = localStorage.getItem("renopilot_anleitungen");
      if (saved) setErledigt(JSON.parse(saved));
    } catch {}
  }, []);

  // Fortschritt speichern
  const toggleSchritt = (key) => {
    setErledigt(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem("renopilot_anleitungen", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const totalSchritte = ANLEITUNGEN.reduce((s, a) => s + a.schritte.length, 0);
  const totalErledigt = Object.values(erledigt).filter(Boolean).length;
  const pct = Math.round((totalErledigt / totalSchritte) * 100);
  return (
    <div style={{ overflowY:"auto", height:"100%", padding:"14px 16px" }}>
      {/* Gesamtfortschritt */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 16px", marginBottom:14, boxShadow:"0 1px 6px rgba(0,0,0,.04)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <div>
            <p style={{ fontSize:14, fontWeight:700, color:C.text }}>Dein Fortschritt</p>
            <p style={{ fontSize:11, color:C.muted, marginTop:2 }}>{totalErledigt} von {totalSchritte} Schritten erledigt</p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20, fontWeight:700, color:C.accent }}>{pct}%</span>
            {totalErledigt > 0 && (
              <button onClick={() => {
                setErledigt({});
                try { localStorage.removeItem("renopilot_anleitungen"); } catch {}
              }} style={{ fontSize:11, color:C.muted, background:"none", border:`1px solid ${C.border}`, borderRadius:20, padding:"3px 8px", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                Reset
              </button>
            )}
          </div>
        </div>
        <div style={{ height:8, background:C.border, borderRadius:4, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(to right, ${C.accent}, #E8855A)`, borderRadius:4, transition:"width 0.4s" }} />
        </div>
        {pct === 100 && (
          <p style={{ fontSize:12, color:C.green, fontWeight:600, marginTop:8, textAlign:"center" }}>🎉 Alle Anleitungen abgeschlossen – du bist ein Profi!</p>
        )}
      </div>

      <p style={{ fontSize:12, color:C.muted, marginBottom:14, fontStyle:"italic" }}>
        Tippe auf eine Anleitung → Schritte abhaken während du arbeitest. Fortschritt wird gespeichert.
      </p>
      {ANLEITUNGEN.map(a => {
        const done = a.schritte.filter((_,i) => erledigt[`${a.id}-${i}`]).length;
        const isOpen = offen === a.id;
        return (
          <div key={a.id} style={{ background:C.card, borderRadius:14, marginBottom:10, border:`1px solid ${isOpen ? C.accent+"66" : C.border}`, boxShadow:isOpen?`0 2px 16px ${C.accent}18`:"0 1px 4px rgba(0,0,0,.04)", overflow:"hidden" }}>
            <button onClick={() => setOffen(isOpen ? null : a.id)} style={{ width:"100%", padding:"13px 14px", background:"transparent", border:"none", display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}>
              <div style={{ width:52, height:52, borderRadius:10, overflow:"hidden", flexShrink:0, border:`1px solid ${C.border}` }}>
                <img src={a.img} alt={a.titel} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              </div>
              <div style={{ flex:1, textAlign:"left" }}>
                <div style={{ fontSize:15, color:C.text, fontWeight:600 }}>{a.emoji} {a.titel}</div>
                <div style={{ display:"flex", gap:7, marginTop:5, flexWrap:"wrap" }}>
                  <Pill bg={a.schwierigkeit==="Leicht"?C.greenBg:C.accentBg} color={a.schwierigkeit==="Leicht"?C.green:C.accent}>{a.schwierigkeit}</Pill>
                  <Pill bg="#EBF2FA" color="#2A6DB5">⏱ {a.zeit}</Pill>
                  <Pill bg={C.greenBg} color={C.green}>💶 {a.kosten}</Pill>
                </div>
              </div>
              {done > 0 && <div style={{ fontSize:12, color:C.green, fontWeight:600, flexShrink:0 }}>{done}/{a.schritte.length}</div>}
              <span style={{ fontSize:20, color:C.muted, transform:isOpen?"rotate(90deg)":"none", transition:"transform .2s", flexShrink:0 }}>›</span>
            </button>
            {isOpen && (
              <div style={{ padding:"0 14px 16px" }}>
                <div style={{ background:C.accentBg, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 13px", marginBottom:14 }}>
                  <div style={{ fontSize:11, color:C.accent, fontWeight:600, marginBottom:8, textTransform:"uppercase", letterSpacing:.5 }}>🔨 Werkzeug & Material</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {a.werkzeug.map(w => <span key={w} style={{ fontSize:12, padding:"3px 10px", background:C.card, color:C.text, borderRadius:20, border:`1px solid ${C.border}` }}>{w}</span>)}
                  </div>
                </div>
                <div style={{ fontSize:11, color:C.accent, fontWeight:600, marginBottom:10, textTransform:"uppercase", letterSpacing:.5 }}>📋 Schritt für Schritt</div>
                {a.schritte.map((s, idx) => {
                  const key = `${a.id}-${idx}`, d = erledigt[key];
                  return (
                    <div key={idx} onClick={() => toggleSchritt(`${a.id}-${idx}`)} style={{ display:"flex", gap:10, padding:"9px 11px", borderRadius:9, marginBottom:4, cursor:"pointer", background:d?C.greenBg:C.accentBg+"44", border:`1px solid ${d?C.green+"44":C.border}` }}>
                      <div style={{ width:24, height:24, borderRadius:"50%", flexShrink:0, border:`2px solid ${d?C.green:C.border}`, background:d?C.green:"transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:d?"#fff":C.muted, fontWeight:700 }}>{d?"✓":idx+1}</div>
                      <span style={{ fontSize:13, color:d?C.muted:C.text, textDecoration:d?"line-through":"none", lineHeight:1.5 }}>{s}</span>
                    </div>
                  );
                })}
                <div style={{ background:C.accentBg, border:`1px solid ${C.accent}33`, borderRadius:10, padding:"11px 13px", marginTop:10 }}>
                  <div style={{ fontSize:11, color:C.accent, fontWeight:600, marginBottom:4 }}>💡 Profi-Tipp</div>
                  <p style={{ fontSize:13, color:C.text, lineHeight:1.6 }}>{a.tipp}</p>
                </div>
                <div style={{ background:"#FDEEEC", border:"1px solid #F5D0D0", borderRadius:10, padding:"11px 13px", marginTop:8 }}>
                  <div style={{ fontSize:11, color:"#C0392B", fontWeight:600, marginBottom:4 }}>⚠️ Häufige Fehler</div>
                  <p style={{ fontSize:13, color:C.muted, lineHeight:1.6 }}>{a.fehler}</p>
                </div>
                <div style={{ display:"flex", gap:8, marginTop:10 }}>
                  <a href={a.youtube} target="_blank" rel="noopener noreferrer" style={{ flex:1, textAlign:"center", padding:"9px", borderRadius:9, background:"#FDEEEC", color:"#C0392B", fontSize:12, textDecoration:"none", fontWeight:600, border:"1px solid #F5D0D033" }}>▶ Video anschauen</a>
                  <a href={a.amazon} target="_blank" rel="noopener noreferrer" style={{ flex:1, textAlign:"center", padding:"9px", borderRadius:9, background:C.accentBg, color:C.accent, fontSize:12, textDecoration:"none", fontWeight:600, border:`1px solid ${C.accent}44` }}>🛒 Amazon</a>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


// ─── OFFLINE EXPERTEN-SYSTEM ─────────────────────────────────────────────────
function getRenovierungsAntwort(text, hasImage) {
  const t = text.toLowerCase();
  if (hasImage) return "Tolles Foto! 📸\n\nIch sehe deinen Raum. Hier sind meine ersten Einschätzungen:\n\n🔍 **Was ich empfehle:**\n\n1. **Sofort-Upgrade (unter 50€):** Neue Griffe, frisches Silikon, LED-Leuchte – kleine Änderungen, große Wirkung.\n\n2. **Mittel-Projekt (unter 300€):** Wände streichen, Vinyl-Boden über alte Fliesen, Spiegel tauschen.\n\n3. **Komplett-Upgrade (unter 1.000€):** Mikrozement, neue Armaturen, abgehängte Decke mit LED.\n\n💡 Schreib mir was du ändern möchtest – Boden, Wand, Decke oder Deko – und ich gebe dir einen konkreten Plan!";
  if (t.match(/hallo|hi|hey|guten|servus/)) return "Hey! 👋 Schön dass du da bist!\n\nIch bin dein RenoPilot – dein DIY-Experte für Renovierungen.\n\n**Was kann ich für dich tun?**\n\n🚿 Bad renovieren\n🍳 Küche aufwerten\n🛋️ Wohnzimmer gestalten\n🛏️ Schlafzimmer umgestalten\n🌿 Terrasse/Balkon\n\nLade ein Foto hoch oder schreib mir welchen Raum du renovieren möchtest!";
  if (t.match(/silikon|fuge|schimmel/)) return "Silikon erneuern – einer der günstigsten und wirkungsvollsten Upgrades! 🛠️\n\n**Was du brauchst:**\n• Bad-Silikon mit Schimmelschutz: Soudal oder Ottoseal (ca. 8€)\n• Silikon-Entferner (ca. 5€)\n• Cutter-Messer\n• Fugenglätter oder feuchter Finger\n\n**Schritt für Schritt:**\n1. Altes Silikon mit Cutter einschneiden\n2. Silikon-Entferner auftragen, 30 Min warten\n3. Reste abziehen, Fläche entfetten\n4. Abklebeband links und rechts\n5. Silikon gleichmäßig auftragen\n6. Mit feuchtem Finger glattziehen\n7. Band sofort abziehen, 24h trocknen lassen\n\n⏱️ Zeit: 2 Stunden\n💰 Kosten: ca. 15€\n⭐ Schwierigkeit: Anfänger";
  if (t.match(/vinyl|laminat|boden verlegen|klick/)) return "Boden verlegen – machst du selbst! 💪\n\n**SPC-Vinyl (für Bad & Küche):**\n• 100% wasserfest, über alte Fliesen möglich\n• Kosten: 15–25€/m² bei OBI/Bauhaus\n• Kein Kleber nötig – Klicksystem\n\n**Schritt für Schritt:**\n1. Untergrund prüfen – max. 3mm Unebenheit\n2. Schaumunterlage auslegen\n3. Erste Reihe mit 10mm Abstand zur Wand\n4. Reihe für Reihe einrasten\n5. Letzte Reihe zuschneiden\n6. Sockelleisten kleben\n\n⏱️ Zeit: 1 Tag für 20m²\n💰 Kosten: ab 15€/m²\n⭐ Schwierigkeit: Anfänger";
  if (t.match(/bad|badezimmer|dusche|wc|toilette|waschtisch/)) return "Badezimmer renovieren – hier ist mein Plan! 🚿\n\n**Budget 50–150€ (Sofort-Upgrades):**\n• Silikon komplett erneuern (Soudal Bad-Silikon)\n• LED-Spiegel mit IP44: Emke Amazon ab 80€\n• Mattschwarz-Accessoires Set: ~40€\n\n**Budget 150–500€:**\n• Armaturen auf Mattschwarz tauschen\n• SPC-Vinyl über alte Fliesen legen\n• Stauraum über WC montieren\n\n**Budget 500–2.000€:**\n• Mikrozement über Fliesen (kein Stemmen!)\n• Walk-In Dusche einbauen\n• Waschtisch komplett tauschen\n\n⚠️ Wichtig: Immer Bad-Silikon mit Schimmelschutz! IP44 bei Lampen Pflicht!";
  if (t.match(/küche|kueche|fronten|schrank|arbeitsplatte|griffe/)) return "Küche aufwerten – top Investition! 🍳\n\n🔩 **Griffe tauschen (30 min, 30–80€)**\n→ 128mm Bügel Mattschwarz auf Amazon.\n\n🎨 **Fronten folieren (1–2 Tage, 80–200€)**\n→ Klebefolie Holz/Beton/Marmor-Optik. Reversibel für Mietwohnung!\n→ Wichtig: erst entfetten mit Aceton!\n\n🖌️ **Fronten lackieren (2–3 Tage, 100–300€)**\n→ Schleifen (P120) → Haftgrund → 3× Seidenmatt-Lack\n→ RAL 7044 Seidengrau oder RAL 5011 Navy = Trend 2025\n\n💡 LED-Strip unter Oberschränken: 20–60€, 2700K warm!";
  if (t.match(/wohnzimmer|wand streichen|akzent|farbe|streichen/)) return "Wand streichen – einfachstes Upgrade mit größter Wirkung! 🎨\n\n**Die Akzentwand:**\nNur EINE Wand dunkel streichen → sofort anderer Raum!\n\n**Aktuelle Trendfarben 2025:**\n• Dunkelgrün (RAL 6009)\n• Navy Blau (RAL 5011)\n• Anthrazit (RAL 7016)\n• Terrakotta (RAL 3012)\n\n**Schritt für Schritt:**\n1. Wand abkleben (Tesa Precision!)\n2. Testfeld 30×30cm malen – trocknen lassen!\n3. Tiefengrund auftragen\n4. 2 Schichten Farbe (Rolle 18cm)\n5. Klebeband feucht abziehen\n\n💰 Kosten: 30–60€ · ⏱️ Zeit: 1 Tag";
  if (t.match(/licht|lampe|led|beleuchtung|hell|dunkel|atmosphäre/)) return "Beleuchtung – größter Stimmungsmacher! 💡\n\n**Die wichtigste Regel:**\n2700K = warm = Wohnzimmer/Schlafzimmer/Bad\n4000K = neutral = Küche/Arbeitszimmer\n6000K = kalt = NIE im Wohnbereich!\n\n**Günstige Upgrades:**\n• LED-Strips hinter TV: 20–50€\n• LED-Strip unter Küchenschränken: 20–60€\n• Nachttischlampen statt Deckenlampe: 40–120€\n\n**Badezimmer:**\n⚠️ IP44 Pflicht! Immer auf Verpackung prüfen!\n\n💡 Dimmer einbauen: 15–30€ bei OBI – lohnt sich überall!";
  if (t.match(/mietwohnung|miete|vermieter|erlaubt/)) return "Mietwohnung renovieren – was ist erlaubt? 🔑\n\n**Ohne Genehmigung erlaubt:**\n✓ Streichen (beim Auszug zurückstreichen)\n✓ Möbel aufstellen, Regale montieren\n✓ Klebefolie auf Fliesen/Fronten (reversibel!)\n✓ Griffe tauschen (Original aufbewahren!)\n✓ LED-Spiegel (Stecker-Anschluss)\n✓ Klick-Bodenbelag ohne Kleber\n\n**NIE ohne Genehmigung:**\n❌ Elektro-Festinstallation\n❌ Tragende Wände verändern\n❌ Gasleitungen\n\n💡 Alles Original-Material aufbewahren!";
  return "Super Frage! 💪 Als Renovierungs-Experte helfe ich dir gerne.\n\nSchreib mir mehr Details:\n• **Welchen Raum** möchtest du renovieren?\n• **Was stört dich** am meisten?\n• **Wie viel Budget** hast du ungefähr?\n\nOder lade ein Foto hoch – dann sehe ich direkt was möglich ist!";
}

// ─── AFFILIATE Renderer ───────────────────────────────────────────────────────
function AffiliateLink({ text }) {
  const lower = text.toLowerCase();
  let link = null;
  if (lower.match(/fliesen|feinsteinzeug|anthrazit/)) link = amazonLink("Feinsteinzeug Fliesen Anthrazit 80x80");
  else if (lower.match(/walk.in|glaswand|esg/)) link = amazonLink("Walk-In Dusche Glaswand 8mm ESG");
  else if (lower.match(/waschtisch|waschbecken|teak/)) link = amazonLink("Schwebender Waschtisch Holz Wandmontage");
  else if (lower.match(/led.*spiegel|spiegel.*led|emke/)) link = amazonLink("LED Spiegel Bad beleuchtet IP44");
  else if (lower.match(/armatur|mattschwarz.*arm|wasserhahn.*schwarz/)) link = amazonLink("Waschtisch Armatur mattschwarz");
  else if (lower.match(/mikrozement/)) link = amazonLink("Mikrozement Set Boden Wand Versiegelung");
  else if (lower.match(/spc|vinyl.*boden/)) link = amazonLink("SPC Vinyl Boden wasserfest Rigid Core");
  else if (lower.match(/laminat/)) link = amazonLink("Laminat Eiche 8mm Klick Trittschall");
  else if (lower.match(/silikon/)) link = amazonLink("Soudal Bad Silikon Schimmelschutz");
  else if (lower.match(/led.*strip|led.*streifen/)) link = amazonLink("LED Strip 2700K warmweiss 5m dimmbar");
  else if (lower.match(/einbaustrahler/)) link = amazonLink("LED Einbaustrahler GU10 IP44 Set");
  else if (lower.match(/griffe|schrankgriff/)) link = amazonLink("Kuechen Griffe mattschwarz 128mm Set");
  else if (lower.match(/wandfarbe|wandlack/)) link = amazonLink("Wandfarbe Erdtöne seidenmatt");
  else if (lower.match(/paneele|wandpaneel|fluted/)) link = amazonLink("Wandpaneele MDF Holzoptik selbstklebend");
  else if (lower.match(/osmo|hartwachs/)) link = amazonLink("Osmo Hartwachsoel 3032 750ml");
  else if (lower.match(/wpc.*diele|terrassen.*diele/)) link = amazonLink("WPC Dielen Terrasse Holzoptik Clip");
  if (!link) return null;
  return (
    <a href={link} target="_blank" rel="noopener noreferrer" style={{ flexShrink:0, background:"#F0F5EC", color:C.green, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700, textDecoration:"none", whiteSpace:"nowrap", marginLeft:8 }}>
      Amazon →
    </a>
  );
}

function BoldText({ text }) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return <span>{parts.map((part, j) => j % 2 === 1 ? <strong key={j} style={{ color:C.text, fontWeight:700 }}>{part}</strong> : <span key={j}>{part}</span>)}</span>;
}

function renderMaterialien(text) {
  if (!text) return null;
  return text.split("\n").map((line, i) => {
    if (!line.trim()) return <div key={i} style={{ height:6 }} />;
    return (
      <div key={i} style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:6 }}>
        <p style={{ fontSize:13, color:"#555", lineHeight:1.7, flex:1 }}><BoldText text={line} /></p>
        <AffiliateLink text={line} />
      </div>
    );
  });
}

// ─── STILE FÜR MAKEOVER ───────────────────────────────────────────────────────
const STILE_MAKEOVER = [
  { id:"bad-modern",    emoji:"🚿", label:"Bad: Modern & Spa" },
  { id:"bad-warm",      emoji:"🚿", label:"Bad: Hell & Warm" },
  { id:"bad-mikro",     emoji:"🚿", label:"Bad: Mikrozement" },
  { id:"kueche-navy",   emoji:"🍳", label:"Küche: Navy & Holz" },
  { id:"kueche-grau",   emoji:"🍳", label:"Küche: Seidengrau" },
  { id:"kueche-gruen",  emoji:"🍳", label:"Küche: Salbeigrün" },
  { id:"wohn-gruen",    emoji:"🛋️", label:"Wohnzimmer: Grün" },
  { id:"wohn-terra",    emoji:"🛋️", label:"Wohnzimmer: Terrakotta" },
  { id:"schlaf-terra",  emoji:"🛏️", label:"Schlafzimmer: Terrakotta" },
  { id:"schlaf-dunkel", emoji:"🛏️", label:"Schlafzimmer: Dunkel" },
  { id:"terrasse-wpc",  emoji:"🌿", label:"Terrasse: WPC & Lounge" },
];

function compressImageFile(file) {
  return new Promise(function(resolve) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement("canvas");
      var max = 1024, w = img.width, h = img.height;
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

// ─── MAKEOVER TAB (aus altem Chat – vollständig) ──────────────────────────────
function MakeoverTab({ onSaveToPlaner, savedMakeovers, plan, canGenerate, freeUsed, onNeedUpgrade, onGenerated }) {
  var fileRef = useRef();
  const [file, setFile] = useState(null);
  const [vorherUrl, setVorherUrl] = useState(null);
  const [nachherUrl, setNachherUrl] = useState(null);
  const [materials, setMaterials] = useState(null);
  const [stil, setStil] = useState("bad-modern");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [wunsch, setWunsch] = useState("");
  
  const [saved, setSaved] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewingHistory, setViewingHistory] = useState(null);
  const [isObjReplace, setIsObjReplace] = useState(false);
  const [nachherBase64, setNachherBase64] = useState(null); // gespeicherte base64 für Refinement
  const [refining, setRefining] = useState(false);
  const [refinementInput, setRefinementInput] = useState("");
  const [refinementHistory, setRefinementHistory] = useState([]);

  function handleDatei(e) {
    const f = e.target.files[0]; if (!f) return;
    setFile(f); setVorherUrl(URL.createObjectURL(f));
    setNachherUrl(null); setMaterials(null); setError(null); setSaved(false); setViewingHistory(null);
  }

  async function refineMakeover() {
    if (!refinementInput.trim() || !nachherUrl) return;
    const instruction = refinementInput;
    setRefinementInput("");
    setRefining(true);
    setRefinementHistory(prev => [...prev, { url: nachherUrl, instruction }]);

    try {
      const base64 = nachherBase64;
      if (!base64) {
        setError("Bild nicht mehr verfügbar – bitte neu generieren.");
        setRefining(false);
        return;
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, style: stil, chatContext: instruction, plan: plan||"free" }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Server Fehler ${res.status}: ${txt.slice(0, 100)}`);
      }
      const data = await res.json();

      if (data.imageUrl) {
        setNachherUrl(data.imageUrl);
        if (data.materials) setMaterials(data.materials);
        setSaved(false);
        // Base64 direkt vom Server speichern
        setNachherBase64(data.imageBase64 || null);
      } else {
        setError(data.error || "Fehler beim Verfeinern.");
      }
    } catch (err) {
      setError(err.message);
    }
    setRefining(false);
  }

  function generieren() {
    if (!file) return;
    if (!canGenerate) { onNeedUpgrade(); return; }
    setViewingHistory(null); setLoading(true); setNachherUrl(null); setMaterials(null);
    setError(null); setProgress(0); setSaved(false); setNachherBase64(null);
    const timer = setInterval(() => setProgress(p => p < 85 ? p + 2 : p), 600);

    (async () => {
      try {
        const base64 = await compressImageFile(file);
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, style: stil, chatContext: wunsch||null, plan: plan||"free" }),
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Server Fehler ${res.status}: ${txt.slice(0, 100)}`);
        }
        const data = await res.json();
        clearInterval(timer);
        if (data.error) { setError(data.error); setLoading(false); return; }
        setProgress(100);
        setNachherUrl(data.imageUrl);
        setMaterials(data.materials || null);
        setIsObjReplace(!!data.isObjectReplacement);
        setLoading(false);
        if (onGenerated) onGenerated();
        // Base64 direkt vom Server (kein CORS-Problem)
        setNachherBase64(data.imageBase64 || null);
      } catch (err) {
        clearInterval(timer);
        setError(err.message);
        setLoading(false);
      }
    })();
  }

  function handleSaveToPlaner() {
    if (!nachherUrl) return;
    const m = { id:Date.now(), date:new Date().toLocaleDateString("de-DE"), time:new Date().toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}), titel:STILE_MAKEOVER.find(s=>s.id===stil)?.label||stil, vorherUrl, imgUrl:nachherUrl, materials, wunsch };
    onSaveToPlaner(m); setSaved(true);
  }

  function neuesMakeover() {
    setFile(null); setVorherUrl(null); setNachherUrl(null); setMaterials(null);
    setError(null); setSaved(false); setWunsch(""); setViewingHistory(null);
  }

  return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden" }}>
      {/* Sidebar */}
      {sidebarOpen && (
        <div style={{ width:220, borderRight:`1px solid ${C.border}`, background:C.card, overflowY:"auto", flexShrink:0, display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"12px 12px 8px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <p style={{ fontSize:13, fontWeight:700, color:C.text }}>Meine Makeovers</p>
            <button onClick={() => setSidebarOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:16, color:C.muted }}>✕</button>
          </div>
          <button onClick={() => { neuesMakeover(); setSidebarOpen(false); }} style={{ margin:"8px", padding:"8px 12px", borderRadius:8, background:C.accent, color:"white", border:"none", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>+ Neues Makeover</button>
          <div style={{ flex:1, overflowY:"auto", padding:"0 8px 8px" }}>
            {(!savedMakeovers||savedMakeovers.length===0) ? (
              <p style={{ fontSize:12, color:C.muted, textAlign:"center", padding:"20px 8px" }}>Noch keine gespeicherten Makeovers</p>
            ) : savedMakeovers.map(m => (
              <div key={m.id} onClick={() => { setViewingHistory(m); setSidebarOpen(false); }} style={{ borderRadius:8, overflow:"hidden", marginBottom:8, cursor:"pointer", border:`2px solid ${viewingHistory?.id===m.id?C.accent:C.border}`, background:C.bg }}>
                {m.imgUrl && <img src={m.imgUrl} alt="" style={{ width:"100%", height:70, objectFit:"cover", display:"block" }} />}
                <div style={{ padding:"6px 8px" }}>
                  <p style={{ fontSize:11, fontWeight:600, color:C.text }}>{m.titel}</p>
                  <p style={{ fontSize:10, color:C.muted }}>{m.date} {m.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main */}
      <div style={{ flex:1, overflowY:"auto", padding:"14px 16px 40px" }}>
        {/* Top Bar */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20 }}>KI Makeover</h2>
            {savedMakeovers?.length > 0 && <p style={{ fontSize:12, color:C.muted }}>{savedMakeovers.length} gespeichert</p>}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {(nachherUrl||viewingHistory) && <button onClick={neuesMakeover} style={{ padding:"7px 14px", borderRadius:20, border:`1px solid ${C.border}`, background:C.card, cursor:"pointer", fontSize:12, fontWeight:600, color:C.text, fontFamily:"'DM Sans',sans-serif" }}>+ Neu</button>}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ padding:"7px 14px", borderRadius:20, background:sidebarOpen?C.accent:C.card, color:sidebarOpen?"white":C.text, border:`1px solid ${sidebarOpen?C.accent:C.border}`, cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
              {savedMakeovers?.length > 0 ? `${savedMakeovers.length} gespeichert` : "Verlauf"}
            </button>
          </div>
        </div>

        {viewingHistory ? (
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, padding:"10px 14px", background:C.accentBg, borderRadius:10 }}>
              <span style={{ fontSize:13, fontWeight:600, color:C.accent }}>{viewingHistory.titel}</span>
              <span style={{ fontSize:12, color:C.muted }}>{viewingHistory.date}</span>
            </div>
            {viewingHistory.vorherUrl && <div style={{ marginBottom:10 }}><p style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Vorher</p><img src={viewingHistory.vorherUrl} alt="Vorher" style={{ width:"100%", borderRadius:12, maxHeight:200, objectFit:"cover" }} /></div>}
            <p style={{ fontSize:11, fontWeight:700, color:C.accent, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Nachher</p>
            <div style={{ borderRadius:14, overflow:"hidden", marginBottom:12, boxShadow:"0 6px 24px rgba(0,0,0,0.1)" }}>
              <img src={viewingHistory.imgUrl} alt="Nachher" style={{ width:"100%", display:"block" }} />
            </div>
            {viewingHistory.materials && (
              <div style={{ background:C.accentBg, border:`1px solid #F0C4A0`, borderRadius:12, padding:"14px" }}>
                <p style={{ fontWeight:700, fontSize:13, color:C.accent, marginBottom:8 }}>Verwendete Materialien:</p>
                <div>{renderMaterialien(viewingHistory.materials)}</div>
                <p style={{ fontSize:10, color:C.muted, marginTop:6 }}>* Affiliate-Links – für dich keine Mehrkosten</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Beschreibung – immer sichtbar */}
            <div style={{ marginBottom:14 }}>
              <p style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:8 }}>✏️ Was soll sich ändern? <span style={{ fontSize:11, fontWeight:400, color:C.muted }}>(optional)</span></p>
              <textarea
                value={wunsch}
                onChange={e => setWunsch(e.target.value)}
                placeholder="z.B. Keine Badewanne dafür eine Dusche, dunkle Fliesen, moderner Stil, Walk-In Dusche einbauen..."
                rows={3}
                style={{ width:"100%", border:`1.5px solid ${wunsch?C.accent:C.border}`, borderRadius:12, padding:"10px 13px", fontSize:13, resize:"none", fontFamily:"'DM Sans',sans-serif", background:C.bg, lineHeight:1.6 }}
              />
              <p style={{ fontSize:11, color:C.muted, marginTop:5 }}>💡 Je konkreter deine Beschreibung, desto besser das Ergebnis</p>
            </div>

            {/* Upload */}
            <div onClick={() => fileRef.current.click()} style={{ border:`2px dashed ${vorherUrl?C.accent:C.border}`, borderRadius:16, overflow:"hidden", padding:vorherUrl?0:"32px 20px", textAlign:"center", cursor:"pointer", background:vorherUrl?"transparent":C.card, marginBottom:12 }}>
              {vorherUrl ? <img src={vorherUrl} alt="Vorher" style={{ width:"100%", display:"block", maxHeight:260, objectFit:"cover" }} /> :
                <div><p style={{ fontSize:36, marginBottom:8 }}>📷</p><p style={{ fontWeight:600, fontSize:15, color:C.text, marginBottom:4 }}>Foto hochladen</p><p style={{ fontSize:13, color:C.muted }}>Bad, Küche, Wohnzimmer...</p></div>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleDatei} />

            {vorherUrl && (
              <>
                {!canGenerate && (
                  <div style={{ background:"#FFF8E1", border:"1px solid #FFD54F", borderRadius:12, padding:"12px 14px", marginBottom:10, display:"flex", gap:10, alignItems:"center" }}>
                    <span style={{ fontSize:20 }}>🔒</span>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:13, fontWeight:700, color:"#E65100" }}>3 gratis Makeovers aufgebraucht</p>
                      <p style={{ fontSize:12, color:"#7A4100" }}>Upgrade für weitere Generierungen</p>
                    </div>
                    <button onClick={onNeedUpgrade} style={{ padding:"7px 14px", borderRadius:20, background:C.accent, color:"white", border:"none", cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"'DM Sans',sans-serif", flexShrink:0 }}>
                      Upgrade →
                    </button>
                  </div>
                )}
                {plan === "pro" && (
                  <div style={{ background:C.greenBg, border:`1px solid ${C.green}33`, borderRadius:10, padding:"6px 12px", marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:12 }}>⭐</span>
                    <p style={{ fontSize:12, color:C.green, fontWeight:600 }}>Pro: Flux Pro Modell aktiv – höhere Bildqualität</p>
                  </div>
                )}
                <button onClick={generieren} disabled={loading || !canGenerate} style={{ width:"100%", padding:15, marginBottom:12, background:loading?"#DDD":!canGenerate?"#DDD":"linear-gradient(135deg, #C4622D, #A0522D)", color:loading||!canGenerate?"#999":"white", border:"none", borderRadius:50, fontSize:15, fontWeight:700, cursor:loading||!canGenerate?"default":"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                  {loading ? "KI generiert Bild..." : !canGenerate ? "🔒 Upgrade erforderlich" : "✨ Makeover generieren"}
                </button>
              </>
            )}

            {loading && (
              <div style={{ marginBottom:14 }}>
                <div style={{ height:5, background:C.border, borderRadius:3, overflow:"hidden", marginBottom:6 }}>
                  <div style={{ height:"100%", width:`${progress}%`, background:C.accent, borderRadius:3, transition:"width 0.6s" }} />
                </div>
                <p style={{ fontSize:12, color:C.muted, textAlign:"center" }}>
                  {progress<40?"Analysiere Bild...":progress<80?"KI generiert Makeover...":"Fast fertig..."}
                </p>
              </div>
            )}

            {error && <div style={{ background:"#FFF5F5", border:"1px solid #F5D0D0", borderRadius:12, padding:"12px 14px", marginBottom:14 }}><p style={{ fontSize:13, color:"#B91C1C", fontWeight:600 }}>Fehler</p><p style={{ fontSize:12, color:"#7F1D1D", marginTop:4 }}>{error}</p></div>}

            {nachherUrl && (
              <div>
                {/* Refinement History */}
                {refinementHistory.length > 0 && (
                  <div style={{ marginBottom:10 }}>
                    <p style={{ fontSize:11, color:C.muted, marginBottom:6, fontStyle:"italic" }}>Verlauf der Anpassungen:</p>
                    <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4 }}>
                      {refinementHistory.map((h, i) => (
                        <div key={i} onClick={() => { setNachherUrl(h.url); setSaved(false); }} style={{ flexShrink:0, cursor:"pointer", borderRadius:8, overflow:"hidden", border:`2px solid ${C.border}`, width:70 }}>
                          <img src={h.url} alt="" style={{ width:"100%", height:52, objectFit:"cover", display:"block" }} />
                          <div style={{ padding:"2px 4px", background:C.bg, fontSize:9, color:C.muted, lineHeight:1.3 }}>{i+1}: {h.instruction.slice(0,15)}…</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Generated Image */}
                <div style={{ borderRadius:14, overflow:"hidden", marginBottom:10, boxShadow:"0 6px 24px rgba(0,0,0,0.1)", position:"relative" }}>
                  <img src={nachherUrl} alt="Nachher" style={{ width:"100%", display:"block", opacity:refining?0.5:1, transition:"opacity 0.3s" }} />
                  {refining && (
                    <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10 }}>
                      <LoadingSpinner size={36} />
                      <p style={{ fontSize:13, color:C.text, fontWeight:600, background:"rgba(255,255,255,0.9)", padding:"4px 12px", borderRadius:20 }}>Verfeinere Bild…</p>
                    </div>
                  )}
                </div>

                {/* Hinweis bei Objekt-Austausch */}
                {isObjReplace && (
                  <div style={{ background:"#FFF8E1", border:"1px solid #FFD54F", borderRadius:10, padding:"10px 13px", marginBottom:10, display:"flex", gap:8 }}>
                    <span style={{ fontSize:16, flexShrink:0 }}>💡</span>
                    <div>
                      <p style={{ fontSize:12, fontWeight:700, color:"#E65100", marginBottom:2 }}>Objekt-Austausch ist KI-schwierig</p>
                      <p style={{ fontSize:11, color:"#7A4100", lineHeight:1.5 }}>KI-Bildgeneratoren können Materialien &amp; Farben gut ändern, aber Möbel/Sanitär exakt ersetzen ist schwieriger. Falls das Ergebnis nicht passt: Stil-Änderungen (Farbe, Fliesen, Licht) funktionieren besser. Mehrmals "Nochmal" drücken kann helfen.</p>
                    </div>
                  </div>
                )}

                {/* ── Refinement Chat ── */}
                <div style={{ background:C.accentBg, border:`1px solid ${C.accent}44`, borderRadius:14, padding:"12px 14px", marginBottom:10 }}>
                  <p style={{ fontSize:12, fontWeight:700, color:C.accent, marginBottom:8 }}>✏️ Bild verfeinern – was soll sich noch ändern?</p>
                  <div style={{ display:"flex", gap:8 }}>
                    <input
                      value={refinementInput}
                      onChange={e => setRefinementInput(e.target.value)}
                      onKeyDown={e => { if(e.key==="Enter") refineMakeover(); }}
                      placeholder="z.B. Fliesen dunkler machen, Spiegel hinzufügen…"
                      style={{ flex:1, padding:"9px 13px", borderRadius:10, border:`1px solid ${C.border}`, fontSize:13, fontFamily:"'DM Sans',sans-serif", background:"white" }}
                    />
                    <button onClick={refineMakeover} disabled={refining||!refinementInput.trim()} style={{ padding:"9px 16px", borderRadius:10, background:refining||!refinementInput.trim()?C.border:C.accent, color:"white", border:"none", cursor:"pointer", fontWeight:700, fontSize:14, flexShrink:0 }}>
                      {refining ? <LoadingSpinner size={16} /> : "→"}
                    </button>
                  </div>
                  {/* Quick suggestions */}
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
                    {["Fliesen dunkler", "Licht wärmer", "Farbe heller", "Holz hinzufügen", "Spiegel größer", "Armaturen schwarz"].map(s => (
                      <button key={s} onClick={() => setRefinementInput(s)} style={{ padding:"4px 10px", borderRadius:20, border:`1px solid ${C.accent}44`, background:"white", color:C.accent, fontSize:11, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>{s}</button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                  <button onClick={() => { setNachherUrl(null); setMaterials(null); setRefinementHistory([]); generieren(); }} style={{ flex:1, padding:11, background:C.card, border:`2px solid ${C.border}`, borderRadius:50, fontSize:13, fontWeight:600, cursor:"pointer", color:C.text, fontFamily:"'DM Sans',sans-serif" }}>🔄 Neu</button>
                  <a href={nachherUrl} download="makeover.jpg" target="_blank" rel="noreferrer" style={{ flex:1, padding:11, background:C.accent, borderRadius:50, fontSize:13, fontWeight:600, color:"white", textDecoration:"none", textAlign:"center", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif" }}>💾 Speichern</a>
                </div>

                {materials && (
                  <div style={{ background:C.accentBg, border:"1px solid #F0C4A0", borderRadius:12, padding:"14px" }}>
                    <p style={{ fontWeight:700, fontSize:13, color:C.accent, marginBottom:8 }}>Verwendete Materialien:</p>
                    <div style={{ marginBottom:12 }}>{renderMaterialien(materials)}</div>
                    <p style={{ fontSize:10, color:C.muted, marginBottom:10 }}>* Affiliate-Links – für dich keine Mehrkosten</p>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={handleSaveToPlaner} style={{ flex:1, padding:"11px", borderRadius:50, background:saved?"#4ade80":"linear-gradient(135deg, #1a1a2e, #2d2d4e)", color:"white", border:"none", cursor:saved?"default":"pointer", fontSize:12, fontWeight:700, fontFamily:"'DM Sans',sans-serif" }}>
                        {saved?"Gespeichert!":"Speichern"}
                      </button>
                      <button onClick={handleSaveToPlaner} style={{ flex:2, padding:"11px", borderRadius:50, background:saved?"#4ade80":C.accent, color:"white", border:"none", cursor:saved?"default":"pointer", fontSize:12, fontWeight:700, fontFamily:"'DM Sans',sans-serif" }}>
                        {saved?"Im Planer gespeichert!":"Als Projekt in Planer"}
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

// ─── CHAT TAB ─────────────────────────────────────────────────────────────────
function renderChatText(text) {
  return text.split("\n").map((line, i) => {
    if (!line.trim()) return <div key={i} style={{ height: 5 }} />;
    const parts = [];
    let rest = line, key = 0;
    const pattern = /(\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:\/\/[^)]+)\))/g;
    let last = 0, m;
    pattern.lastIndex = 0;
    while ((m = pattern.exec(rest)) !== null) {
      if (m.index > last) parts.push(<span key={key++}>{rest.slice(last, m.index)}</span>);
      if (m[2]) parts.push(<strong key={key++} style={{ fontWeight: 700 }}>{m[2]}</strong>);
      else if (m[3] && m[4]) parts.push(<a key={key++} href={m[4]} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, textDecoration: "underline", textDecorationStyle: "dotted" }}>{m[3]}</a>);
      last = m.index + m[0].length;
    }
    if (last < rest.length) parts.push(<span key={key++}>{rest.slice(last)}</span>);
    const isBullet = line.startsWith("• ") || line.startsWith("- ");
    if (isBullet) return <div key={i} style={{ display: "flex", gap: 6, marginBottom: 2 }}><span style={{ flexShrink: 0, marginTop: 1 }}>•</span><span>{parts}</span></div>;
    return <div key={i} style={{ marginBottom: 2 }}>{parts}</div>;
  });
}

function ChatTab({ messages, setMessages }) {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [imgFile, setImgFile] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const SUGGESTIONS = [
    "Wie renoviere ich mein Bad günstig?",
    "Welche Wandfarbe für Wohnzimmer 2025?",
    "Wie verlege ich SPC-Vinyl selbst?",
    "Was kostet eine Küchensanierung?",
    "LED-Beleuchtung einbauen – wie?",
    "Fliesen über Fliesen legen möglich?",
    "Mikrozement selbst auftragen?",
    "Küchenfronten lackieren Schritt für Schritt?",
  ];

  async function sendMessage(textOverride, imgOverride, mimeOverride) {
    const text = textOverride ?? inputText;
    const img = imgOverride ?? imgPreview;
    if (!text.trim() && !img) return;

    const userMsg = {
      role: "user",
      text: text.trim() || "Analysiere dieses Bild.",
      img: img || null,
      imgBase64: img || null,
      mimeType: mimeOverride || (imgFile?.type) || "image/jpeg",
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setImgFile(null);
    setImgPreview(null);
    setLoading(true);

    // Build full conversation for API
    const allMsgs = [...messages, userMsg];
    const apiMessages = allMsgs.map(m => ({
      role: m.role,
      content: m.role === "assistant" ? (m.text || "") : (m.text || ""),
      ...(m.imgBase64 && m.imgBase64 !== "[Foto]" ? { imgBase64: m.imgBase64, mimeType: m.mimeType } : {}),
    }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", text: data.reply || "Keine Antwort erhalten." }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: "❌ Verbindungsfehler. Bitte erneut versuchen." }]);
    }
    setLoading(false);
  }

  function onFile(e) {
    const f = e.target.files[0]; if (!f) return;
    setImgFile(f);
    const r = new FileReader();
    r.onload = ev => {
      setImgPreview(ev.target.result);
      // Auto send with the image
      sendMessage("Analysiere dieses Foto meines Raumes bitte.", ev.target.result, f.type);
    };
    r.readAsDataURL(f);
  }

  function clearChat() {
    setMessages([{
      role: "assistant",
      text: "Chat geleert. 👋 Womit kann ich dir helfen?\n\nStell mir eine Frage oder lade ein **Foto** deines Raumes hoch – ich analysiere es sofort!",
    }]);
  }

  const isEmpty = messages.length <= 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: C.bg }}>

      {/* Header */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, background: C.accent, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🔨</div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.text }}>RenoPilot Experte</p>
            <p style={{ fontSize: 11, color: C.green }}>● Online – KI-gestützt</p>
          </div>
        </div>
        <button onClick={clearChat} style={{ fontSize: 12, color: C.muted, background: "none", border: `1px solid ${C.border}`, borderRadius: 20, padding: "4px 10px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
          🗑 Leeren
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>

        {/* Welcome + Suggestions when chat is empty */}
        {isEmpty && (
          <div className="fu" style={{ marginBottom: 20 }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 18px", marginBottom: 14, boxShadow: "0 2px 12px rgba(0,0,0,.04)" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, background: C.accent, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🔨</div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>RenoPilot</p>
                  <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
                    Hey! 👋 Ich bin dein persönlicher Renovierungsexperte – frag mich alles über Bad, Küche, Wohnzimmer, Boden, Licht und mehr.<br /><br />
                    Ich gebe dir <strong>konkrete Antworten</strong> mit Produktnamen, Preisen und Schritt-für-Schritt Anleitungen. Oder lade ein 📷 Foto hoch und ich analysiere deinen Raum sofort!
                  </p>
                </div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 8, fontStyle: "italic" }}>Häufige Fragen:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => sendMessage(s)} style={{ padding: "7px 13px", borderRadius: 20, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textAlign: "left", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.slice(isEmpty ? 0 : 0).map((msg, i) => (
          <div key={i} className="fu" style={{ marginBottom: 16, display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
            {msg.role === "assistant" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                <div style={{ width: 24, height: 24, background: C.accent, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>🔨</div>
                <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>RenoPilot</span>
              </div>
            )}
            {/* Show uploaded image above message */}
            {msg.img && msg.img !== "[Foto]" && (
              <img src={msg.img} alt="" style={{ maxWidth: 240, borderRadius: 12, marginBottom: 6, boxShadow: "0 2px 12px rgba(0,0,0,.1)", border: `2px solid ${C.accent}` }} />
            )}
            {msg.img === "[Foto]" && (
              <div style={{ maxWidth: 240, borderRadius: 12, marginBottom: 6, background: C.tag, border: `1px solid ${C.border}`, padding: "6px 10px", fontSize: 11, color: C.muted }}>📷 Foto gesendet</div>
            )}
            <div style={{
              maxWidth: "90%",
              padding: "11px 15px",
              borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
              background: msg.role === "user" ? C.accent : C.card,
              color: msg.role === "user" ? "#fff" : C.text,
              border: msg.role === "assistant" ? `1px solid ${C.border}` : "none",
              fontSize: 14, lineHeight: 1.65,
              boxShadow: "0 1px 6px rgba(0,0,0,.06)",
            }}>
              {msg.role === "user"
                ? msg.text
                : renderChatText(msg.text)
              }
            </div>
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 16 }}>
            <div style={{ width: 24, height: 24, background: C.accent, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>🔨</div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "4px 18px 18px 18px", padding: "12px 16px", display: "flex", gap: 5, alignItems: "center" }}>
              {[0, 1, 2].map(j => (
                <div key={j} style={{ width: 7, height: 7, borderRadius: "50%", background: C.accent, animation: `blink 1.2s ease ${j * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding:"10px 14px 14px", borderTop:`1px solid ${C.border}`, background:C.card }}>
        <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
          <textarea
            ref={textRef}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Stell eine Frage zur Renovierung…"
            rows={1}
            style={{ flex:1, resize:"none", border:`1.5px solid ${C.border}`, borderRadius:12, padding:"10px 14px", fontSize:14, fontFamily:"'DM Sans', sans-serif", background:C.bg, lineHeight:1.5, minHeight:42, maxHeight:120 }}
            onFocus={e => { e.target.style.borderColor = C.accent; }}
            onBlur={e => { e.target.style.borderColor = C.border; }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !inputText.trim()}
            style={{ width:42, height:42, borderRadius:12, flexShrink:0, background:loading || !inputText.trim() ? C.border : C.accent, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:18 }}
          >
            {loading ? <LoadingSpinner size={18} /> : "→"}
          </button>
        </div>
        <p style={{ fontSize:10, color:C.muted, textAlign:"center", marginTop:6 }}>
          Enter senden · Shift+Enter neue Zeile · Foto-Analyse → 🔍 Inspo Tab
        </p>
      </div>
    </div>
  );
}

// ─── HANDWERKER TAB ───────────────────────────────────────────────────────────
const HANDWERKER_BEISPIELE = [
  { name:"Fliesenleger Meier", branche:"Fliesen & Bad", ort:"München", rating:4.9, reviews:34, tel:"+49 89 123456", beschreibung:"Badsanierungen, Mikrozement, Walk-In Duschen. 20 Jahre Erfahrung.", badge:"Top-Betrieb" },
  { name:"Maler Schmidt & Söhne", branche:"Maler & Lackierer", ort:"Hamburg", rating:4.8, reviews:61, tel:"+49 40 654321", beschreibung:"Innen- und Außenarbeiten, Tapezieren, Spachteln, Fassaden.", badge:"Schnell verfügbar" },
  { name:"Elektro Hoffmann", branche:"Elektriker", ort:"Berlin", rating:5.0, reviews:28, tel:"+49 30 987654", beschreibung:"Smart Home, Unterverteilung, Steckdosen, LED-Einbau.", badge:"Top-Betrieb" },
  { name:"Sanitär Bauer GmbH", branche:"Sanitär & Heizung", ort:"Frankfurt", rating:4.7, reviews:45, tel:"+49 69 111222", beschreibung:"Badsanierung, Heizungsumbau, Wärmepumpen, Boiler.", badge:null },
  { name:"Trockenbau Vogel", branche:"Trockenbau", ort:"Stuttgart", rating:4.8, reviews:19, tel:"+49 711 333444", beschreibung:"Rigips, Abgehängte Decken, Vorbauwände, Dämmung.", badge:"Schnell verfügbar" },
];
const BRANCHEN = ["Alle","Fliesen & Bad","Maler & Lackierer","Elektriker","Sanitär & Heizung","Trockenbau","Schreiner","Bodenleger"];

function HandwerkerTab() {
  const [filter, setFilter] = useState("Alle");
  const [ort, setOrt] = useState("");
  const gefiltert = HANDWERKER_BEISPIELE.filter(h => (filter==="Alle"||h.branche===filter)&&(ort===""||h.ort.toLowerCase().includes(ort.toLowerCase())));
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"14px 16px 12px", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20 }}>🔨 Profis finden</h2>
          <span style={{ background:C.accentBg, color:C.accent, borderRadius:20, padding:"4px 12px", fontSize:11, fontWeight:700 }}>DEMO</span>
        </div>
        <input value={ort} onChange={e => setOrt(e.target.value)} placeholder="📍 Stadt oder PLZ eingeben…" style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:10, padding:"9px 13px", fontSize:14, marginBottom:10, fontFamily:"'DM Sans',sans-serif", background:C.bg }} />
        <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4 }}>
          {BRANCHEN.map(b => <button key={b} onClick={() => setFilter(b)} style={{ padding:"5px 12px", borderRadius:20, border:"none", cursor:"pointer", background:filter===b?C.accent:C.bg, color:filter===b?"white":C.muted, fontSize:12, fontWeight:600, whiteSpace:"nowrap", fontFamily:"'DM Sans',sans-serif", flexShrink:0 }}>{b}</button>)}
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"14px 16px" }}>
        <div style={{ background:"linear-gradient(135deg, #1a1a2e, #2d2d4e)", borderRadius:14, padding:"14px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:28 }}>💼</span>
          <div>
            <p style={{ color:"white", fontWeight:700, fontSize:13, marginBottom:2 }}>Du bist Handwerker?</p>
            <p style={{ color:"rgba(255,255,255,0.7)", fontSize:12 }}>Hier eintragen für nur 39€/Monat – direkt Kunden gewinnen</p>
          </div>
          <span style={{ background:C.accent, color:"white", borderRadius:20, padding:"6px 12px", fontSize:12, fontWeight:700, flexShrink:0, cursor:"pointer" }}>Anfragen →</span>
        </div>
        {gefiltert.length===0 ? (
          <div style={{ textAlign:"center", padding:"40px 20px" }}><p style={{ fontSize:32, marginBottom:12 }}>🔍</p><p style={{ fontSize:15, fontWeight:600, color:C.text, marginBottom:6 }}>Keine Treffer</p><p style={{ fontSize:13, color:C.muted }}>Versuche einen anderen Ort oder Filter</p></div>
        ) : gefiltert.map((h, i) => (
          <div key={i} className="fu" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:"16px", marginBottom:12, animationDelay:`${i*0.06}s` }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                  <p style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:C.text }}>{h.name}</p>
                  {h.badge && <span style={{ background:h.badge==="Top-Betrieb"?C.accentBg:C.greenBg, color:h.badge==="Top-Betrieb"?C.accent:C.green, borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:700 }}>{h.badge==="Top-Betrieb"?"⭐ ":"✅ "}{h.badge}</span>}
                </div>
                <p style={{ fontSize:12, color:C.muted }}>{h.branche} · {h.ort}</p>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <p style={{ fontSize:16, fontWeight:700, color:C.accent }}>★ {h.rating}</p>
                <p style={{ fontSize:11, color:C.muted }}>{h.reviews} Bewertungen</p>
              </div>
            </div>
            <p style={{ fontSize:13, color:"#555", lineHeight:1.6, marginBottom:12 }}>{h.beschreibung}</p>
            <div style={{ display:"flex", gap:8 }}>
              <a href={`tel:${h.tel}`} style={{ flex:1, padding:"9px", borderRadius:50, textAlign:"center", background:C.accent, color:"white", textDecoration:"none", fontSize:13, fontWeight:600 }}>📞 Anrufen</a>
              <button style={{ flex:1, padding:"9px", borderRadius:50, border:`2px solid ${C.border}`, background:C.bg, color:C.text, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>💬 Anfrage senden</button>
            </div>
          </div>
        ))}
        <div style={{ background:C.greenBg, border:"1px solid #C8E6C9", borderRadius:12, padding:"14px 16px", textAlign:"center" }}>
          <p style={{ fontSize:13, color:"#2e7d32", lineHeight:1.6 }}>💡 <strong>Idee:</strong> Handwerker zahlen 39€/Monat für ihren Eintrag.<br />20 Einträge = 780€/Monat passives Einkommen!</p>
        </div>
      </div>
    </div>
  );
}

// ─── EINKAUFSLISTE (aus gespeicherten Makeovers) ──────────────────────────────
function parseMaterials(text) {
  if (!text) return [];
  return text.split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      // Extract name (bold **...**), description, and Amazon link
      const boldMatch = line.match(/\*\*([^*]+)\*\*/);
      const linkMatch = line.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
      const name = boldMatch ? boldMatch[1] : line.replace(/\*\*/g, "").replace(/\[.*?\]\(.*?\)/g, "").replace(/^[🪨🪵💡🚿✨⬛📚🌿🏺🍂🛏️🌙🪑🌳⬜🔵]/u, "").split("–")[0].trim();
      const amazonUrl = linkMatch ? linkMatch[2] : null;
      // Get price from line
      const priceMatch = line.match(/Ca\.\s*([\d–.]+\s*€[^.]*)/);
      const price = priceMatch ? priceMatch[1] : null;
      // Get emoji at start
      const emojiMatch = line.match(/^([🪨🪵💡🚿✨⬛📚🌿🏺🍂🛏️🌙🪑🌳⬜🔵🏛️])/u);
      const emoji = emojiMatch ? emojiMatch[1] : "🛒";
      return { name, amazonUrl, price, emoji, raw: line };
    });
}

function EinkaufsListe({ savedMakeovers }) {
  const [checked, setChecked] = useState({});
  const [openMakeover, setOpenMakeover] = useState(savedMakeovers[0]?.id || null);

  const toggle = (key) => setChecked(prev => ({ ...prev, [key]: !prev[key] }));

  // Count total items & checked across all makeovers
  const allItems = savedMakeovers.flatMap((m, mi) =>
    parseMaterials(m.materials).map((item, ii) => ({ key: `${m.id}-${ii}` }))
  );
  const totalChecked = allItems.filter(i => checked[i.key]).length;
  const total = allItems.length;

  return (
    <div style={{ marginTop:24 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:18 }}>🛒 Einkaufsliste</h3>
        {total > 0 && (
          <span style={{ fontSize:12, color:C.muted, background:C.accentBg, padding:"3px 10px", borderRadius:20 }}>
            {totalChecked}/{total} gekauft
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {total > 0 && (
        <div style={{ height:6, background:C.border, borderRadius:3, overflow:"hidden", marginBottom:16 }}>
          <div style={{ height:"100%", width:`${Math.round((totalChecked/total)*100)}%`, background:`linear-gradient(to right, ${C.accent}, #E8855A)`, borderRadius:3, transition:"width 0.3s" }} />
        </div>
      )}

      {savedMakeovers.map((m, mi) => {
        const items = parseMaterials(m.materials);
        if (items.length === 0) return null;
        const mChecked = items.filter((_, ii) => checked[`${m.id}-${ii}`]).length;
        const isOpen = openMakeover === m.id;

        return (
          <div key={m.id} className="fu" style={{ background:C.card, border:`1px solid ${isOpen ? C.accent+"66" : C.border}`, borderRadius:16, marginBottom:12, overflow:"hidden" }}>
            {/* Makeover Header – klappbar */}
            <button onClick={() => setOpenMakeover(isOpen ? null : m.id)} style={{ width:"100%", padding:"0", background:"transparent", border:"none", cursor:"pointer", textAlign:"left", display:"flex" }}>
              {/* Vorschaubild */}
              <div style={{ width:80, height:72, flexShrink:0, overflow:"hidden" }}>
                <img src={m.imgUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              </div>
              <div style={{ flex:1, padding:"12px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <p style={{ fontFamily:"'Playfair Display',serif", fontSize:14, fontWeight:700, color:C.text, marginBottom:2 }}>{m.titel}</p>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:11, color:C.muted }}>{m.date}</span>
                    <span style={{ fontSize:11, background:mChecked===items.length?C.greenBg:C.accentBg, color:mChecked===items.length?C.green:C.accent, padding:"2px 8px", borderRadius:20, fontWeight:600 }}>
                      {mChecked}/{items.length} {mChecked===items.length?"✓ Alles gekauft":"Produkte"}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize:18, color:C.muted, transform:isOpen?"rotate(90deg)":"none", transition:"transform .2s" }}>›</span>
              </div>
            </button>

            {/* Produkt-Liste */}
            {isOpen && (
              <div className="fu" style={{ borderTop:`1px solid ${C.border}` }}>
                {/* Alle abhaken Button */}
                <div style={{ padding:"8px 14px", background:C.accentBg, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <p style={{ fontSize:12, color:C.accent, fontWeight:600 }}>📋 Einkaufsliste für {m.titel}</p>
                  <button onClick={() => {
                    const allDone = items.every((_, ii) => checked[`${m.id}-${ii}`]);
                    const update = {};
                    items.forEach((_, ii) => { update[`${m.id}-${ii}`] = !allDone; });
                    setChecked(prev => ({ ...prev, ...update }));
                  }} style={{ fontSize:11, color:C.accent, background:"none", border:`1px solid ${C.accent}44`, borderRadius:20, padding:"3px 10px", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                    {items.every((_, ii) => checked[`${m.id}-${ii}`]) ? "Alle abwählen" : "Alle abhaken"}
                  </button>
                </div>

                {items.map((item, ii) => {
                  const key = `${m.id}-${ii}`;
                  const done = checked[key];
                  return (
                    <div key={ii} style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", borderBottom:`1px solid ${C.border}`, background:done?"#F9FDF9":"transparent" }}>
                      {/* Checkbox */}
                      <div onClick={() => toggle(key)} style={{ width:22, height:22, borderRadius:6, flexShrink:0, border:`2px solid ${done?C.green:C.border}`, background:done?C.green:"white", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                        {done && <span style={{ color:"white", fontSize:12, fontWeight:700 }}>✓</span>}
                      </div>

                      {/* Produkt Info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight:600, color:done?C.muted:C.text, textDecoration:done?"line-through":"none", lineHeight:1.4 }}>
                          {item.emoji} {item.name}
                        </p>
                        {item.price && !done && (
                          <p style={{ fontSize:11, color:C.muted, marginTop:2 }}>💶 Ca. {item.price}</p>
                        )}
                      </div>

                      {/* Amazon Link */}
                      {item.amazonUrl && (
                        <a href={item.amazonUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ flexShrink:0, background:done?C.border:C.greenBg, color:done?C.muted:C.green, borderRadius:20, padding:"5px 11px", fontSize:12, textDecoration:"none", fontWeight:700, display:"flex", alignItems:"center", gap:4, opacity:done?0.5:1 }}>
                          🛒 <span>Kaufen</span>
                        </a>
                      )}
                    </div>
                  );
                })}

                {/* Zusammenfassung unten */}
                <div style={{ padding:"10px 14px", background:C.greenBg, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:12, color:C.green, fontWeight:600 }}>
                    {mChecked === items.length ? "🎉 Alle Produkte besorgt!" : `${items.length - mChecked} Produkte noch offen`}
                  </span>
                  {mChecked === items.length && (
                    <span style={{ fontSize:11, color:C.green }}>Jetzt loslegen! 💪</span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── PLANER TAB – komplett neu ────────────────────────────────────────────────
const KOMPLETT_PLAENE = [
  {
    name:"Bad Komplettsanierung", icon:"🚿", dauer:"2–4 Wochen", budget:"3.000–15.000€", desc:"Vom leeren Raum zum Traumbad",
    phasen:[
      { name:"Planung & Vorbereitung", items:["Grundriss aufzeichnen, Maße nehmen","Sanitär-Konzept festlegen (WC, Dusche, Wanne?)","Materialien auswählen: Fliesen, Armaturen, Sanitär","Angebote einholen: Installateur, Fliesenleger","Material bestellen (Lieferzeiten beachten!)"] },
      { name:"Abriss & Entkernung", items:["Wasser & Strom abstellen","Altes Sanitär demontieren (WC, Wanne, Waschbecken)","Fliesen stemmen (Stemmhammer leihen)","Alten Estrich prüfen – ggf. erneuern","Wände auf Schimmel prüfen","Schutt entsorgen (Container bestellen)"] },
      { name:"Rohbau & Installation", items:["Neue Leitungen verlegen (Installateur!)","Elektro: Leerrohr für Spiegel, Steckdosen IP44","Rigips Vorbauwand für Unterputz-Spülung","Gefälleestrich für bodengleiche Dusche (1,5%)","Abdichtung: Dichtband + 2× Dichtschlämme","Trockenzeit abwarten (mind. 48h)"] },
      { name:"Fliesen & Oberflächen", items:["Fliesenkleber C2 anrühren (Mapei Keraflex)","Boden fliesen – von Mitte aus starten","Wände fliesen – Werkskante nach außen","Nivelliersystem bei Großformat verwenden","24h trocknen, dann verfugen","Randfugen: Silikon (Bad-Silikon Soudal S100)"] },
      { name:"Sanitär & Elektro", items:["WC montieren (Vorwandinstallation einstellen)","Waschtisch anschließen (Teflonband!)","Dusche/Wanne anschließen, Dichtigkeitstest","Armaturen montieren","Spiegel aufhängen (IP44 prüfen!)","Licht anschließen (Elektriker)"] },
      { name:"Finishing", items:["Silikon komplett erneuern + glätten","Dichtheit aller Anschlüsse prüfen","Accessoires montieren (Handtuchhalter, Haken)","Alles reinigen","Fotos machen – vorher/nachher!"] },
    ]
  },
  {
    name:"Küche renovieren", icon:"🍳", dauer:"1–2 Wochen", budget:"500–8.000€", desc:"Von neuen Fronten bis zur kompletten Küchenerneuerung",
    phasen:[
      { name:"Planung", items:["Konzept: Nur Fronten oder komplett neu?","Farbkonzept wählen (Testmuster bestellen!)","Arbeitsplatte auswählen","Material bestellen (4 Wochen Lieferzeit!)","Budget aufteilen: Fronten / Platte / Licht / Deko"] },
      { name:"Fronten & Griffe", items:["Alte Fronten abschrauben, beschriften","Fronten schleifen (P120) oder entfetten für Folie","Haftgrund auftragen, trocknen lassen","Farbe auftragen: 3× Seidenmatt-Lack","Neue Griffe montieren (Schablone verwenden!)","Fronten wieder einhängen, Scharniere justieren"] },
      { name:"Arbeitsplatte", items:["Alte Arbeitsplatte demontieren","Neue Arbeitsplatte zuschneiden (Stichsäge)","Schnittkanten SOFORT abdichten","Einbauspüle ausschneiden, einsetzen","Arbeitsplatte verkleben + verschrauben","Silikon Übergang Wand-Arbeitsplatte"] },
      { name:"Licht & Finishing", items:["LED-Strip unter Oberschränken (2700K)","Pendelleuchten über Insel/Tisch montieren","Alle Fugen mit Silikon abschließen","Armaturen auf Dichtigkeit prüfen","Grundreinigung & Einräumen"] },
    ]
  },
  {
    name:"Wohnzimmer transformieren", icon:"🛋️", dauer:"1–3 Tage", budget:"100–2.000€", desc:"Akzentwand, Licht, Boden – der komplette Look",
    phasen:[
      { name:"Planung", items:["Farbkonzept auf Pinterest sammeln","Welche Wand wird Akzentwand?","Bodenbelag: Bleibt er oder wird getauscht?","Lichtkonzept: Deckenlampe raus, Stehlampe + Spots","Budget aufteilen: Farbe / Boden / Möbel / Licht"] },
      { name:"Akzentwand", items:["Möbel von der Wand wegstellen","Tesa Precision abkleben (Decke, Boden, Wände)","Tiefengrund auftragen wenn nötig","2 Schichten Wandfarbe mit Lammfellrolle","Band nass abziehen bei Latexfarbe","Trockenzeit: mind. 4h zwischen Schichten"] },
      { name:"Boden verlegen", items:["Alten Boden prüfen – Unebenheiten ausgleichen","Trittschalldämmung auslegen","10mm Abstandshalter an alle Wände","Vinyl/Laminat Reihe für Reihe einrasten","Sockelleisten kleben (NICHT nageln)"] },
      { name:"Licht & Finishing", items:["LED-Strip hinter TV (2700K)","Cove-Licht an Deckenrand bauen","Stehlampen positionieren","Möbel neu arrangieren","Deko aufstellen, Pflanzen platzieren","Fotos machen!"] },
    ]
  },
  {
    name:"Schlafzimmer upgraden", icon:"🛏️", dauer:"1–2 Tage", budget:"100–1.500€", desc:"Kopfteil, Farbe, Licht – Hotel-Feeling",
    phasen:[
      { name:"Planung", items:["Farbkonzept: Akzentwand welche Farbe?","Kopfteil: DIY oder kaufen?","Licht: Wandleuchten links/rechts vom Bett","Verdunkelungsrollo oder Vorhang planen"] },
      { name:"Akzentwand hinter Bett", items:["Bett wegschieben","Wand abkleben, Tiefengrund","2 Schichten Farbe (Terrakotta, Salbeigrün, Navy)","Band abziehen, trocknen lassen"] },
      { name:"Kopfteil DIY", items:["MDF 18mm auf Maß (OBI schneidet zu)","5cm Schaumstoff RG35 aufkleben","Bouclé-Stoff spannen und tackern","An Wand hängen (verdeckte Schrauben)"] },
      { name:"Licht & Atmosphäre", items:["Wandleuchten beidseitig montieren (2200K)","Verdunkelungsrollo direkt am Fenster","Vorhangstange möglichst hoch montieren","Bettwäsche wechseln (Leinen = Trend 2025)","Deko: 1 große Pflanze, Kerzen, Tablett"] },
    ]
  },
  {
    name:"Terrasse aufwerten", icon:"🌿", dauer:"1–2 Wochenenden", budget:"300–3.000€", desc:"WPC-Boden, Sichtschutz, Lounge",
    phasen:[
      { name:"Planung & Material", items:["Grundfläche ausmessen (Länge × Breite)","Konzept: Lounge, Essbereich, Pflanzen?","WPC-Menge berechnen (+10% Verschnitt)","Unterkonstruktion planen (alle 50cm)","Material bestellen"] },
      { name:"Unterkonstruktion", items:["Alten Belag entfernen","Stelzlager setzen (höhenverstellbar)","2% Gefälle einplanen (Wasserablauf)","Tragebalken verlegen und nivellieren"] },
      { name:"WPC-Dielen verlegen", items:["Erste Reihe mit 5mm Abstand zur Wand","Clips einsetzen – unsichtbare Befestigung","Reihe für Reihe arbeiten","Letzte Reihe zuschneiden","Abschlussprofile montieren"] },
      { name:"Sichtschutz & Möbel", items:["Sichtschutz-Pfosten setzen","Latten oder Bambus anbringen","Solar-Lichterketten aufhängen (2200K)","Lounge-Möbel aufstellen","Pflanzkübel mit Olivenbaum/Lavendel"] },
    ]
  },
];

function PlanerTab({ savedMakeovers }) {
  const [ansicht, setAnsicht] = useState("plaene");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [openPhase, setOpenPhase] = useState(0);
  const [checked, setChecked] = useState({});
  const [eigene, setEigene] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newProjekt, setNewProjekt] = useState({ name:"", icon:"🏠", phasen:[{ name:"Phase 1", items:[""] }] });

  useEffect(() => {
    try {
      const s = localStorage.getItem("renopilot_planer");
      if (s) { const d = JSON.parse(s); setChecked(d.checked||{}); setEigene(d.eigene||[]); }
    } catch {}
  }, []);

  const saveLS = (c, e) => {
    try { localStorage.setItem("renopilot_planer", JSON.stringify({ checked: c||checked, eigene: e||eigene })); } catch {}
  };

  const toggleCheck = (key) => {
    const next = { ...checked, [key]: !checked[key] };
    setChecked(next); saveLS(next, null);
  };

  const planProgress = (plan) => {
    if (!plan) return { done:0, total:0, pct:0 };
    const total = plan.phasen.reduce((s,ph)=>s+ph.items.length, 0);
    const done = plan.phasen.reduce((s,ph,pi)=>s+ph.items.filter((_,ii)=>checked[`${plan.name}-${pi}-${ii}`]).length, 0);
    return { done, total, pct: total ? Math.round((done/total)*100) : 0 };
  };

  const ICONS = ["🏠","🚿","🍳","🌿","🛋️","🛏️","🔨","📦","🏗️","💡","🪟","🔧"];
  const allePlane = [...KOMPLETT_PLAENE, ...eigene];

  // Detailansicht für ausgewählten Plan
  if (selectedPlan) {
    const plan = allePlane.find(p => p.name === selectedPlan);
    if (!plan) { setSelectedPlan(null); return null; }
    const { done, total, pct } = planProgress(plan);
    return (
      <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
        <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"12px 16px", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <button onClick={() => setSelectedPlan(null)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:C.muted }}>←</button>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:16, fontWeight:700 }}>{plan.icon} {plan.name}</p>
            <p style={{ fontSize:11, color:C.muted }}>{done}/{total} Schritte · {pct}% fertig</p>
          </div>
          {pct > 0 && <button onClick={() => { const next={...checked}; plan.phasen.forEach((ph,pi)=>ph.items.forEach((_,ii)=>{delete next[`${plan.name}-${pi}-${ii}`];})); setChecked(next); saveLS(next,null); }} style={{ fontSize:11, color:C.muted, background:"none", border:`1px solid ${C.border}`, borderRadius:20, padding:"3px 8px", cursor:"pointer" }}>Reset</button>}
        </div>
        <div style={{ height:5, background:C.border, flexShrink:0 }}>
          <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(to right, ${C.accent}, #E8855A)`, transition:"width 0.3s" }} />
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"14px 16px" }}>
          <div style={{ background:C.accentBg, borderRadius:12, padding:"12px 14px", marginBottom:14, display:"flex", gap:10 }}>
            <div><p style={{ fontSize:12, color:C.accent, fontWeight:600 }}>⏱ {plan.dauer}</p><p style={{ fontSize:12, color:C.accent }}>💶 {plan.budget}</p></div>
            <p style={{ fontSize:13, color:C.text, flex:1, lineHeight:1.5 }}>{plan.desc}</p>
          </div>
          {pct === 100 && <div style={{ background:C.greenBg, borderRadius:12, padding:"12px", marginBottom:14, textAlign:"center" }}><p style={{ fontSize:16, color:C.green, fontWeight:700 }}>🎉 Projekt abgeschlossen!</p></div>}
          {plan.phasen.map((phase, pi) => {
            const phaseDone = phase.items.filter((_,ii)=>checked[`${plan.name}-${pi}-${ii}`]).length;
            const phComplete = phaseDone === phase.items.length;
            const isOpen = openPhase === pi;
            return (
              <div key={pi} style={{ background:C.card, border:`1px solid ${phComplete?C.green+"44":isOpen?C.accent+"55":C.border}`, borderRadius:14, marginBottom:10, overflow:"hidden" }}>
                <button onClick={()=>setOpenPhase(isOpen?-1:pi)} style={{ width:"100%", padding:"13px 16px", background:phComplete?C.greenBg:"transparent", border:"none", display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", background:phComplete?C.green:phaseDone>0?C.accent:C.border, color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>{phComplete?"✓":pi+1}</div>
                  <div style={{ flex:1, textAlign:"left" }}>
                    <p style={{ fontSize:14, fontWeight:600, color:phComplete?C.green:C.text }}>{phase.name}</p>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:3 }}>
                      <div style={{ flex:1, height:3, background:C.border, borderRadius:2 }}><div style={{ height:"100%", width:`${phase.items.length?(phaseDone/phase.items.length*100):0}%`, background:C.green, borderRadius:2 }} /></div>
                      <span style={{ fontSize:11, color:C.muted }}>{phaseDone}/{phase.items.length}</span>
                    </div>
                  </div>
                  <span style={{ fontSize:18, color:C.muted, transform:isOpen?"rotate(90deg)":"none", transition:"0.2s" }}>›</span>
                </button>
                {isOpen && (
                  <div style={{ borderTop:`1px solid ${C.border}`, padding:"8px 16px 12px" }}>
                    {phase.items.map((item, ii) => {
                      const key=`${plan.name}-${pi}-${ii}`, done=checked[key];
                      return (
                        <div key={ii} onClick={()=>toggleCheck(key)} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"9px 0", borderBottom:ii<phase.items.length-1?`1px solid ${C.border}`:"none", cursor:"pointer" }}>
                          <div style={{ width:22, height:22, borderRadius:6, flexShrink:0, marginTop:1, border:`2px solid ${done?C.green:C.border}`, background:done?C.green:"white", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            {done && <span style={{ color:"white", fontSize:12, fontWeight:700 }}>✓</span>}
                          </div>
                          <p style={{ fontSize:14, color:done?C.muted:C.text, textDecoration:done?"line-through":"none", lineHeight:1.4, flex:1 }}>{item}</p>
                        </div>
                      );
                    })}
                    <button onClick={()=>{ const allDone=phase.items.every((_,ii)=>checked[`${plan.name}-${pi}-${ii}`]); const next={...checked}; phase.items.forEach((_,ii)=>{next[`${plan.name}-${pi}-${ii}`]=!allDone;}); setChecked(next); saveLS(next,null); }} style={{ marginTop:8, fontSize:12, color:C.accent, background:"none", border:`1px solid ${C.accent}44`, borderRadius:20, padding:"4px 12px", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                      {phase.items.every((_,ii)=>checked[`${plan.name}-${pi}-${ii}`])?"Phase abwählen":"Alle abhaken"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {savedMakeovers?.length > 0 && <EinkaufsListe savedMakeovers={savedMakeovers} />}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, background:C.card, flexShrink:0 }}>
        {[["plaene","📋 Projekte"],["eigene","✏️ Eigene"],["einkauf","🛒 Einkauf"]].map(([id,label])=>(
          <button key={id} onClick={()=>setAnsicht(id)} style={{ flex:1, padding:"12px 8px", background:"transparent", border:"none", borderBottom:`2px solid ${ansicht===id?C.accent:"transparent"}`, color:ansicht===id?C.accent:C.muted, fontSize:13, fontWeight:ansicht===id?600:400, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>{label}</button>
        ))}
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"14px 16px" }}>
        {ansicht === "plaene" && (
          <div>
            <p style={{ fontSize:12, color:C.muted, marginBottom:14, fontStyle:"italic" }}>Wähle ein Projekt – alle Schritte sind vorgegeben. Fortschritt wird gespeichert.</p>
            {allePlane.map((plan, i) => {
              const { done, total, pct } = planProgress(plan);
              return (
                <div key={i} onClick={()=>{setSelectedPlan(plan.name);setOpenPhase(0);}} className="fu" style={{ background:C.card, border:`1px solid ${pct>0?C.accent+"55":C.border}`, borderRadius:16, marginBottom:12, padding:"16px", cursor:"pointer" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:10 }}>
                    <span style={{ fontSize:30 }}>{plan.icon}</span>
                    <div style={{ flex:1 }}>
                      <p style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color:C.text }}>{plan.name}</p>
                      <p style={{ fontSize:12, color:C.muted, marginTop:2 }}>{plan.desc}</p>
                      <div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap" }}>
                        {plan.dauer && <span style={{ fontSize:11, background:C.accentBg, color:C.accent, padding:"2px 8px", borderRadius:20 }}>⏱ {plan.dauer}</span>}
                        {plan.budget && <span style={{ fontSize:11, background:C.greenBg, color:C.green, padding:"2px 8px", borderRadius:20 }}>💶 {plan.budget}</span>}
                        <span style={{ fontSize:11, background:C.tag, color:C.muted, padding:"2px 8px", borderRadius:20 }}>{plan.phasen.length} Phasen · {total} Schritte</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ flex:1, height:6, background:C.border, borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${pct}%`, background:pct===100?C.green:`linear-gradient(to right, ${C.accent}, #E8855A)`, borderRadius:3, transition:"width 0.3s" }} />
                    </div>
                    <span style={{ fontSize:12, color:pct===100?C.green:C.muted, fontWeight:pct===100?700:400, flexShrink:0 }}>{pct===100?"✓ Fertig!":pct>0?`${pct}%`:"Starten →"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {ansicht === "eigene" && (
          <div>
            {!creating ? (
              <button onClick={()=>setCreating(true)} style={{ width:"100%", padding:"14px", borderRadius:14, border:`2px dashed ${C.accent}`, background:C.accentBg, color:C.accent, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:14, marginBottom:14 }}>+ Eigenes Projekt erstellen</button>
            ) : (
              <div className="fu" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px", marginBottom:14 }}>
                <p style={{ fontWeight:700, fontSize:16, marginBottom:12 }}>Neues Projekt</p>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
                  {ICONS.map(ic=><button key={ic} onClick={()=>setNewProjekt(p=>({...p,icon:ic}))} style={{ width:36, height:36, borderRadius:10, border:`2px solid ${newProjekt.icon===ic?C.accent:C.border}`, background:newProjekt.icon===ic?C.accentBg:"white", cursor:"pointer", fontSize:18 }}>{ic}</button>)}
                </div>
                <input value={newProjekt.name} onChange={e=>setNewProjekt(p=>({...p,name:e.target.value}))} placeholder="Projektname" style={{ width:"100%", padding:"10px 13px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:14, fontFamily:"'DM Sans',sans-serif", marginBottom:12, background:C.bg }} />
                {newProjekt.phasen.map((phase, pi)=>(
                  <div key={pi} style={{ background:C.accentBg, borderRadius:10, padding:"12px", marginBottom:10 }}>
                    <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                      <input value={phase.name} onChange={e=>setNewProjekt(p=>{const ph=[...p.phasen];ph[pi]={...ph[pi],name:e.target.value};return{...p,phasen:ph};})} placeholder={`Phase ${pi+1} Name`} style={{ flex:1, padding:"7px 10px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:"'DM Sans',sans-serif", background:"white" }} />
                      {pi>0 && <button onClick={()=>setNewProjekt(p=>({...p,phasen:p.phasen.filter((_,x)=>x!==pi)}))} style={{ background:"none", border:"none", color:"#CCC", cursor:"pointer", fontSize:16 }}>✕</button>}
                    </div>
                    {phase.items.map((item, ii)=>(
                      <div key={ii} style={{ display:"flex", gap:6, marginBottom:6 }}>
                        <span style={{ width:20, height:20, background:C.accent, color:"white", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, flexShrink:0, marginTop:6 }}>{ii+1}</span>
                        <input value={item} onChange={e=>setNewProjekt(p=>{const ph=[...p.phasen];ph[pi]={...ph[pi],items:ph[pi].items.map((it,x)=>x===ii?e.target.value:it)};return{...p,phasen:ph};})} placeholder={`Schritt ${ii+1}`} style={{ flex:1, padding:"6px 10px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:"'DM Sans',sans-serif", background:"white" }}
                          onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();setNewProjekt(p=>{const ph=[...p.phasen];ph[pi]={...ph[pi],items:[...ph[pi].items,""]};return{...p,phasen:ph};});}}} />
                        <button onClick={()=>setNewProjekt(p=>{const ph=[...p.phasen];ph[pi]={...ph[pi],items:ph[pi].items.filter((_,x)=>x!==ii)};return{...p,phasen:ph};})} style={{ background:"none", border:"none", color:"#CCC", cursor:"pointer" }}>✕</button>
                      </div>
                    ))}
                    <button onClick={()=>setNewProjekt(p=>{const ph=[...p.phasen];ph[pi]={...ph[pi],items:[...ph[pi].items,""]};return{...p,phasen:ph};})} style={{ fontSize:12, color:C.accent, background:"none", border:"none", cursor:"pointer", padding:"4px 0" }}>+ Schritt</button>
                  </div>
                ))}
                <button onClick={()=>setNewProjekt(p=>({...p,phasen:[...p.phasen,{name:`Phase ${p.phasen.length+1}`,items:[""]}]}))} style={{ width:"100%", padding:"8px", borderRadius:10, border:`1px dashed ${C.border}`, background:"none", color:C.muted, cursor:"pointer", fontSize:13, marginBottom:12, fontFamily:"'DM Sans',sans-serif" }}>+ Phase hinzufügen</button>
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={()=>{
                    if(!newProjekt.name.trim()) return;
                    const proj={...newProjekt,phasen:newProjekt.phasen.map(ph=>({...ph,items:ph.items.filter(i=>i.trim())})).filter(ph=>ph.items.length>0)};
                    if(proj.phasen.length===0) return;
                    const next=[...eigene,proj]; setEigene(next); saveLS(null,next);
                    setCreating(false); setNewProjekt({name:"",icon:"🏠",phasen:[{name:"Phase 1",items:[""]}]});
                    setSelectedPlan(proj.name); setOpenPhase(0); setAnsicht("plaene");
                  }} style={{ flex:2, padding:"12px", borderRadius:50, background:C.accent, color:"white", border:"none", fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Erstellen →</button>
                  <button onClick={()=>setCreating(false)} style={{ flex:1, padding:"12px", borderRadius:50, border:`1px solid ${C.border}`, background:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Abbrechen</button>
                </div>
              </div>
            )}
            <p style={{ fontSize:12, color:C.muted, textAlign:"center", fontStyle:"italic" }}>Enter = nächster Schritt · Phasen gruppieren verwandte Aufgaben</p>
          </div>
        )}
        {ansicht === "einkauf" && (
          savedMakeovers?.length > 0
            ? <EinkaufsListe savedMakeovers={savedMakeovers} />
            : <div style={{ textAlign:"center", padding:"40px 20px" }}>
                <p style={{ fontSize:32, marginBottom:12 }}>🛒</p>
                <p style={{ fontFamily:"'Playfair Display',serif", fontSize:16, marginBottom:8 }}>Noch keine Einkaufsliste</p>
                <p style={{ fontSize:13, color:C.muted, lineHeight:1.6 }}>Generiere einen Makeover und drücke "Als Projekt in Planer" – dann erscheinen hier alle Materialien zum Abhaken.</p>
              </div>
        )}
      </div>
    </div>
  );
}


// ─── INSPO ANALYSE TAB ───────────────────────────────────────────────────────
function InspoTab() {
  const [imgFile, setImgFile] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]); // gespeicherte Analysen
  const [showHistory, setShowHistory] = useState(false);
  const fileRef = useRef();

  // Gespeicherte Analysen laden
  useEffect(() => {
    try {
      const saved = localStorage.getItem("renopilot_inspo");
      if (saved) setHistory(JSON.parse(saved));
    } catch {}
  }, []);

  function saveToHistory(preview, result) {
    const entry = { id: Date.now(), preview, analysis: result, date: new Date().toLocaleDateString("de-DE") };
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, 20); // max 20
      try { localStorage.setItem("renopilot_inspo", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function deleteFromHistory(id) {
    setHistory(prev => {
      const next = prev.filter(h => h.id !== id);
      try { localStorage.setItem("renopilot_inspo", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  async function analyse(file, preview) {
    setLoading(true); setAnalysis(null); setError(null); setShowHistory(false);
    try {
      const compressed = await compressImageFile(file);
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: compressed, mimeType: file.type }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else {
        setAnalysis(data.analysis);
        saveToHistory(preview, data.analysis); // automatisch speichern
      }
    } catch (err) { setError(err.message); }
    setLoading(false);
  }

  function onFile(e) {
    const f = e.target.files[0]; if (!f) return;
    setImgFile(f);
    const r = new FileReader();
    r.onload = ev => { setImgPreview(ev.target.result); analyse(f, ev.target.result); };
    r.readAsDataURL(f);
  }

  const SCHWIERIGKEIT_COLOR = { "Einfach": C.green, "Mittel": C.accent, "Schwierig": "#B91C1C" };

  return (
    <div style={{ overflowY:"auto", height:"100%" }}>
      {/* Header */}
      <div style={{ padding:"16px 16px 12px", borderBottom:`1px solid ${C.border}`, background:C.card }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, marginBottom:4 }}>🔍 Inspo analysieren</h2>
            <p style={{ fontSize:13, color:C.muted, lineHeight:1.5 }}>Foto hochladen – KI erkennt Materialien, Stil und zeigt wie du es nachmachst.</p>
          </div>
          {history.length > 0 && (
            <button onClick={() => setShowHistory(!showHistory)} style={{ flexShrink:0, marginLeft:10, padding:"6px 12px", borderRadius:20, border:`1px solid ${C.border}`, background:showHistory?C.accent:C.card, color:showHistory?"white":C.muted, fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>
              📚 {history.length}
            </button>
          )}
        </div>
      </div>

      {/* History Ansicht */}
      {showHistory && (
        <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.border}`, background:C.bg }}>
          <p style={{ fontSize:12, color:C.muted, marginBottom:10, fontStyle:"italic" }}>Gespeicherte Analysen – tippe zum Wiederherstellen</p>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {history.map(h => (
              <div key={h.id} style={{ display:"flex", gap:10, background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden", cursor:"pointer" }}
                onClick={() => { setImgPreview(h.preview); setAnalysis(h.analysis); setShowHistory(false); }}>
                <img src={h.preview} alt="" style={{ width:64, height:56, objectFit:"cover", flexShrink:0 }} />
                <div style={{ flex:1, padding:"8px 10px" }}>
                  <p style={{ fontSize:13, fontWeight:700, color:C.text }}>{h.analysis?.stil || "Analyse"}</p>
                  <p style={{ fontSize:11, color:C.muted }}>{h.date} · {h.analysis?.budget || ""}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteFromHistory(h.id); }} style={{ background:"none", border:"none", color:"#CCC", cursor:"pointer", padding:"8px", fontSize:16, alignSelf:"center" }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding:"14px 16px" }}>
        {/* Upload Area */}
        <div onClick={() => fileRef.current?.click()} style={{ border:`2px dashed ${imgPreview?C.accent:C.border}`, borderRadius:16, padding: imgPreview?"0":"32px 16px", cursor:"pointer", background:imgPreview?C.card:C.accentBg, marginBottom:14, overflow:"hidden", textAlign: imgPreview?"left":"center", position:"relative" }}>
          {imgPreview ? (
            <div style={{ position:"relative" }}>
              <img src={imgPreview} alt="" style={{ width:"100%", maxHeight:260, objectFit:"cover", display:"block" }} />
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)" }} />
              <div style={{ position:"absolute", bottom:12, left:14, right:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <p style={{ color:"white", fontWeight:700, fontSize:13 }}>📷 Foto hochgeladen</p>
                <button onClick={e => { e.stopPropagation(); setImgFile(null); setImgPreview(null); setAnalysis(null); }} style={{ background:"rgba(255,255,255,0.2)", border:"none", color:"white", borderRadius:20, padding:"4px 10px", fontSize:12, cursor:"pointer" }}>Anderes Foto</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize:40, marginBottom:10 }}>📷</div>
              <p style={{ fontSize:15, fontWeight:700, color:C.accent, marginBottom:4 }}>Inspirationsfoto hochladen</p>
              <p style={{ fontSize:13, color:C.muted }}>Pinterest, Instagram, Zeitschrift – KI analysiert sofort</p>
            </>
          )}
        </div>
        <input type="file" ref={fileRef} accept="image/*" onChange={onFile} style={{ display:"none" }} />

        {/* Loading */}
        {loading && (
          <div className="fu" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 16px", textAlign:"center", marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"center", gap:6, marginBottom:10 }}>
              {[0,1,2].map(j => <div key={j} style={{ width:10, height:10, borderRadius:"50%", background:C.accent, animation:`blink 1.2s ease ${j*0.2}s infinite` }} />)}
            </div>
            <p style={{ fontSize:14, fontWeight:600, color:C.text }}>KI analysiert Materialien...</p>
            <p style={{ fontSize:12, color:C.muted, marginTop:4 }}>Erkennt Fliesen, Holz, Armaturen, Farben</p>
          </div>
        )}

        {/* Error */}
        {error && <div style={{ background:"#FEF2F2", border:"1px solid #FCA5A5", borderRadius:12, padding:"12px 14px", marginBottom:14 }}><p style={{ color:"#B91C1C", fontSize:13 }}>❌ {error}</p></div>}

        {/* Analysis Result */}
        {analysis && (
          <div className="fu">
            {/* Stil & Stimmung */}
            <div style={{ background:`linear-gradient(135deg, ${C.accent}22, ${C.accentBg})`, border:`1px solid ${C.accent}44`, borderRadius:14, padding:"16px", marginBottom:14 }}>
              <p style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:C.text, marginBottom:6 }}>✨ {analysis.stil}</p>
              <p style={{ fontSize:13, color:C.text, lineHeight:1.65, marginBottom:12 }}>{analysis.stimmung}</p>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {analysis.farben?.map((f,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:24, height:24, borderRadius:6, background:f, border:"2px solid rgba(0,0,0,0.1)", flexShrink:0 }} />
                    <span style={{ fontSize:11, color:C.muted }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Eckdaten */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
              {[
                { label:"Budget", val:analysis.budget, icon:"💶" },
                { label:"Zeitaufwand", val:analysis.zeitaufwand, icon:"⏱" },
                { label:"Schwierigkeit", val:analysis.schwierigkeit, icon:"🔧" },
              ].map(({label,val,icon}) => (
                <div key={label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"10px 10px 8px", textAlign:"center" }}>
                  <p style={{ fontSize:16, marginBottom:4 }}>{icon}</p>
                  <p style={{ fontSize:10, color:C.muted, marginBottom:3 }}>{label}</p>
                  <p style={{ fontSize:12, fontWeight:700, color: label==="Schwierigkeit" ? (SCHWIERIGKEIT_COLOR[val]||C.text) : C.text, lineHeight:1.3 }}>{val}</p>
                </div>
              ))}
            </div>

            {/* Materialien */}
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, marginBottom:14, overflow:"hidden" }}>
              <div style={{ padding:"12px 14px", background:C.accentBg, borderBottom:`1px solid ${C.border}` }}>
                <p style={{ fontSize:14, fontWeight:700, color:C.accent }}>🪨 Erkannte Materialien</p>
              </div>
              {analysis.materialien?.map((mat, i) => (
                <div key={i} style={{ padding:"12px 14px", borderBottom:i<analysis.materialien.length-1?`1px solid ${C.border}`:"none" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:2 }}>
                        <span style={{ fontSize:11, background:C.tag, color:C.muted, padding:"1px 7px", borderRadius:20, flexShrink:0 }}>{mat.bereich}</span>
                        {mat.farbe && <span style={{ fontSize:11, color:C.muted }}>{mat.farbe}</span>}
                      </div>
                      <p style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:2 }}>{mat.material}</p>
                      {mat.produkt && <p style={{ fontSize:12, color:C.muted }}>{mat.produkt}</p>}
                    </div>
                    {mat.preis && <span style={{ fontSize:12, fontWeight:600, color:C.green, flexShrink:0, marginLeft:10 }}>{mat.preis}</span>}
                  </div>
                  {mat.amazon && (
                    <a href={`https://www.amazon.de/s?k=${encodeURIComponent(mat.amazon)}&tag=${AFFILIATE_TAG}`} target="_blank" rel="noopener noreferrer"
                      style={{ display:"inline-flex", alignItems:"center", gap:4, marginTop:4, background:C.greenBg, color:C.green, borderRadius:20, padding:"4px 11px", fontSize:12, textDecoration:"none", fontWeight:600 }}>
                      🛒 {mat.amazon}
                    </a>
                  )}
                </div>
              ))}
            </div>

            {/* So machst du es nach */}
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, marginBottom:14, overflow:"hidden" }}>
              <div style={{ padding:"12px 14px", background:"#F0F7FF", borderBottom:`1px solid ${C.border}` }}>
                <p style={{ fontSize:14, fontWeight:700, color:"#1E40AF" }}>🔨 So machst du es nach</p>
              </div>
              <div style={{ padding:"12px 14px" }}>
                {analysis.umsetzung?.map((schritt, i) => (
                  <div key={i} style={{ display:"flex", gap:10, marginBottom:i<analysis.umsetzung.length-1?10:0 }}>
                    <div style={{ width:24, height:24, borderRadius:"50%", background:C.accent, color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>{i+1}</div>
                    <p style={{ fontSize:13, color:C.text, lineHeight:1.55, flex:1, paddingTop:3 }}>{schritt.replace(/^Schritt \d+:\s*/,"")}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Profi-Tipps */}
            {analysis.profi_tipps?.length > 0 && (
              <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:14, padding:"14px", marginBottom:14 }}>
                <p style={{ fontSize:13, fontWeight:700, color:"#B45309", marginBottom:8 }}>⚡ Profi-Tipps</p>
                {analysis.profi_tipps.map((tip,i) => (
                  <p key={i} style={{ fontSize:13, color:"#7C4A03", lineHeight:1.6, marginBottom:i<analysis.profi_tipps.length-1?6:0 }}>• {tip}</p>
                ))}
              </div>
            )}

            {/* Sofort-Upgrades */}
            {analysis.sofort_upgrades?.length > 0 && (
              <div style={{ background:C.greenBg, border:`1px solid ${C.green}44`, borderRadius:14, padding:"14px", marginBottom:14 }}>
                <p style={{ fontSize:13, fontWeight:700, color:C.green, marginBottom:8 }}>✅ Günstige Sofort-Upgrades</p>
                {analysis.sofort_upgrades.map((up,i) => (
                  <p key={i} style={{ fontSize:13, color:"#1A4731", lineHeight:1.6, marginBottom:i<analysis.sofort_upgrades.length-1?6:0 }}>• {up}</p>
                ))}
              </div>
            )}

            {/* Neues Foto */}
            <button onClick={() => fileRef.current?.click()} style={{ width:"100%", padding:"13px", borderRadius:50, border:`2px solid ${C.accent}`, background:C.accentBg, color:C.accent, fontWeight:700, cursor:"pointer", fontSize:14, fontFamily:"'DM Sans',sans-serif" }}>
              📷 Nächstes Foto analysieren
            </button>
          </div>
        )}

        {/* Hinweis wenn noch kein Foto */}
        {!imgPreview && !loading && (
          <div style={{ marginTop:8 }}>
            <p style={{ fontSize:12, color:C.muted, marginBottom:12, textAlign:"center", fontStyle:"italic" }}>Beispiele was du hochladen kannst:</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {[
                { emoji:"🚿", text:"Traumbad von Pinterest" },
                { emoji:"🍳", text:"Küche aus Zeitschrift" },
                { emoji:"🛋️", text:"Wohnzimmer-Inspo" },
                { emoji:"🛏️", text:"Schlafzimmer-Idee" },
              ].map(({emoji,text}) => (
                <div key={text} onClick={() => fileRef.current?.click()} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px", textAlign:"center", cursor:"pointer" }}>
                  <div style={{ fontSize:24, marginBottom:6 }}>{emoji}</div>
                  <p style={{ fontSize:12, color:C.muted }}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── IDEEN TAB ────────────────────────────────────────────────────────────────
const TRENDS = [
  { cat:"Bad", title:"Wellness-Bad: Walk-In Dusche", desc:"Bodengleiche Dusche mit Regendusche und Glasabtrennung. Der größte Trend im Badbereich. Kein Stemmen nötig – Gefälleestrich einbauen, Dichtschlämme, Glaswand aufstellen.", how:"Installateur + DIY-Teil", budget:"1.500–5.000€", emoji:"🚿", img:"https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&h=220&fit=crop&q=80", amazon:"walk-in dusche glaswand 8mm ESG" },
  { cat:"Bad", title:"Freistehende Badewanne", desc:"Ein Statement-Stück das jeden Raum transformiert. Acryl oder Gusseisen, Boden-Armatur daneben. Sieht aus wie ein Designhotel.", how:"Installateur für Anschluss", budget:"800–3.000€", emoji:"🛁", img:"https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=600&h=220&fit=crop&q=80", amazon:"freistehende badewanne acryl oval" },
  { cat:"Bad", title:"Mikrozement fugenlos", desc:"Beton-Look ohne Fugen – direkt über Fliesen. Kein Stemmen! 3 Schichten auftragen, PU-Versiegelung. Zeitloser Luxus-Look der nie altert.", how:"DIY möglich mit Übung", budget:"60–120€/m²", emoji:"🏛️", img:"https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=600&h=220&fit=crop&q=80", amazon:"mikrozement set boden wand versiegelung" },
  { cat:"Bad", title:"Mattschwarz Armaturen & Spiegel", desc:"Kompletter Stil-Shift für unter 500€. Armaturen tauschen ist DIY-fähig: Wasser ab, Siphon lösen, neue Armatur. LED-Spiegel mit IP44 als Krönung.", how:"DIY – 2–4 Stunden", budget:"200–600€", emoji:"🖤", img:"https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=600&h=220&fit=crop&q=80", amazon:"grohe armatur mattschwarz bad set" },
  { cat:"Bad", title:"Zellige-Fliesen Rückwand", desc:"Handgemachte marokkanische Fliesen 10×10cm. Jede einzigartig – Charme durch Unvollkommenheit. Über alte Fliesen kleben mit Spezialkleber.", how:"DIY – Wochenende", budget:"40–120€/m²", emoji:"🟤", img:"https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&h=220&fit=crop&q=80", amazon:"zellige fliesen handgemacht 10x10 weiß" },
  { cat:"Küche", title:"Dunkle Fronten: Navy & Grün", desc:"Navy-Blau, Flaschengrün, Anthrazit statt ewig Weiß. Fronten lackieren: P120 schleifen → Haftgrund → 3× Seidenmatt. RAL 5011 oder RAL 6009.", how:"DIY – 2–3 Tage", budget:"100–400€", emoji:"🍳", img:"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=220&fit=crop&q=80", amazon:"küchen fronten lackieren haftgrund seidenmatt" },
  { cat:"Küche", title:"Offene Holzregale statt Hängeschränke", desc:"Oberschränke raus, Massivholzbrett + Wandträger rein. Eiche oder Nussbaum, 4cm stark, geölt. Raum wirkt sofort größer und wärmer.", how:"DIY – halber Tag", budget:"100–300€", emoji:"📚", img:"https://images.unsplash.com/photo-1556909211-36987e6e9a65?w=600&h=220&fit=crop&q=80", amazon:"eiche massivholz regal küche wandträger" },
  { cat:"Küche", title:"Kücheninsel selbst gebaut", desc:"IKEA KALLAX oder VADHOLMA als Basis, Massivholzplatte drauf. Barhocker dazu = Treffpunkt der Familie. Für 300–600€ machbar.", how:"DIY – Wochenende", budget:"300–800€", emoji:"🏝️", img:"https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=600&h=220&fit=crop&q=80", amazon:"kücheninsel massivholzplatte eiche ikea" },
  { cat:"Küche", title:"Zellige Küchenrückwand", desc:"Trend 2025: Handgemachte Fliesen als Rückwand. 7,5×15cm Metro-Format in Weiß, Cremé oder Salbeigrün. Direkt über alte Fliesen möglich.", how:"DIY – 1 Tag", budget:"50–150€", emoji:"⬜", img:"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=220&fit=crop&q=80", amazon:"metro fliesen küche rückwand weiß zellige" },
  { cat:"Wohnzimmer", title:"Akzentwand Dunkelgrün", desc:"Nur EINE Wand in Flaschengrün (RAL 6009) oder Waldgrün. Lammfellrolle, 2 Schichten, Tesa Precision abkleben. Größte Wirkung für 30–60€.", how:"DIY – 1 Tag", budget:"30–80€", emoji:"🌿", img:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=220&fit=crop&q=80", amazon:"wandfarbe dunkelgrün matt alpina schöner wohnen" },
  { cat:"Wohnzimmer", title:"TV-Wand Fluted Panel", desc:"Gerillte MDF-Paneele hinter TV kleben oder schrauben. Vor Montage ölen/lackieren! LED-Strip 2700K dahinter = Magazin-Look ohne Renovierung.", how:"DIY – halber Tag", budget:"80–250€", emoji:"📺", img:"https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=220&fit=crop&q=80", amazon:"wandpaneele mdf fluted panel holzoptik" },
  { cat:"Wohnzimmer", title:"Indirektes Cove-Licht", desc:"Holzkastenrahmen 15cm breit am Deckenrand, LED-Strip 2700K dahinter. Licht strahlt zur Decke. Warmes Hotelzimmer-Feeling für ~200€.", how:"DIY – Wochenende", budget:"150–350€", emoji:"✨", img:"https://images.unsplash.com/photo-1600210492493-0946911123ea?w=600&h=220&fit=crop&q=80", amazon:"led strip 2700k cove licht kastendecke" },
  { cat:"Wohnzimmer", title:"Warme Erdetöne & Rattan", desc:"Terrakotta, Ocker, Sandstein. Rattan-Sessel, Jute-Teppich, Keramik-Vasen. Sofort umsetzbar ohne Handwerker – komplette Raumtransformation.", how:"Sofort umsetzbar", budget:"200–600€", emoji:"🍂", img:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=220&fit=crop&q=80", amazon:"terrakotta wandfarbe rattan sessel jute teppich" },
  { cat:"Schlafzimmer", title:"Bouclé Kopfteil DIY", desc:"MDF-Platte (OBI schneidet auf Maß) + 5cm Schaumstoff RG35 + Bouclé-Stoff tackern. Ergebnis = Hotel-Schlafzimmer. Wand dahinter in Terrakotta.", how:"DIY – 4 Stunden", budget:"80–200€", emoji:"🛏️", img:"https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?w=600&h=220&fit=crop&q=80", amazon:"bouclé stoff polsterstoff meterware creme" },
  { cat:"Schlafzimmer", title:"Dunkle Decke Nachtblau", desc:"Nur die Decke in Nachtblau oder Dunkelgrün streichen. Wände weiß lassen. Erzeugt Geborgenheit wie ein Zelt. 2200K LED als Wandleuchten dazu.", how:"DIY – 3 Stunden", budget:"25–60€", emoji:"🌙", img:"https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=220&fit=crop&q=80", amazon:"wandfarbe nachtblau dunkelblau matt decke" },
  { cat:"Boden", title:"SPC-Vinyl über Fliesen", desc:"100% wasserfest, Klicksystem direkt über alte Fliesen. Kein Stemmen, kein Kleber. Eiche-Optik oder Betongrau. Fertig in einem Tag.", how:"DIY – 1 Tag", budget:"15–35€/m²", emoji:"🪵", img:"https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&h=220&fit=crop&q=80", amazon:"spc vinyl boden klick über fliesen wasserfest" },
  { cat:"Boden", title:"Fischgrät-Parkett verlegen", desc:"Breite Dielen in Fischgrät-Muster = eleganteste Verlegeart. Schwimmend oder verklebt. Eiche geölt oder gebürstet. Wertsteigernd.", how:"Mittel – Wochenende", budget:"40–80€/m²", emoji:"⬛", img:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=220&fit=crop&q=80", amazon:"fertigparkett eiche fischgrät verlegen" },
  { cat:"Terrasse", title:"WPC-Terrasse selbst gebaut", desc:"WPC-Dielen auf Unterkonstruktion – wartungsfrei, splitterfrei, vergraut nicht. Stelzlager für höhenausgleich. Unsichtbare Clip-Befestigung.", how:"Mittel – Wochenende", budget:"35–65€/m²", emoji:"🌴", img:"https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=600&h=220&fit=crop&q=80", amazon:"wpc dielen terrasse clip unsichtbar" },
  { cat:"Terrasse", title:"Outdoor-Lounge Paletten", desc:"EPAL-gestempelte Paletten schleifen, ölen, stapeln. Outdoor-Kissen in Sunbrella-Qualität. Solar-Lichterketten 2200K. Für unter 300€ eine komplette Lounge.", how:"DIY – Wochenende", budget:"150–400€", emoji:"☀️", img:"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=220&fit=crop&q=80", amazon:"outdoor kissen sunbrella solar lichterkette" },
];

const KATEGORIEN = ["Alle", "Bad", "Küche", "Wohnzimmer", "Schlafzimmer", "Boden", "Terrasse"];

function IdeenTab() {
  const [kat, setKat] = useState("Alle");
  const [openTrend, setOpenTrend] = useState(null);
  const gefiltert = kat === "Alle" ? TRENDS : TRENDS.filter(t => t.cat === kat);

  return (
    <div style={{ overflowY:"auto", height:"100%" }}>
      {/* Filter */}
      <div style={{ padding:"14px 16px 10px", position:"sticky", top:0, background:C.bg, zIndex:10, borderBottom:`1px solid ${C.border}` }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, marginBottom:10 }}>Ideen & Trends 2025</h2>
        <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:2 }}>
          {KATEGORIEN.map(k => (
            <button key={k} onClick={() => setKat(k)} style={{ padding:"6px 13px", borderRadius:20, border:`1px solid ${kat===k?C.accent:C.border}`, background:kat===k?C.accent:"white", color:kat===k?"white":C.muted, fontSize:12, cursor:"pointer", fontWeight:kat===k?600:400, fontFamily:"'DM Sans',sans-serif", flexShrink:0 }}>{k}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:"12px 16px 20px" }}>
        <p style={{ fontSize:12, color:C.muted, marginBottom:14, fontStyle:"italic" }}>{gefiltert.length} Ideen – tippe für mehr Details</p>
        {gefiltert.map((trend, i) => (
          <div key={i} className="fu" style={{ background:C.card, border:`1px solid ${openTrend===i?C.accent:C.border}`, borderRadius:16, marginBottom:12, overflow:"hidden", animationDelay:`${i*0.03}s` }}>
            {/* Bild */}
            <div style={{ position:"relative", height:170, overflow:"hidden", cursor:"pointer" }} onClick={() => setOpenTrend(openTrend===i?null:i)}>
              <img src={trend.img} alt={trend.title} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 55%)" }} />
              <div style={{ position:"absolute", top:10, right:10 }}>
                <span style={{ background:"rgba(255,255,255,0.9)", color:C.accent, borderRadius:20, padding:"3px 9px", fontSize:11, fontWeight:700 }}>{trend.cat}</span>
              </div>
              <div style={{ position:"absolute", bottom:12, left:14, right:14 }}>
                <p style={{ color:"white", fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, marginBottom:4 }}>{trend.emoji} {trend.title}</p>
                <div style={{ display:"flex", gap:6 }}>
                  <span style={{ background:"rgba(255,255,255,0.2)", color:"white", borderRadius:20, padding:"2px 8px", fontSize:11 }}>💶 {trend.budget}</span>
                  <span style={{ background:"rgba(255,255,255,0.2)", color:"white", borderRadius:20, padding:"2px 8px", fontSize:11 }}>🔨 {trend.how}</span>
                </div>
              </div>
            </div>

            {/* Ausgeklappt */}
            {openTrend === i && (
              <div className="fu" style={{ padding:"14px 16px" }}>
                <p style={{ fontSize:14, color:C.text, lineHeight:1.7, marginBottom:12 }}>{trend.desc}</p>
                <div style={{ display:"flex", gap:8 }}>
                  <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(trend.title + " Anleitung DIY")}`} target="_blank" rel="noopener noreferrer" style={{ flex:1, textAlign:"center", padding:"8px", borderRadius:9, background:"#FDEEEC", color:"#C0392B", fontSize:12, textDecoration:"none", fontWeight:600 }}>▶ YouTube Tutorial</a>
                  <a href={`https://www.amazon.de/s?k=${encodeURIComponent(trend.amazon)}&tag=${AFFILIATE_TAG}`} target="_blank" rel="noopener noreferrer" style={{ flex:1, textAlign:"center", padding:"8px", borderRadius:9, background:C.accentBg, color:C.accent, fontSize:12, textDecoration:"none", fontWeight:600 }}>🛒 Material kaufen</a>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PAYWALL / PRICING ───────────────────────────────────────────────────────
function PricingModal({ onClose, onSuccess, freeUsed }) {
  const [loading, setLoading] = useState(null);
  const [email, setEmail] = useState("");

  async function checkout(plan) {
    setLoading(plan);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, email }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("Fehler: " + (data.error || "Unbekannt"));
    } catch (e) {
      alert("Verbindungsfehler. Bitte erneut versuchen.");
    }
    setLoading(null);
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div className="fu" style={{ background:C.card, borderRadius:"24px 24px 0 0", padding:"28px 22px 40px", width:"100%", maxWidth:600 }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
          <div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:C.text }}>RenoPilot upgraden</h2>
            <p style={{ fontSize:13, color:C.muted, marginTop:3 }}>
              {freeUsed >= 3 ? "Du hast alle 3 gratis Makeovers genutzt." : `Noch ${3 - freeUsed} gratis Makeover${3-freeUsed!==1?"s":""} übrig.`}
            </p>
          </div>
          {onClose && <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, color:C.muted, cursor:"pointer", padding:"4px" }}>✕</button>}
        </div>

        {/* Email */}
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Deine E-Mail-Adresse" type="email"
          style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:14, fontFamily:"'DM Sans',sans-serif", background:C.bg, marginBottom:16, marginTop:12 }} />

        {/* Plans */}
        <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:16 }}>

          {/* Basic */}
          <div style={{ border:`2px solid ${C.border}`, borderRadius:16, padding:"16px 18px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <div>
                <p style={{ fontWeight:700, fontSize:16, color:C.text }}>Basic</p>
                <p style={{ fontSize:12, color:C.muted }}>Für gelegentliche Renovierer</p>
              </div>
              <div style={{ textAlign:"right" }}>
                <p style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:C.text, fontWeight:700 }}>9,99€</p>
                <p style={{ fontSize:11, color:C.muted }}>/Monat</p>
              </div>
            </div>
            <div style={{ fontSize:13, color:C.text, lineHeight:1.8, marginBottom:12 }}>
              {["✓ 20 KI-Makeovers pro Monat", "✓ Alle Stilvorlagen", "✓ Materialien + Amazon-Links", "✓ Anleitungen & Chat"].map(f => <div key={f}>{f}</div>)}
            </div>
            <button onClick={() => checkout("basic")} disabled={!!loading} style={{ width:"100%", padding:"12px", borderRadius:50, background:loading==="basic"?C.border:C.text, color:"white", border:"none", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
              {loading==="basic" ? "Wird geladen…" : "Basic starten →"}
            </button>
          </div>

          {/* Pro */}
          <div style={{ border:`2px solid ${C.accent}`, borderRadius:16, padding:"16px 18px", background:C.accentBg, position:"relative" }}>
            <div style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", background:C.accent, color:"white", borderRadius:20, padding:"3px 14px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>⭐ MEISTGEWÄHLT</div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <div>
                <p style={{ fontWeight:700, fontSize:16, color:C.text }}>Pro</p>
                <p style={{ fontSize:12, color:C.muted }}>Für ernsthafte Renovierer</p>
              </div>
              <div style={{ textAlign:"right" }}>
                <p style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:C.accent, fontWeight:700 }}>19,99€</p>
                <p style={{ fontSize:11, color:C.muted }}>/Monat</p>
              </div>
            </div>
            <div style={{ fontSize:13, color:C.text, lineHeight:1.8, marginBottom:12 }}>
              {["✓ Unbegrenzte KI-Makeovers", "✓ Flux Pro – bessere Bildqualität", "✓ Alle Basic Features", "✓ Priorität bei der Generierung"].map(f => <div key={f} style={{ fontWeight: f.includes("Pro") ? 600 : 400 }}>{f}</div>)}
            </div>
            <button onClick={() => checkout("pro")} disabled={!!loading} style={{ width:"100%", padding:"13px", borderRadius:50, background:loading==="pro"?C.border:C.accent, color:"white", border:"none", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
              {loading==="pro" ? "Wird geladen…" : "Pro starten →"}
            </button>
          </div>
        </div>

        <p style={{ fontSize:11, color:C.muted, textAlign:"center" }}>
          Monatlich kündbar · Zahlung über Stripe gesichert · Keine versteckten Kosten
        </p>
      </div>
    </div>
  );
}
const TABS = [
  { id:"makeover", label:"Makeover", icon:"✨" },
  { id:"chat",     label:"Chat",     icon:"💬" },
  { id:"inspo",    label:"Inspo",    icon:"🔍" },
  { id:"ideen",    label:"Ideen",    icon:"💡" },
  { id:"anleit",   label:"Anleit.",  icon:"📋" },
  { id:"planer",   label:"Planer",   icon:"📅" },
  { id:"profis",   label:"Profis",   icon:"🔨" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("makeover");
  const [savedMakeovers, setSavedMakeovers] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [subscription, setSubscription] = useState(null); // null | {plan, sessionId}
  const [freeUsed, setFreeUsed] = useState(0);
  const [chatMessages, setChatMessages] = useState([{
    role:"assistant",
    text:"Hey! 👋 Ich bin dein persönlicher Renovierungsexperte – frag mich alles über Bad, Küche, Wohnzimmer, Boden, Licht und mehr.\n\nIch gebe dir **konkrete Antworten** mit Produktnamen, Preisen und Schritt-für-Schritt Anleitungen. Oder lade ein 📷 Foto hoch und ich analysiere deinen Raum sofort!",
  }]);

  useEffect(() => {
    // Onboarding
    try { if (!localStorage.getItem("renopilot_onboarding_done")) setShowOnboarding(true); } catch {}

    // Free usage counter
    try { setFreeUsed(parseInt(localStorage.getItem("renopilot_free_used") || "0")); } catch {}

    // Subscription aus localStorage
    try {
      const saved = localStorage.getItem("renopilot_subscription");
      if (saved) {
        const parsed = JSON.parse(saved);
        setSubscription(parsed);
        // Verify still active
        fetch("/api/verify-subscription", {
          method: "POST", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ sessionId: parsed.sessionId }),
        }).then(r => r.json()).then(data => {
          if (!data.valid) {
            setSubscription(null);
            localStorage.removeItem("renopilot_subscription");
          }
        }).catch(() => {});
      }
    } catch {}

    // Nach Stripe Redirect
    const params = new URLSearchParams(window.location.search);
    const stripeStatus = params.get("subscription");
    const plan = params.get("plan");
    const sessionId = params.get("session_id");

    if (stripeStatus === "success" && plan && sessionId) {
      const sub = { plan, sessionId, activatedAt: Date.now() };
      setSubscription(sub);
      try { localStorage.setItem("renopilot_subscription", JSON.stringify(sub)); } catch {}
      // URL säubern
      window.history.replaceState({}, "", "/");
      setShowPricing(false);
    }
  }, []);

  function finishOnboarding() {
    setShowOnboarding(false);
    try { localStorage.setItem("renopilot_onboarding_done", "1"); } catch {}
  }

  function incrementFreeUsed() {
    const next = freeUsed + 1;
    setFreeUsed(next);
    try { localStorage.setItem("renopilot_free_used", String(next)); } catch {}
  }

  function canGenerate() {
    if (subscription) return true;
    return freeUsed < 3;
  }

  const planLabel = subscription?.plan === "pro" ? "Pro ⭐" : subscription?.plan === "basic" ? "Basic" : null;

  return (
    <>
      {showOnboarding && <Onboarding onDone={finishOnboarding} />}
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} freeUsed={freeUsed} />}
      <Head>
        <title>RenoPilot – KI Renovierungs-App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="description" content="KI-Renovierungsplaner: Foto hochladen, Makeover-Bilder generieren, Ideen und Anleitungen für dein Zuhause." />
        <style dangerouslySetInnerHTML={{ __html:globalCSS }} />
      </Head>
      <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:C.bg, maxWidth:600, margin:"0 auto" }}>
        <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"13px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700 }}>Reno<span style={{ color:C.accent }}>Pilot</span></span>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {planLabel ? (
              <span style={{ fontSize:12, color:C.accent, fontWeight:700, background:C.accentBg, padding:"4px 10px", borderRadius:20 }}>{planLabel}</span>
            ) : (
              <button onClick={() => setShowPricing(true)} style={{ fontSize:12, color:"white", fontWeight:700, background:C.accent, padding:"5px 12px", borderRadius:20, border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                Upgrade ✨
              </button>
            )}
            {!planLabel && <span style={{ fontSize:11, color:C.muted }}>{Math.max(0, 3-freeUsed)} gratis</span>}
          </div>
        </div>
        <div style={{ flex:1, overflow:"hidden", position:"relative" }}>
          <div style={{ display:activeTab==="makeover"?"flex":"none", height:"100%", overflow:"hidden" }}>
            <MakeoverTab
              onSaveToPlaner={m => setSavedMakeovers(prev=>[m,...prev])}
              savedMakeovers={savedMakeovers}
              plan={subscription?.plan || "free"}
              canGenerate={canGenerate()}
              freeUsed={freeUsed}
              onNeedUpgrade={() => setShowPricing(true)}
              onGenerated={incrementFreeUsed}
            />
          </div>
          <div style={{ display:activeTab==="chat"?"flex":"none", flexDirection:"column", height:"100%" }}>
            <ChatTab messages={chatMessages} setMessages={setChatMessages} />
          </div>
          {activeTab==="inspo" && <InspoTab />}
          {activeTab==="ideen" && <IdeenTab />}
          {activeTab==="anleit" && <AnleitungenTab />}
          {activeTab==="planer" && <PlanerTab savedMakeovers={savedMakeovers} />}
          {activeTab==="profis" && <HandwerkerTab />}
        </div>
        <div style={{ background:C.card, borderTop:`1px solid ${C.border}`, display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr", flexShrink:0 }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ background:"none", border:"none", cursor:"pointer", padding:"8px 2px 12px", display:"flex", flexDirection:"column", alignItems:"center", gap:3, borderTop:`2.5px solid ${activeTab===tab.id?C.accent:"transparent"}`, transition:"border-color 0.2s" }}>
              <span style={{ fontSize:19 }}>{tab.icon}</span>
              <span style={{ fontSize:10, fontWeight:600, color:activeTab===tab.id?C.accent:C.muted, fontFamily:"'DM Sans',sans-serif" }}>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
