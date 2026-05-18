import React, { useState, useRef, useEffect } from "react";
import Head from "next/head";

const SYSTEM = `Du bist Mystorija, ein freundlicher DIY-Renovierungsexperte für den deutschsprachigen Markt. Deine Nutzer sind AMATEURE. Erkläre alles einfach, konkret, auf Deutsch, motivierend. Immer mit Produktnamen, deutschen Preisen (OBI/Bauhaus/Hornbach/Amazon/IKEA). Warne bei Elektro-Festinstallation, Asbest und tragenden Wänden immer klar.`;

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
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=DM+Sans:wght@300;400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  body { font-family: 'DM Sans', sans-serif; background: #F8F5F0; overscroll-behavior: none; }
  textarea, input, button { font-family: 'DM Sans', sans-serif; }

  /* Smooth scrolling */
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #EDE8DF; border-radius: 3px; }

  /* Animations */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes blink {
    0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
    40%            { opacity: 1;   transform: scale(1); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-8px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  /* Card hover lift */
  .fu { animation: fadeUp 0.35s ease both; }
  .fi { animation: fadeIn 0.3s ease both; }

  /* Loading skeleton */
  .skeleton {
    background: linear-gradient(90deg, #f0ece6 25%, #e8e3dc 50%, #f0ece6 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 8px;
  }

  /* Tab active indicator */
  .tab-active { position: relative; }
  .tab-active::after {
    content: '';
    position: absolute;
    bottom: 0; left: 20%; right: 20%;
    height: 2px;
    background: #C4622D;
    border-radius: 2px;
  }

  /* Button press effect */
  button:active { transform: scale(0.97); }
  a:active { transform: scale(0.97); }

  /* Image lazy load fade */
  img { transition: opacity 0.3s ease; }
  img[loading="lazy"] { opacity: 0; }
  img[loading="lazy"].loaded { opacity: 1; }

  /* Focus styles */
  textarea:focus, input:focus, select:focus { outline: none; }

  /* Blink for loading dots */
  @keyframes blink { 0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }

  /* Spin */
  @keyframes spin { to { transform: rotate(360deg); } }
`;



function LoadingSpinner({ size }) {
  const sz = size || 24;
  return <div style={{ width: sz, height: sz, border: "3px solid " + C.border, borderTop: "3px solid " + C.accent, borderRadius: "50%", flexShrink: 0, animation: "spin 0.85s linear infinite" }} />;
}

function Pill({ children, bg, color }) {
  return <span style={{ background: bg || C.accentBg, color: color || C.accent, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>{children}</span>;
}

// ─── AFFILIATE ────────────────────────────────────────────────────────────────
const AFFILIATE_TAG = "mystorija-21";
function amazonLink(q, qBau) {
  const bq = qBau || q;
  return {
    amzn: `https://www.amazon.de/s?k=${encodeURIComponent(q)}&tag=mystorija-21`,
    obi:  `https://www.obi.de/suche/${encodeURIComponent(bq)}/`,
    bh:   `https://www.bauhaus.info/search?q=${encodeURIComponent(bq)}`,
    hb:   `https://www.hornbach.de/s/${encodeURIComponent(bq)}/`,
  };
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
    img:"https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=120&q=80",
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
    img:"https://images.unsplash.com/photo-1574739782594-db4ead022697?w=120&q=80",
    werkzeug:["Stichsäge","Zugeisen","Trittschalldämmung","Abstandshalter 10mm","Gummihammer"],
    schritte:["Untergrund: eben (max. 3mm/2m), trocken","Trittschalldämmung vollflächig verlegen","48h Laminat akklimatisieren – Pflicht!","Abstandshalter 10mm an alle Wände","Nut zur Wand, erste Reihe ausrichten","Jede Reihe mind. 40cm versetzt","Letzte Reihe messen, schneiden, einziehen","Sockelleisten an Wand schrauben (NICHT ans Laminat)"],
    tipp:"48h akklimatisieren verhindert, dass sich der Boden nach Verlegen wölbt.",
    fehler:"Dehnungsfuge vergessen, keine Folie auf Beton.",
    youtube:"https://www.youtube.com/results?search_query=laminat+verlegen+anleitung",
    amazon:amazonLink("laminat verlegewerkzeug trittschalldämmung") },
  { id:"wandpaneele", emoji:"📐", titel:"Wandpaneele / Fluted Panels", schwierigkeit:"Leicht", zeit:"4–8 Stunden", kosten:"50–200€",
    img:"https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=120&q=80",
    werkzeug:["Bohrschrauber","Stichsäge","SPC-Kleber","Wasserwaage","Abstandshalter"],
    schritte:["Wand: gerade, trocken, tapetenfrei","Paneele 24h akklimatisieren","Erstes Panel mit Wasserwaage ausrichten","Kleber: S-Muster, mind. 5cm vom Rand","Panel andrücken, 2 Min. halten","Stöße versetzen wie Mauerwerk","Steckdosen: Pappe-Schablone, dann Stichsäge","Abschluss mit Profil oder Anstrich"],
    tipp:"Fluted Panels hinter Bett oder Sofa – meistgesuchter Look 2025.",
    fehler:"Erstes Panel nicht ausrichten, Lösungsmittel-Kleber auf Kunststoff.",
    youtube:"https://www.youtube.com/results?search_query=wandpaneele+fluted+panel",
    amazon:amazonLink("wandpaneele fluted panel MDF") },
  { id:"led", emoji:"💡", titel:"LED-Beleuchtung einbauen", schwierigkeit:"Leicht", zeit:"2–4 Stunden", kosten:"30–150€",
    img:"https://images.unsplash.com/photo-1600210492493-0946911123ea?w=120&q=80",
    werkzeug:["WAGO-Klemmen","Seitenschneider","Spannungsprüfer","LED-Streifen 24V","Dimmer"],
    schritte:["Sicherung raus! Spannungsprüfer nutzen","24V LED-Streifen wählen","WAGO statt Lüsterklemmen","Untergrund entfetten, Ecken mit Verbinder","Streifen kleben, andrücken","Trailing-Edge-Dimmer einbauen","Trafo: min. 20% Leistungsreserve","Test vor dem Abdecken"],
    tipp:"Indirekte LED in Stuckkehle wirkt besser als direkte Spots.",
    fehler:"Zu schwacher Trafo, Streifen knicken, falscher Dimmer.",
    youtube:"https://www.youtube.com/results?search_query=led+streifen+einbauen+anleitung",
    amazon:amazonLink("led streifen 24v wago dimmer set") },
  { id:"silikon", emoji:"🔲", titel:"Silikon erneuern", schwierigkeit:"Leicht", zeit:"2–3 Stunden", kosten:"10–25€",
    img:"https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=120&q=80",
    werkzeug:["Silikonentferner","Cuttermesser","Sanitär-Silikon (Soudal)","Silikonpistole","Spülmittel"],
    schritte:["Altes Silikon mit Cuttermesser raus","Reste mit Entferner lösen (15 Min.)","Untergrund mit Isopropanol entfetten","Malerband beidseitig abkleben","Silikon in einem Zug auftragen","Finger mit Spülmittel glattziehen","Band SOFORT (nass) abziehen","24h nicht nass"],
    tipp:"Badewanne vor Abdichten mit Wasser füllen – hält bei Belastung besser.",
    fehler:"Band zu spät, fettig, kein Pilzhemmer.",
    youtube:"https://www.youtube.com/results?search_query=silikon+erneuern+bad+anleitung",
    amazon:amazonLink("soudal sanitär silikon pilzhemmend") },
  { id:"tapezieren", emoji:"🖼️", titel:"Tapete entfernen & tapezieren", schwierigkeit:"Leicht", zeit:"1–2 Tage", kosten:"20–80€",
    img:"https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=120&q=80",
    werkzeug:["Tapeziertisch","Tapezierbürste","Tapezierpaste","Cuttermesser","Wasserwalze"],
    schritte:["Alte Tapete einweichen: Wasser + Spülmittel, 15 Min. warten","Tapete in langen Streifen von oben abziehen","Kleisterreste nass abwischen, trocknen lassen","Neue Tapete messen: Raumhöhe + 5cm Zugabe","Kleister anrühren, auf Tapete auftragen","Tapete einschlagen, 5 Min. einweichen","Von oben ansetzen, Luftblasen rausstreichen","Überschuss mit Cuttermesser abschneiden"],
    tipp:"Immer in Richtung des Fensterlichts tapezieren – Stöße werden unsichtbar.",
    fehler:"Zu kurze Einweichzeit, Luftblasen nicht rausstreichen, falscher Kleister.",
    youtube:"https://www.youtube.com/results?search_query=tapete+entfernen+tapezieren+anleitung",
    amazon:amazonLink("tapezierpaste tapezierbürste set") },
  { id:"fugenreinigen", emoji:"🧹", titel:"Fugen reinigen & auffrischen", schwierigkeit:"Leicht", zeit:"2–4 Stunden", kosten:"15–40€",
    img:"https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=120&q=80",
    werkzeug:["Fugenreiniger","Fugenbürste","Dampfreiniger (optional)","Fugenstift weiß","Schleifklotz"],
    schritte:["Fugenreiniger auftragen, 10–15 Min. einwirken","Mit Fugenbürste kräftig schrubben","Dampfreiniger für hartnäckige Stellen","Gründlich abspülen, trocknen lassen","Wenn grau/gelblich: Fugenstift auftragen","Bei komplett verfärbt: ausschleifen + neu verfugen","Fugenschutz-Spray als Abschluss"],
    tipp:"Dampfreiniger leihen statt kaufen – effektivstes Werkzeug für einmalige Nutzung.",
    fehler:"Chlorhaltige Reiniger auf farbigen Fliesen, Fugen nicht vollständig trocknen.",
    youtube:"https://www.youtube.com/results?search_query=fugen+reinigen+auffrischen+anleitung",
    amazon:amazonLink("fugenreiniger fugenstift weiß set") },
  { id:"kueche-fronten", emoji:"🍳", titel:"Küchenfronten austauschen", schwierigkeit:"Leicht", zeit:"1 Tag", kosten:"200–800€",
    img:"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=120&q=80",
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
    img:"https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=120&q=80",
    werkzeug:["Flex mit Trennscheibe","Putzspachtel","Außenputz-Reparaturmasse","Armierungsband","Grundierung"],
    schritte:["Riss aufweiten: V-förmig aufschlitzen (bessere Haftung)","Losen Putz entfernen, abbürsten","Grundierung auftragen, 30 Min. trocknen","Armierungsband in Riss einlegen","Reparaturmasse in zwei Schichten","Erste Schicht eindrücken, 2h trocknen","Zweite Schicht bündig abglätten","Nach 24h Fassadenfarbe auftragen"],
    tipp:"Risse >3mm immer aufschlitzen. Zugekleisterter Riss reißt nach einem Winter wieder auf.",
    fehler:"Riss nicht aufweiten, kein Armierungsband, Farbton nicht anpassen.",
    youtube:"https://www.youtube.com/results?search_query=außenputz+riss+reparieren+anleitung",
    amazon:amazonLink("außenputz reparatur set armierungsband") },
  { id:"parkett", emoji:"🪵", titel:"Parkett & Vinyl verlegen", schwierigkeit:"Mittel", zeit:"1–2 Tage", kosten:"150–600€",
    img:"https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=120&q=80",
    werkzeug:["Stichsäge","Gummihammer","Zugeisen","Abstandshalter 10mm","Wasserwaage"],
    schritte:["48h akklimatisieren (Pakete geöffnet, liegend im Raum)","Untergrund prüfen: max. 3mm Unebenheit – sonst Ausgleichsmasse (Knauf Nivello)","Trittschalldämmung auslegen, Stöße 15cm überlappen","Erste Reihe: 10mm Abstandshalter zur Wand – IMMER!","Klicksystem: Winkel einsetzen und nach unten drücken","Richtung: längs zur Fensterseite = Raum wirkt größer","Letzte Reihe mit Zugeisen eindrücken","Sockelleisten KLEBEN – nie auf Laminat schrauben!"],
    tipp:"SPC-Vinyl = 100% wasserfest für Bad und Küche. Laminat nur für Trockenräume!",
    fehler:"Dehnungsfuge vergessen, zu früh betreten (24h warten), Türrahmen nicht untergeschoben.",
    youtube:"https://www.youtube.com/results?search_query=vinyl+laminat+verlegen+anleitung",
    amazon:amazonLink("spc vinyl klick boden verlegen set") },
  { id:"kueche-fronten", emoji:"🍳", titel:"Küchenfronten lackieren", schwierigkeit:"Mittel", zeit:"2–3 Tage", kosten:"80–300€",
    img:"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=120&q=80",
    werkzeug:["Exzenterschleifer P120/180","Haftgrund Zinsser BIN","Seidenmatt-Lack","Schaumstoffrolle 4mm","Abklebeband","Schraubenzieher"],
    schritte:["Fronten ausbauen und nummerieren","Mit Aceton entfetten – der wichtigste Schritt!","P120 schleifen für Haftung, Staub absaugen","Haftgrund dünn auftragen, 2h trocknen","1. Farbschicht mit Schaumstoffrolle (kurzflorig = keine Struktur)","4h trocknen, P180 leicht anschleifen","2. und 3. Farbschicht mit je 4h Trockenzeit","Fronten einbauen, Scharniere justieren"],
    tipp:"Zinsser BIN haftet auf fast allem – auch glatten MDF-Fronten ohne langes Schleifen.",
    fehler:"Zu dicke Schichten = Läufer. Nicht entfettet = Ablösung nach Wochen.",
    youtube:"https://www.youtube.com/results?search_query=küchenfronten+lackieren+anleitung",
    amazon:amazonLink("zinsser bin haftgrund küche fronten lackieren") },
  { id:"led-strip", emoji:"💡", titel:"LED-Strip & Cove-Licht installieren", schwierigkeit:"Leicht", zeit:"2–4 Stunden", kosten:"30–120€",
    img:"https://images.unsplash.com/photo-1600210492493-0946911123ea?w=120&q=80",
    werkzeug:["LED-Strip 24V COB","Trafo (20% Reserve)","WAGO-Klemmen","Alu-Profil + Diffusor","Cuttermesser"],
    schritte:["Länge messen, Wattzahl berechnen (W/m × Meter)","Trafo wählen: min. 20% mehr als Gesamtwatt","Alu-Profil zuschneiden und mit Klebeband oder Schrauben montieren","Strip NUR an Schnittmarkierungen kürzen!","Strip einlegen, Diffusor aufsetzen","Anschluss mit WAGO-Klemmen (kein Löten nötig)","Trailing-Edge-Dimmer anschließen (kein Flimmern!)","Testen bevor alles verklebt wird"],
    tipp:"24V = kein Spannungsabfall. Bei 12V und mehr als 3m wird Licht ungleichmäßig.",
    fehler:"Vorderflanken-Dimmer = Flimmern. Trafo zu schwach = überhitzt. Strip falsch herum.",
    youtube:"https://www.youtube.com/results?search_query=led+strip+cove+licht+anleitung",
    amazon:amazonLink("led strip 24v cob warmweiß 2700k trafo dimmer") },
  { id:"rigips-wand", emoji:"🏗️", titel:"Rigips-Trennwand bauen", schwierigkeit:"Mittel", zeit:"2–3 Tage", kosten:"200–600€",
    img:"https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=120&q=80",
    werkzeug:["Akkuschrauber","Blechschere für Profile","Wasserwaage 1m","Rigips-Schrauben 3,5×35mm","Spachtel"],
    schritte:["Grundriss auf Boden anzeichnen, Wasserwaage zur Decke übertragen","UW-Profile an Boden + Decke mit Dübeln alle 50cm","CW-Ständer alle 62,5cm – Raster für 125cm Platten!","Leerrohr für Kabel einziehen VOR dem Beplatten","Erste Seite: Schrauben alle 25cm, Kopf 0,5mm versenkt","Dämmwolle einlegen (Steinwolle für Schallschutz)","Zweite Seite – Plattenstöße versetzt!","Fugenspachtel + Glasflies-Band einbetten, trocknen, schleifen"],
    tipp:"Im Bad: GKFI (grüne Feuchtraumplatten) verwenden – weiße GKB quillt auf!",
    fehler:"Ständer falsch abständig, Glasflies vergessen = Riss nach 6 Monaten.",
    youtube:"https://www.youtube.com/results?search_query=rigips+trennwand+bauen+anleitung",
    amazon:amazonLink("rigips ständerwerk cw uw profil trockenbau set") },
  { id:"wpc-terrasse", emoji:"🌴", titel:"WPC-Terrasse verlegen", schwierigkeit:"Mittel", zeit:"1–2 Tage", kosten:"500–2.000€",
    img:"https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=120&q=80",
    werkzeug:["Kreissäge oder Stichsäge","Akkuschrauber","Wasserwaage","Stelzlager höhenverstellbar","Abstandshalter 5mm"],
    schritte:["Untergrund reinigen – alter Belag kann bleiben wenn stabil","Stelzlager setzen alle 50cm, Flucht mit Schnur prüfen","2% Gefälle einplanen (weg vom Haus)","Tragebalken auf Stelzlager – Holz oder Alu alle 40–50cm","Erste Diele mit 10mm Abstand zur Wand","Unsichtbare Clips einsetzen – kein Schraubloch sichtbar!","Letzte Reihe zuschneiden","Abschlussprofile an allen Rändern montieren"],
    tipp:"WPC 48h akklimatisieren. Im Sommer dehnt WPC sich aus – Dehnfugen einhalten!",
    fehler:"Zu wenig Gefälle = Pfützen, keine Dehnfuge = Wellen im Sommer.",
    youtube:"https://www.youtube.com/results?search_query=wpc+dielen+verlegen+terrasse",
    amazon:amazonLink("wpc dielen terrasse stelzlager clip unsichtbar set") },
  { id:"arbeitsplatte", emoji:"🔨", titel:"Arbeitsplatte wechseln", schwierigkeit:"Mittel", zeit:"1 Tag", kosten:"100–500€",
    img:"https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=120&q=80",
    werkzeug:["Stichsäge mit Holzblatt","Oberfräse für saubere Ausschnitte","Silikon + Pistole","Montagekleber","Maßband"],
    schritte:["Wasser unter Spüle abstellen, Siphon abbauen","Alte Platte von unten lösen (Schrauben in Eckverbindern)","Neue Platte auf Maß zuschneiden – 1mm zu groß lassen","Spülenausschnitt mit Schablone anzeichnen","Stichsäge: erst Loch bohren, dann Richtung Gegenfase schneiden","Schnittkanten SOFORT abdichten – quillt sonst auf!","Platte einlegen, von unten verschrauben","Silikon an Wand und Spülenrand, 24h trocknen"],
    tipp:"Schnittkante nie unbehandelt lassen – quillt garantiert auf!",
    fehler:"Ausschnitt zu groß, Kante nicht abgedichtet, Silikon zu früh belastet.",
    youtube:"https://www.youtube.com/results?search_query=arbeitsplatte+küche+wechseln",
    amazon:amazonLink("holzarbeitsplatte küche massiv buche eiche geölt") },
  { id:"abdichtung-bad", emoji:"🛡️", titel:"Bad abdichten (Dusche & Wanne)", schwierigkeit:"Mittel", zeit:"2 Tage", kosten:"80–200€",
    img:"https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=120&q=80",
    werkzeug:["Dichtschlämme Mapei Mapelastic","Dichtband + Dichtmanschetten","Pinsel 10cm","Zahnspachtel","Latexhandschuhe"],
    schritte:["Untergrund reinigen: kein Staub, kein Fett","1. Lage Dichtschlämme dünn auftragen","Dichtband in ALLE Ecken einbetten während Lage noch nass!","Dichtmanschetten über alle Rohre einbetten","1. Lage trocknen: mind. 4h (besser über Nacht)","2. Lage quer zur ersten – Kreuzverband verhindert Risse","24h trocknen vor Fliesenarbeiten","Mit Sprühflasche testen: kein Durchfeuchten"],
    tipp:"Dichtband einbetten = es muss in der ersten Lage versinken. Nur überstreichen reicht nicht!",
    fehler:"Nur 1 Lage, Band nicht eingebettet, Trockenzeit unterschritten = undicht nach 1 Jahr.",
    youtube:"https://www.youtube.com/results?search_query=bad+abdichten+dichtschlämme+anleitung",
    amazon:amazonLink("mapei mapelastic dichtschlämme bad dusche set") },
  { id:"bodengleiche-dusche", emoji:"🚿", titel:"Bodengleiche Dusche bauen", schwierigkeit:"Schwer", zeit:"3–5 Tage", kosten:"500–2.000€",
    img:"https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=120&q=80",
    werkzeug:["Ablaufrinne oder Punktablauf","Gefälleestrich-Set","Dichtschlämme 2-lagig","Flexkleber C2","Wasserwaage 1m"],
    schritte:["Ablauf positionieren: weit vom Duschkopf entfernt","Gefälleestrich anmischen: 1,5–2% Gefälle zur Rinne","Estrich aufbringen, Gefälle prüfen (Wasserwaage + Messen)","48h trocknen, Klopftest: kein Hohlklang!","2-lagige Abdichtung mit Dichtband in allen Ecken","Fliesen mit Flexkleber C2 verlegen – Gefälle beibehalten","Schlüter KERDI-Profil am Übergang Dusche/Bad","Randfuge: NUR Silikon (Soudal S100) – nie Fugenmörtel!"],
    tipp:"Wasser-Test: Wasser draufgießen und beobachten – muss restlos ablaufen ohne Pfützen.",
    fehler:"Zu wenig Gefälle, kein Dichtband in Ecken, falscher Kleber.",
    youtube:"https://www.youtube.com/results?search_query=bodengleiche+dusche+bauen+anleitung",
    amazon:amazonLink("bodengleiche dusche ablaufrinne gefälleestrich set") },
  { id:"fliesenspiegel-bekleben", emoji:"🎨", titel:"Küche & Fliesen folieren", schwierigkeit:"Leicht", zeit:"2–4 Stunden", kosten:"30–100€",
    img:"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=120&q=80",
    werkzeug:["Klebefolie d-c-fix oder Oracal","Cuttermesser + Stahllineal","Gummirakel","Isopropanol","Fön"],
    schritte:["Mit Isopropanol entfetten – komplett trocknen lassen","Folie ausmessen + 3cm Übermaß","Trägerpapier 10cm abziehen, Kante ausrichten","Rakel von oben nach unten – keine Blasen!","Überlappungen an Fugen einschneiden","Blasen: Nadel einstechen, Fön erwärmen, herausdrücken","Ecken mit Fön erwärmen für bessere Haftung","Schalter: X einschneiden, Ecken ausklappen"],
    tipp:"Spüliwasser (1 Tropfen auf 1L) ermöglicht Positionieren auf glatten Flächen.",
    fehler:"Nicht entfettet = Ablösung, zu stark gezogen = Falten.",
    youtube:"https://www.youtube.com/results?search_query=klebefolie+fliesen+küche+anleitung",
    amazon:amazonLink("klebefolie selbstklebend möbel fliesen dc-fix") },
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
      const saved = localStorage.getItem("mystorija_anleitungen");
      if (saved) setErledigt(JSON.parse(saved));
    } catch {}
  }, []);

  // Fortschritt speichern
  const toggleSchritt = (key) => {
    setErledigt(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem("mystorija_anleitungen", JSON.stringify(next)); } catch {}
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
                try { localStorage.removeItem("mystorija_anleitungen"); } catch {}
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
                  <a href={a.youtube} target="_blank" rel="noopener noreferrer" style={{ flex:1, textAlign:"center", padding:"9px", borderRadius:9, background:"#FDEEEC", color:"#C0392B", fontSize:12, textDecoration:"none", fontWeight:600, border:"1px solid #F5D0D033" }}>▶ Video</a>
                  <a href={a.amazon?.amzn || a.amazon} target="_blank" rel="noopener noreferrer" style={{ flex:1, textAlign:"center", padding:"9px", borderRadius:9, background:"#FFF8E7", color:"#B7791F", fontSize:12, textDecoration:"none", fontWeight:600, border:"1px solid #F6E05E44" }}>Amazon</a>
                  <a href={a.amazon?.obi} target="_blank" rel="noopener noreferrer" style={{ flex:1, textAlign:"center", padding:"9px", borderRadius:9, background:"#EBFAF0", color:"#276749", fontSize:12, textDecoration:"none", fontWeight:600, border:"1px solid #C6F6D544" }}>OBI</a>
                  <a href={a.amazon?.hb} target="_blank" rel="noopener noreferrer" style={{ flex:1, textAlign:"center", padding:"9px", borderRadius:9, background:C.accentBg, color:C.accent, fontSize:12, textDecoration:"none", fontWeight:600, border:`1px solid ${C.accent}33` }}>Hornbach</a>
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
  if (t.match(/hallo|hi|hey|guten|servus/)) return "Hey! 👋 Schön dass du da bist!\n\nIch bin dein Mystorija – dein DIY-Experte für Renovierungen.\n\n**Was kann ich für dich tun?**\n\n🚿 Bad renovieren\n🍳 Küche aufwerten\n🛋️ Wohnzimmer gestalten\n🛏️ Schlafzimmer umgestalten\n🌿 Terrasse/Balkon\n\nLade ein Foto hoch oder schreib mir welchen Raum du renovieren möchtest!";
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

// ─── TIPPS BOX ────────────────────────────────────────────────────────────────
function TippsBox() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("tipps"); // "tipps" | "vorlage"

  const TIPPS = [
    { icon:"🔄", titel:"Objekte ersetzen", gut:"Keine Badewanne, dafür eine Walk-In Dusche mit Regendusche", schlecht:"Dusche", erklaerung:"Sag was weg soll UND was kommen soll. 'Dafür', 'stattdessen', 'anstatt' helfen der KI." },
    { icon:"🎨", titel:"Farben & Materialien", gut:"Anthrazit-Feinsteinzeug 80x80cm, weiße Fugen, Eichenholz-Waschtisch", schlecht:"Andere Farben", erklaerung:"Nenne konkrete Farbnamen und Materialien: Anthrazit, Navy, Terrakotta, Marmor, Eiche, Mikrozement, Zellige." },
    { icon:"🌿", titel:"Terrasse & Außen", gut:"Füge Grill hinzu, Pergola mit Rankpflanzen, Olivenbaum in Terrakotta-Topf, Lichterketten", schlecht:"Schöner machen", erklaerung:"Für Terrassen: Möbel, Pflanzen, Beleuchtung und Bodenbelag separat nennen. Je mehr Details, desto besser." },
    { icon:"💡", titel:"Stil beschreiben", gut:"Modernes Spa-Bad mit indirektem Licht, mattschwarz Armaturen, Holzakzente", schlecht:"Modern", erklaerung:"Stile: Modern, Skandinavisch, Industrial, Japandi, Mediterran, Luxus, Minimalist, Rustikal." },
    { icon:"📐", titel:"Mehreres kombinieren", gut:"Dunkle Fliesen, keine Badewanne dafür Dusche, schwarze Armaturen, Wandnische", schlecht:"Alles neu", erklaerung:"Mehrere Änderungen mit Komma trennen – die KI arbeitet alle ab." },
    { icon:"⚠️", titel:"Was KI schwer kann", gut:"Fliesen dunkler, Farbe ändern, Möbel hinzufügen", schlecht:"Wände verschieben, Fenster vergrößern", erklaerung:"Farben, Materialien & Möbel hinzufügen klappt gut. Strukturelle Änderungen (Wände, Fenster) sind KI-schwierig." },
  ];

  const VORLAGEN = [
    {
      raum: "🚿 Bad", beispiel: "Keine Badewanne, dafür eine bodengleiche Walk-In Dusche mit Regendusche. Dunkle Anthrazit-Fliesen 80x80cm, mattschwarz Armaturen, schwebender Eichen-Waschtisch, LED-Spiegel.",
    },
    {
      raum: "🍳 Küche", beispiel: "Navy-blaue Fronten, Messing-Griffe, offene Eichenregale statt Hängeschränke, weiße Zellige-Fliesen als Rückwand, LED-Strip unter den Oberschränken.",
    },
    {
      raum: "🛋️ Wohnzimmer", beispiel: "Dunkelgrüne Akzentwand hinter dem Sofa, warmes indirektes Deckenlicht, gerillte Holzpaneele hinter dem TV, bouclé-Sofa, Terrakotta-Vasen.",
    },
    {
      raum: "🌿 Terrasse", beispiel: "Großformatige Außenfliesen 60x60cm grau, Lounge-Sofa mit cremefarbenen Outdoor-Kissen, Esstisch mit weißen Stühlen, Pergola mit Rankpflanzen, Olivenbaum in Terrakotta-Topf, Lichterketten, Grill rechts hinten.",
    },
    {
      raum: "🏡 Terrasse modern", beispiel: "WPC-Dielen in Teak-Optik, modulare Lounge-Gruppe, Sichtschutz aus Holzlatten, Außenküche mit Grill eingebaut, große Terrakotta-Töpfe mit Lavendel und Olivenbaum, Solar-Lichterketten 2200K.",
    },
  ];

  return (
    <div style={{ marginTop:8 }}>
      <button onClick={() => setOpen(o => !o)} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", padding:0, fontFamily:"'DM Sans',sans-serif" }}>
        <span style={{ fontSize:12, color:C.accent, fontWeight:600 }}>💡 Tipps & Vorlagen für bessere Ergebnisse</span>
        <span style={{ fontSize:12, color:C.muted, transform:open?"rotate(90deg)":"none", transition:"0.2s", display:"inline-block" }}>›</span>
      </button>

      {open && (
        <div className="fu" style={{ marginTop:10, background:C.accentBg, border:`1px solid ${C.accent}33`, borderRadius:12, overflow:"hidden" }}>
          {/* Tab-Switcher */}
          <div style={{ display:"flex", borderBottom:`1px solid ${C.accent}33` }}>
            {[["tipps","💡 Tipps"],["vorlage","📋 Vorlagen"]].map(([id,label]) => (
              <button key={id} onClick={() => setTab(id)} style={{ flex:1, padding:"9px", background:tab===id?"white":"transparent", border:"none", borderBottom:`2px solid ${tab===id?C.accent:"transparent"}`, color:tab===id?C.accent:C.muted, fontSize:12, fontWeight:tab===id?700:400, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>{label}</button>
            ))}
          </div>

          {tab === "tipps" && (
            <div style={{ padding:"12px", display:"flex", flexDirection:"column", gap:10 }}>
              <p style={{ fontSize:12, fontWeight:700, color:C.accent }}>So bekommst du die besten KI-Makeovers:</p>
              {TIPPS.map((t, i) => (
                <div key={i} style={{ background:"white", borderRadius:10, padding:"11px 13px" }}>
                  <p style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:6 }}>{t.icon} {t.titel}</p>
                  <div style={{ display:"flex", gap:6, alignItems:"flex-start", marginBottom:5 }}>
                    <span style={{ fontSize:10, background:C.greenBg, color:C.green, padding:"2px 7px", borderRadius:20, fontWeight:700, flexShrink:0, marginTop:1 }}>✓</span>
                    <span style={{ fontSize:12, color:C.text, lineHeight:1.4 }}>"{t.gut}"</span>
                  </div>
                  <div style={{ display:"flex", gap:6, alignItems:"flex-start", marginBottom:6 }}>
                    <span style={{ fontSize:10, background:"#FEF2F2", color:"#B91C1C", padding:"2px 7px", borderRadius:20, fontWeight:700, flexShrink:0, marginTop:1 }}>✗</span>
                    <span style={{ fontSize:12, color:C.muted, lineHeight:1.4 }}>"{t.schlecht}"</span>
                  </div>
                  <p style={{ fontSize:11, color:C.muted, lineHeight:1.5, borderTop:`1px solid ${C.border}`, paddingTop:6 }}>{t.erklaerung}</p>
                </div>
              ))}
            </div>
          )}

          {tab === "vorlage" && (
            <div style={{ padding:"12px", display:"flex", flexDirection:"column", gap:8 }}>
              <p style={{ fontSize:12, fontWeight:700, color:C.accent, marginBottom:4 }}>Tippe auf eine Vorlage um sie zu verwenden:</p>
              {VORLAGEN.map((v, i) => (
                <div key={i} style={{ background:"white", borderRadius:10, padding:"11px 13px", cursor:"pointer", border:`1px solid ${C.border}` }}
                  onClick={() => {
                    // Find parent MakeoverTab's setWunsch via a custom event
                    window.dispatchEvent(new CustomEvent("mystorija_set_wunsch", { detail: v.beispiel }));
                    setOpen(false);
                  }}>
                  <p style={{ fontSize:13, fontWeight:700, color:C.accent, marginBottom:5 }}>{v.raum}</p>
                  <p style={{ fontSize:12, color:C.text, lineHeight:1.55 }}>"{v.beispiel}"</p>
                  <p style={{ fontSize:11, color:C.green, marginTop:6, fontWeight:600 }}>↑ Tippen zum Einfügen</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
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
  const [laenge, setLaenge] = useState("");
  const [breite, setBreite] = useState("");
  const [hoehe, setHoehe] = useState("");

  // Vorlage aus TippsBox einfügen
  useEffect(() => {
    const handler = (e) => setWunsch(e.detail);
    window.addEventListener("mystorija_set_wunsch", handler);
    return () => window.removeEventListener("mystorija_set_wunsch", handler);
  }, []);
  const [makoverAnalyse, setMakoverAnalyse] = useState(null);
  const [makoverAnalyseLoading, setMakoverAnalyseLoading] = useState(false);
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
        body: JSON.stringify({
          imageBase64: base64,
          style: stil,
          chatContext: instruction,
          plan: plan||"free",
          dimensions: (laenge && breite) ? { laenge, breite, hoehe: hoehe||"2.4" } : null,
        }),
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
          body: JSON.stringify({
            imageBase64: base64,
            style: stil,
            chatContext: wunsch||null,
            plan: plan||"free",
            dimensions: (laenge && breite) ? { laenge, breite, hoehe: hoehe||"2.4" } : null,
          }),
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
        // Automatisch analysieren was generiert wurde
        if (data.imageBase64) {
          setMakoverAnalyse(null);
          setMakoverAnalyseLoading(true);
          fetch("/api/analyse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64: data.imageBase64, mimeType: "image/jpeg" }),
          }).then(r => r.json()).then(d => {
            if (d.analysis) setMakoverAnalyse(d.analysis);
          }).catch(() => {}).finally(() => setMakoverAnalyseLoading(false));
        }
      } catch (err) {
        clearInterval(timer);
        setError(err.message);
        setLoading(false);
      }
    })();
  }

  function handleSaveToPlaner() {
    if (!nachherUrl) return;
    const m = {
      id: Date.now(),
      date: new Date().toLocaleDateString("de-DE"),
      time: new Date().toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}),
      titel: wunsch ? wunsch.slice(0,40) : (makoverAnalyse?.stil || "Makeover"),
      vorherUrl, imgUrl: nachherUrl,
      materials: makoverAnalyse
        ? buildMaterialsFromAnalyse(makoverAnalyse)  // KI-erkannte Materialien bevorzugen
        : materials,
      wunsch,
      analyse: makoverAnalyse || null,  // komplette Analyse speichern
    };
    onSaveToPlaner(m); setSaved(true);
  }

  // KI-Analyse in Materialien-Text umwandeln für Einkaufsliste
  function buildMaterialsFromAnalyse(analyse) {
    if (!analyse?.materialien?.length) return materials;
    return analyse.materialien.map(mat => {
      const amazonLink = mat.amazon
        ? ` [Amazon →](https://www.amazon.de/s?k=${encodeURIComponent(mat.amazon)}&tag=mystorija-21)`
        : "";
      const preis = mat.preis ? ` · Ca. ${mat.preis}` : "";
      return `🪨 **${mat.material}** – ${mat.bereich}${mat.farbe ? `, ${mat.farbe}` : ""}${preis}.${amazonLink}`;
    }).join("\n");
  }

  function neuesMakeover() {
    setFile(null); setVorherUrl(null); setNachherUrl(null); setMaterials(null);
    setError(null); setSaved(false); setWunsch(""); setViewingHistory(null);
    setMakoverAnalyse(null); setMakoverAnalyseLoading(false); setRefinementHistory([]);
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
            {/* Maße */}
            <div style={{ marginBottom:14 }}>
              <p style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:8 }}>📐 Raummaße <span style={{ fontSize:11, fontWeight:400, color:C.muted }}>(optional, verbessert Ergebnis)</span></p>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:11, color:C.muted, marginBottom:4 }}>Länge</p>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <input
                      value={laenge} onChange={e => setLaenge(e.target.value.replace(/[^0-9.,]/g,""))}
                      placeholder="3,5" type="text" inputMode="decimal"
                      style={{ width:"100%", padding:"8px 10px", borderRadius:9, border:`1.5px solid ${laenge?C.accent:C.border}`, fontSize:14, fontFamily:"'DM Sans',sans-serif", background:C.bg, textAlign:"center" }}
                    />
                    <span style={{ fontSize:12, color:C.muted, flexShrink:0 }}>m</span>
                  </div>
                </div>
                <span style={{ fontSize:18, color:C.muted, marginTop:16 }}>×</span>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:11, color:C.muted, marginBottom:4 }}>Breite</p>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <input
                      value={breite} onChange={e => setBreite(e.target.value.replace(/[^0-9.,]/g,""))}
                      placeholder="2,2" type="text" inputMode="decimal"
                      style={{ width:"100%", padding:"8px 10px", borderRadius:9, border:`1.5px solid ${breite?C.accent:C.border}`, fontSize:14, fontFamily:"'DM Sans',sans-serif", background:C.bg, textAlign:"center" }}
                    />
                    <span style={{ fontSize:12, color:C.muted, flexShrink:0 }}>m</span>
                  </div>
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:11, color:C.muted, marginBottom:4 }}>Höhe</p>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <input
                      value={hoehe} onChange={e => setHoehe(e.target.value.replace(/[^0-9.,]/g,""))}
                      placeholder="2,4" type="text" inputMode="decimal"
                      style={{ width:"100%", padding:"8px 10px", borderRadius:9, border:`1.5px solid ${hoehe?C.accent:C.border}`, fontSize:14, fontFamily:"'DM Sans',sans-serif", background:C.bg, textAlign:"center" }}
                    />
                    <span style={{ fontSize:12, color:C.muted, flexShrink:0 }}>m</span>
                  </div>
                </div>
              </div>
              {laenge && breite && (
                <p style={{ fontSize:11, color:C.green, marginTop:5, fontWeight:600 }}>
                  ✓ {(parseFloat(laenge.replace(",",".")) * parseFloat(breite.replace(",","."))).toFixed(1)} m² – wird an KI übergeben
                </p>
              )}
            </div>

            {/* Beschreibung */}
            <div style={{ marginBottom:14 }}>
              <p style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:8 }}>✏️ Was soll sich ändern? <span style={{ fontSize:11, fontWeight:400, color:C.muted }}>(optional)</span></p>
              <textarea
                value={wunsch}
                onChange={e => setWunsch(e.target.value)}
                placeholder="z.B. Keine Badewanne dafür eine Dusche, dunkle Fliesen, moderner Stil, Walk-In Dusche einbauen..."
                rows={3}
                style={{ width:"100%", border:`1.5px solid ${wunsch?C.accent:C.border}`, borderRadius:12, padding:"10px 13px", fontSize:13, resize:"none", fontFamily:"'DM Sans',sans-serif", background:C.bg, lineHeight:1.6 }}
              />
              {/* Tipps ausklappbar */}
              <TippsBox />
            </div>

            {/* Upload */}
            <div onClick={() => fileRef.current.click()} style={{ border:`2px dashed ${vorherUrl?C.accent:C.border}`, borderRadius:16, overflow:"hidden", padding:vorherUrl?0:"32px 20px", textAlign:"center", cursor:"pointer", background:vorherUrl?"transparent":C.card, marginBottom:12 }}>
              {vorherUrl ? <img src={vorherUrl} alt="Vorher" style={{ width:"100%", display:"block", maxHeight:260, objectFit:"cover" }} /> :
                <div><p style={{ fontSize:36, marginBottom:8 }}>📷</p><p style={{ fontWeight:600, fontSize:15, color:C.text, marginBottom:4 }}>Foto hochladen</p><p style={{ fontSize:13, color:C.muted }}>Bad, Küche, Wohnzimmer...</p></div>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleDatei} />

            {vorherUrl && (
              <>

                {plan === "pro" && (
                  <div style={{ background:C.greenBg, border:`1px solid ${C.green}33`, borderRadius:10, padding:"6px 12px", marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:12 }}>⭐</span>
                    <p style={{ fontSize:12, color:C.green, fontWeight:600 }}>Pro: Flux Pro Modell aktiv – höhere Bildqualität</p>
                  </div>
                )}
                <button onClick={generieren} disabled={loading} style={{ width:"100%", padding:15, marginBottom:12, background:loading?"#DDD":"linear-gradient(135deg, #C4622D, #A0522D)", color:loading?"#999":"white", border:"none", borderRadius:50, fontSize:15, fontWeight:700, cursor:loading?"default":"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                  {loading ? "KI generiert Bild..." : "✨ Makeover generieren"}
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

                {/* ── KI-Analyse des generierten Bildes ── */}
                {makoverAnalyseLoading && (
                  <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 16px", marginBottom:10, display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ display:"flex", gap:4 }}>
                      {[0,1,2].map(j => <div key={j} style={{ width:7, height:7, borderRadius:"50%", background:C.accent, animation:`blink 1.2s ease ${j*0.2}s infinite` }} />)}
                    </div>
                    <p style={{ fontSize:13, color:C.muted }}>KI analysiert verwendete Materialien…</p>
                  </div>
                )}

                {makoverAnalyse && !makoverAnalyseLoading && (
                  <div className="fu" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, marginBottom:10, overflow:"hidden" }}>
                    {/* Header */}
                    <div style={{ padding:"12px 14px", background:`linear-gradient(135deg, ${C.accent}18, ${C.accentBg})`, borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <p style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color:C.text }}>{makoverAnalyse.stil}</p>
                        <p style={{ fontSize:11, color:C.muted, marginTop:2 }}>{makoverAnalyse.stimmung?.split(".")[0]}.</p>
                      </div>
                      {/* Farbpalette */}
                      <div style={{ display:"flex", gap:4 }}>
                        {makoverAnalyse.farben?.slice(0,4).map((f,i) => (
                          <div key={i} style={{ width:18, height:18, borderRadius:4, background:f, border:"1.5px solid rgba(0,0,0,0.1)" }} title={f} />
                        ))}
                      </div>
                    </div>

                    {/* Materialien */}
                    <div style={{ padding:"10px 14px 6px" }}>
                      <p style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.5, marginBottom:8 }}>Erkannte Materialien & Möbel</p>
                      {makoverAnalyse.materialien?.map((mat, i) => (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 0", borderBottom:i<makoverAnalyse.materialien.length-1?`1px solid ${C.border}`:"none" }}>
                          <span style={{ fontSize:10, background:C.tag, color:C.muted, padding:"2px 7px", borderRadius:20, flexShrink:0, whiteSpace:"nowrap" }}>{mat.bereich}</span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontSize:13, fontWeight:600, color:C.text }}>{mat.material}</p>
                            {mat.farbe && <p style={{ fontSize:11, color:C.muted }}>{mat.farbe}{mat.preis ? ` · ${mat.preis}` : ""}</p>}
                          </div>
                          {mat.amazon && (
                            <a href={`https://www.amazon.de/s?k=${encodeURIComponent(mat.amazon)}&tag=${AFFILIATE_TAG}`} target="_blank" rel="noopener noreferrer"
                              style={{ flexShrink:0, background:C.greenBg, color:C.green, borderRadius:20, padding:"4px 10px", fontSize:11, textDecoration:"none", fontWeight:700 }}>
                              🛒
                            </a>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Sofort-Upgrades */}
                    {makoverAnalyse.sofort_upgrades?.length > 0 && (
                      <div style={{ padding:"10px 14px 12px", borderTop:`1px solid ${C.border}`, background:C.greenBg }}>
                        <p style={{ fontSize:12, fontWeight:700, color:C.green, marginBottom:6 }}>💡 Günstiger Einstieg</p>
                        {makoverAnalyse.sofort_upgrades.slice(0,2).map((up,i) => (
                          <p key={i} style={{ fontSize:12, color:"#1A4731", lineHeight:1.5, marginBottom:i<1?4:0 }}>• {up}</p>
                        ))}
                      </div>
                    )}
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
            <p style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Mystorija Experte</p>
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
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>Mystorija</p>
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
                <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>Mystorija</span>
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
      const s = localStorage.getItem("mystorija_planer");
      if (s) { const d = JSON.parse(s); setChecked(d.checked||{}); setEigene(d.eigene||[]); }
    } catch {}
  }, []);

  const saveLS = (c, e) => {
    try { localStorage.setItem("mystorija_planer", JSON.stringify({ checked: c||checked, eigene: e||eigene })); } catch {}
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
      const saved = localStorage.getItem("mystorija_inspo");
      if (saved) setHistory(JSON.parse(saved));
    } catch {}
  }, []);

  function saveToHistory(preview, result) {
    const entry = { id: Date.now(), preview, analysis: result, date: new Date().toLocaleDateString("de-DE") };
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, 20); // max 20
      try { localStorage.setItem("mystorija_inspo", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function deleteFromHistory(id) {
    setHistory(prev => {
      const next = prev.filter(h => h.id !== id);
      try { localStorage.setItem("mystorija_inspo", JSON.stringify(next)); } catch {}
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
  // ── BAD (15) ─────────────────────────────────────────────────────────────────
  { cat:"Bad", title:"Walk-In Regendusche", desc:"Bodengleiche Dusche mit Decken-Regendusche 30×30cm. Gefälleestrich 1,5%, Schlüter KERDI Abdichtung, 8mm ESG-Glas. Kein Stemmen wenn neu aufgebaut.", how:"Installateur + DIY", budget:"1.500–5.000€", emoji:"🚿", img:"https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&h=220&fit=crop&q=80", amazon:"walk-in dusche regendusche set glaswand 8mm" },
  { cat:"Bad", title:"Freistehende Badewanne", desc:"Acryl-Wanne freistehend mit Bodenarmatur – das Statement-Stück jedes Bades. Montage: nur Ablauf + Zulauf nötig, kein Einbauen.", how:"Installateur", budget:"800–3.000€", emoji:"🛁", img:"https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=600&h=220&fit=crop&q=80", amazon:"freistehende badewanne weiß acryl oval" },
  { cat:"Bad", title:"Mikrozement Spa-Bad", desc:"Fugenloser Betonlook direkt über Fliesen. 3 Lagen + 2× PU-Versiegelung. Antibakteriell, pflegeleicht – wirkt wie ein 5-Sterne-Hotel.", how:"DIY mit Übung", budget:"60–120€/m²", emoji:"🏛️", img:"https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=600&h=220&fit=crop&q=80", amazon:"mikrozement set boden wand bad komplett" },
  { cat:"Bad", title:"Mattschwarz Armaturen Set", desc:"Grohe Essence oder Hansgrohe Metropol in Mattschwarz. Armatur tauschen = DIY 2h. Kombiniert mit Holz-Waschtisch = perfekter Kontrast.", how:"DIY – 2 Stunden", budget:"200–600€", emoji:"🖤", img:"https://images.unsplash.com/photo-1575844611782-6c3a7d57ae3d?w=600&h=220&fit=crop&q=80", amazon:"grohe armatur mattschwarz bad set" },
  { cat:"Bad", title:"Handgemachte Zellige Fliesen", desc:"Marokkanische 10×10cm Fliesen – jede einzigartig. Über alte Fliesen mit Flex C2. Wand oder Duschbereich als Akzent.", how:"DIY – Wochenende", budget:"40–120€/m²", emoji:"🟤", img:"https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&h=220&fit=crop&q=80", amazon:"zellige fliesen handgemacht 10x10" },
  { cat:"Bad", title:"Großformat 120×60cm Feinsteinzeug", desc:"Weniger Fugen = mehr Luxus. Lässt Bäder größer wirken. Doppelklebung Pflicht! Nivelliersystem verwenden bei >60×60.", how:"Fliesenleger", budget:"35–70€/m²", emoji:"⬛", img:"https://images.unsplash.com/photo-1620626011761-996317702782?w=600&h=220&fit=crop&q=80", amazon:"feinsteinzeug 120x60 anthrazit bad" },
  { cat:"Bad", title:"Schwebender Holz-Waschtisch", desc:"Teak oder Eiche, wandhängend. Rigips-Vorwand wenn kein Hohlraum. Macht Boden optisch größer – Spa-Feeling sofort.", how:"Installateur + DIY", budget:"400–1.200€", emoji:"🪵", img:"https://images.unsplash.com/photo-1604709177225-055f99402ea3?w=600&h=220&fit=crop&q=80", amazon:"waschtisch eiche teak schwebend wandmontage" },
  { cat:"Bad", title:"Hinterleuchteter LED-Spiegel", desc:"IP44, dimmbar, Beschlagschutz. Stecker-Anschluss = kein Elektriker. Sofortiger Wow-Effekt für unter 150€.", how:"DIY – 30 Min", budget:"80–400€", emoji:"💡", img:"https://images.unsplash.com/photo-1600147831337-1f7ea73a3e40?w=600&h=220&fit=crop&q=80", amazon:"led spiegel bad hinterbeleuchtet ip44 dimmbar" },
  { cat:"Bad", title:"Marmor-Look Großformat", desc:"Marmor-Optik Feinsteinzeug – pflegeleichter als echter Marmor. 80×160cm für maximalen Luxus-Effekt.", how:"Fliesenleger", budget:"45–90€/m²", emoji:"🏔️", img:"https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&h=220&fit=crop&q=80", amazon:"marmor optik fliesen großformat bad" },
  { cat:"Bad", title:"Indirekte LED-Deckenbeleuchtung", desc:"LED-Cove-Licht im Badezimmer = Spa-Atmosphäre rund um die Uhr. IP44, 2700K, dimmbar. Rigips-Kastenblende an Decke.", how:"DIY+Elektriker", budget:"200–500€", emoji:"✨", img:"https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=600&h=220&fit=crop&q=80", amazon:"led strip 2700k bad decke ip44 cove" },
  { cat:"Bad", title:"Japandi Bad Minimalistisch", desc:"Holz, Beton, Grünpflanze – reduziert auf das Wesentliche. Tadelakt-Wände oder Mikrozement, Hinoki-Holzhocker, bodentiefe Fenster.", how:"Mittel", budget:"2.000–6.000€", emoji:"🎋", img:"https://images.unsplash.com/photo-1604709177225-055f99402ea3?w=600&h=220&fit=crop&q=80", amazon:"japandi bad holzhocker tadelakt" },
  { cat:"Bad", title:"Badewanne einmauern mit Ablagefläche", desc:"Eingemauerte Wanne mit Ablage/Sitzbank daneben aus Feinsteinzeug. Integriert Stauraum und Sitzfläche. Beton- oder Holzoptik möglich.", how:"Fliesenleger", budget:"1.500–4.000€", emoji:"🛀", img:"https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=600&h=220&fit=crop&q=80", amazon:"eingemauerte badewanne fliesen feinsteinzeug" },
  { cat:"Bad", title:"Doppelwaschbecken Gemeinsam", desc:"Zwei Waschbecken nebeneinander auf einem langen Waschtischunterschrank. Ideal für Paare. Spart morgens Zeit.", how:"Installateur", budget:"600–2.000€", emoji:"👫", img:"https://images.unsplash.com/photo-1575844611782-6c3a7d57ae3d?w=600&h=220&fit=crop&q=80", amazon:"doppelwaschbecken waschtisch 120cm set" },
  { cat:"Bad", title:"Heizkörper als Design-Element", desc:"Handtuchtrockner in Mattschwarz oder Gebürstetes Gold als Statement. Spart Platz und trocknet Handtücher.", how:"Installateur", budget:"150–500€", emoji:"🔥", img:"https://images.unsplash.com/photo-1600147831337-1f7ea73a3e40?w=600&h=220&fit=crop&q=80", amazon:"badheizkörper handtuchtrockner mattschwarz design" },
  { cat:"Bad", title:"Wandnische mit Beleuchtung", desc:"In der Duschwand eine Nische aussparen: Ablagefläche für Shampoo und dekorative Kerzen. Mit LED-Strip beleuchtet = Highlight.", how:"Fliesenleger", budget:"200–600€", emoji:"💎", img:"https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&h=220&fit=crop&q=80", amazon:"duschablage nische edelstahl einbau led" },

  // ── KÜCHE (15) ────────────────────────────────────────────────────────────────
  { cat:"Küche", title:"Navy Blue Shaker Küche", desc:"Dunkelblau mit Messing-Griffen und Marmor-Arbeitsplatte. RAL 5011 Stahlblau oder F&B Hague Blue. Klassisch und zeitlos.", how:"DIY 2-3 Tage", budget:"150–500€", emoji:"🔵", img:"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=220&fit=crop&q=80", amazon:"küche navy blau fronten lackieren" },
  { cat:"Küche", title:"Offene Eichenregale", desc:"Hängeschränke raus, schwebende 4cm-Massivholzbretter rein. Raum wirkt sofort größer. OBI schneidet auf Maß.", how:"DIY – halber Tag", budget:"100–350€", emoji:"📚", img:"https://images.unsplash.com/photo-1556909211-36987e6e9a65?w=600&h=220&fit=crop&q=80", amazon:"massivholz regal eiche 4cm küche schwebregal" },
  { cat:"Küche", title:"Kücheninsel aus KALLAX", desc:"IKEA KALLAX + dicke Massivholzplatte = günstige Insel. Barhocker dazu = Familientreffpunkt. Unter 600€.", how:"DIY – Wochenende", budget:"300–700€", emoji:"🏝️", img:"https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=600&h=220&fit=crop&q=80", amazon:"kücheninsel massivholzplatte eiche ikea kallax" },
  { cat:"Küche", title:"Zellige Rückwand Metro", desc:"Handgemachte 7,5×15cm Fliesen als Küchenrückwand. Direkt über alte Fliesen. Weiß, Cremé oder Salbeigrün.", how:"DIY – 1 Tag", budget:"50–150€", emoji:"⬜", img:"https://images.unsplash.com/photo-1556909048-f0a46d7c3c0a?w=600&h=220&fit=crop&q=80", amazon:"metro fliesen zellige küche rückwand" },
  { cat:"Küche", title:"Messing & Kupfer Hardware", desc:"Griffe, Armatur, Hängelampen in gebürstetem Messing. 128mm Bügel-Griffe tauschen = 30 Min, großer Effekt.", how:"DIY – 30 Min", budget:"40–200€", emoji:"✨", img:"https://images.unsplash.com/photo-1556910638-6cdac31d8c23?w=600&h=220&fit=crop&q=80", amazon:"küchen griffe messing gebürstet set 20stück" },
  { cat:"Küche", title:"Holz-Arbeitsplatte Butcher Block", desc:"Massivholz (Buche/Eiche/Nussbaum) als Kontrast zu dunklen Fronten. Jährlich Osmo-Öl. Schnittkanten SOFORT abdichten!", how:"DIY bei Tausch", budget:"80–350€", emoji:"🪵", img:"https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=600&h=220&fit=crop&q=80", amazon:"holzarbeitsplatte küche massiv buche eiche geölt" },
  { cat:"Küche", title:"LED-Strip unter Oberschränken", desc:"2700K warmweiß unter allen Oberschränken = Arbeitslicht + Atmosphäre. Macht Essen appetitlicher. Komplettset mit Trafo 30€.", how:"DIY – 1 Stunde", budget:"30–80€", emoji:"💡", img:"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=220&fit=crop&q=80", amazon:"led strip küche unterschrank 2700k warmweiß" },
  { cat:"Küche", title:"Sage Green Shaker Fronten", desc:"Salbeigrün (RAL 6021) mit Messinggriffen und Live-Edge Regal darüber. Warm, bodenständig, Instagram-würdig.", how:"DIY 2-3 Tage", budget:"100–400€", emoji:"🌿", img:"https://images.unsplash.com/photo-1556910638-6cdac31d8c23?w=600&h=220&fit=crop&q=80", amazon:"küche salbeigrün fronten haftgrund seidenmatt" },
  { cat:"Küche", title:"Pendelleuchten über Insel", desc:"3 Pendelleuchten im gleichen Abstand über Insel oder Tisch. Abstand: 65–75cm zur Fläche. Globe, Sputnik oder Industrial.", how:"Elektriker", budget:"100–600€", emoji:"💫", img:"https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=600&h=220&fit=crop&q=80", amazon:"pendelleuchte küche insel set 3er gold" },
  { cat:"Küche", title:"Grifflose J-Pull Fronten", desc:"Fräsung oben an der Frontseite statt Griffe = cleaner minimalistischer Look. Tip-On oder J-Pull Profil möglich.", how:"Tischler / Montage", budget:"300–800€", emoji:"🤍", img:"https://images.unsplash.com/photo-1556909048-f0a46d7c3c0a?w=600&h=220&fit=crop&q=80", amazon:"grifflose fronten j-pull küche modern" },
  { cat:"Küche", title:"Betonsteinoptik Küchenboden", desc:"Großformatige Feinsteinzeug-Fliesen in Betonoptik für den Küchenboden. Pflegeleicht, zeitlos. Über alte Fliesen möglich.", how:"Fliesenleger", budget:"25–50€/m²", emoji:"🔲", img:"https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=600&h=220&fit=crop&q=80", amazon:"beton optik fliesen küche feinsteinzeug grau" },
  { cat:"Küche", title:"Dunstabzug als Statement", desc:"Edelstahl-Esse oder Wand-Haube in Mattschwarz als Designelement statt versteckt. Schornstein-Look oder Glockenform.", how:"Montage", budget:"300–1.500€", emoji:"🏭", img:"https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=600&h=220&fit=crop&q=80", amazon:"dunstabzugshaube wandhaube mattschwarz design" },
  { cat:"Küche", title:"Quarzstein Arbeitsplatte", desc:"Quarz (Silestone, Compac) – Naturstein-Look ohne Versiegelung. Hitze- und kratzfest. 2cm oder schlanke 1,2cm Kante.", how:"Profi-Montage", budget:"400–1.200€", emoji:"💎", img:"https://images.unsplash.com/photo-1556909211-36987e6e9a65?w=600&h=220&fit=crop&q=80", amazon:"quarzstein arbeitsplatte silestone küche" },
  { cat:"Küche", title:"Pantry-Schrank Stauraum", desc:"Hoher Vorratsschrank neben dem Kühlschrank mit ausziehbaren Einsätzen und LED-Innenbeleuchtung. Stauraum verdoppeln.", how:"Tischler / IKEA", budget:"300–1.000€", emoji:"📦", img:"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=220&fit=crop&q=80", amazon:"pantry schrank küche stauraum lebensmittel" },
  { cat:"Küche", title:"Mikrozement Küchenrückwand", desc:"Fugenlose Mikrozement-Rückwand statt Fliesen. Einfach zu reinigen, außergewöhnlicher Look. Anthrazit oder Warm-Greige.", how:"Mittel-DIY", budget:"80–200€/m²", emoji:"🏛️", img:"https://images.unsplash.com/photo-1556910638-6cdac31d8c23?w=600&h=220&fit=crop&q=80", amazon:"mikrozement küche rückwand arbeitsbereich" },

  // ── WOHNZIMMER (15) ───────────────────────────────────────────────────────────
  { cat:"Wohnzimmer", title:"Dunkelgrün Akzentwand", desc:"Eine Wand in Flaschengrün RAL 6009. Lammfellrolle, 2 Schichten. 30–60€ für den größten Raumeffekt überhaupt.", how:"DIY – 1 Tag", budget:"30–80€", emoji:"🌿", img:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=220&fit=crop&q=80", amazon:"wandfarbe dunkelgrün matt alpina schöner wohnen" },
  { cat:"Wohnzimmer", title:"Fluted Panel TV-Wand", desc:"Gerillte MDF-Latten hinter dem TV, LED-Strip dahinter. Vorher ölen oder lackieren. Magazin-Look für 150€.", how:"DIY – halber Tag", budget:"80–250€", emoji:"📺", img:"https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=220&fit=crop&q=80", amazon:"mdf fluted panel wandpaneele holzoptik" },
  { cat:"Wohnzimmer", title:"Cove-Licht Deckenrand", desc:"Holzrahmen 15cm an Decke, LED-Strip 2700K dahinter. Wärmstes Licht = Hotel-Feeling. Trafo hinter Kastenblende.", how:"DIY – Wochenende", budget:"150–400€", emoji:"✨", img:"https://images.unsplash.com/photo-1600210492493-0946911123ea?w=600&h=220&fit=crop&q=80", amazon:"led strip 2700k cove kastenblende decke" },
  { cat:"Wohnzimmer", title:"Erdtöne Rattan & Jute 2026", desc:"Terrakotta, Ocker, Sandstein. Rattan-Sessel, Jute-Teppich 200×300, handgemachte Keramik. Sofort ohne Handwerker.", how:"Sofort", budget:"200–600€", emoji:"🍂", img:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=220&fit=crop&q=80", amazon:"rattan sessel jute teppich terrakotta wohnzimmer" },
  { cat:"Wohnzimmer", title:"Limewash Strukturwand", desc:"Kalkputz-Optik mit lebendiger Textur. Über normaler Farbe möglich. Warm Greige, Rosa, Taubenblau – jede Wand einzigartig.", how:"DIY – 1 Tag", budget:"40–120€", emoji:"🏺", img:"https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=220&fit=crop&q=80", amazon:"limewash farbe kalkputz optik strukturfarbe" },
  { cat:"Wohnzimmer", title:"Einbauregal Boden bis Decke", desc:"MDF Regal von Wand zu Wand. LED-Strip dahinter in der Kastenblende. Weiß lackiert oder Eiche furniert.", how:"2 Wochenenden", budget:"400–1.500€", emoji:"📖", img:"https://images.unsplash.com/photo-1509644851169-2acc08aa25b5?w=600&h=220&fit=crop&q=80", amazon:"einbauregal mdf wohnzimmer boden decke" },
  { cat:"Wohnzimmer", title:"Bouclé Sofa Curved", desc:"Geschwungenes Bouclé-Sofa in Creme oder Hellgrau. Der Sofa-Trend 2026. Kombiniert mit Terrakotta-Wand = perfekt.", how:"Kauf", budget:"800–3.000€", emoji:"🛋️", img:"https://images.unsplash.com/photo-1558618049-6b1cdd80a2e2?w=600&h=220&fit=crop&q=80", amazon:"bouclé sofa curved wohnzimmer creme" },
  { cat:"Wohnzimmer", title:"Botanisches Wohnzimmer", desc:"Große Monstera, Fiddle Leaf Fig, Olivenbaum als Hauptelemente – nicht als Beiwerk. Körbe als Töpfe, helle Ecken.", how:"Sofort", budget:"100–400€", emoji:"🌱", img:"https://images.unsplash.com/photo-1416879595882-b3d065a0e45d?w=600&h=220&fit=crop&q=80", amazon:"monstera groß topf rattan zimmerpflanzen" },
  { cat:"Wohnzimmer", title:"Smart Home Licht Shelly", desc:"Shelly Relais hinter den Lichtschalter – App-steuerbar, kein Elektriker. Mit Alexa/Google Home. Szenen einrichten.", how:"DIY – 30 Min", budget:"20–60€", emoji:"📱", img:"https://images.unsplash.com/photo-1585184394271-4c0a47dc59c9?w=600&h=220&fit=crop&q=80", amazon:"shelly dimmer smart home lichtschalter" },
  { cat:"Wohnzimmer", title:"Holzboden Fischgrät", desc:"Fertigparkett in Fischgrät verlegt – eleganteste Verlegeart. Optisch breiter Raum. Eiche geölt, 12cm Breite.", how:"DIY – Wochenende", budget:"40–80€/m²", emoji:"⬛", img:"https://images.unsplash.com/photo-1562663474-6cbb3eaa4d14?w=600&h=220&fit=crop&q=80", amazon:"fertigparkett eiche fischgrät wohnzimmer" },
  { cat:"Wohnzimmer", title:"Bogenlampe Messing XXL", desc:"Große Bogenlampe in gebürstetem Messing oder Schwarz = sofortiger Luxus-Effekt. Kein Elektriker – Stecker.", how:"Kauf+Aufbau", budget:"150–600€", emoji:"🌙", img:"https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=220&fit=crop&q=80", amazon:"bogenlampe messing groß wohnzimmer stehlampe" },
  { cat:"Wohnzimmer", title:"Dunkle Velvet Vorhänge", desc:"Bodenlange Samtvorhänge von Decke bis Boden machen jeden Raum opulenter. Immer 20cm breiter als das Fenster!", how:"Aufhängen", budget:"80–300€", emoji:"🎭", img:"https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&h=220&fit=crop&q=80", amazon:"samtvorhang velvet dunkel bodenlang ösenvorhang" },
  { cat:"Wohnzimmer", title:"Galerien-Wand Gallery Wall", desc:"5–9 Bilder in verschiedenen Größen als Wand-Arrangement. Vorher auf dem Boden layouten, dann mit Wasserwaage aufhängen.", how:"DIY", budget:"50–200€", emoji:"🖼️", img:"https://images.unsplash.com/photo-1565183928294-7063f23ce0f8?w=600&h=220&fit=crop&q=80", amazon:"bilderrahmen set gallery wall galerie wand" },
  { cat:"Wohnzimmer", title:"Stein-Optik Akzentwand", desc:"Leichte 3D-Wandpaneele in Naturstein-Optik (Kalkstein, Schiefer). Kleben, keine Dübel. Kamin oder TV-Wand.", how:"DIY – 2 Stunden", budget:"30–80€/m²", emoji:"🪨", img:"https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=600&h=220&fit=crop&q=80", amazon:"wandpaneele steinoptik 3d kalkstein schiefer" },

  // ── SCHLAFZIMMER (12) ─────────────────────────────────────────────────────────
  { cat:"Schlafzimmer", title:"Bouclé Kopfteil Selbst gemacht", desc:"MDF (OBI auf Maß) + Schaumstoff 5cm RG35 + Bouclé tackern. Hotel-Feeling für 150€. Wand dahinter in Terrakotta.", how:"DIY – 4h", budget:"80–200€", emoji:"🛏️", img:"https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?w=600&h=220&fit=crop&q=80", amazon:"bouclé stoff creme polster kopfteil meterware" },
  { cat:"Schlafzimmer", title:"Nachtblau Decke", desc:"Nur die Decke in Hague Blue oder Nachtblau. Wände weiß. Geborgenheitsgefühl wie unter dem Sternenhimmel.", how:"DIY – 3h", budget:"25–60€", emoji:"🌙", img:"https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=220&fit=crop&q=80", amazon:"wandfarbe nachtblau decke matt dunkel" },
  { cat:"Schlafzimmer", title:"Wandleuchten Gelenkarm", desc:"Beidseitig neben dem Bett, 2200K, Stecker-Version = kein Elektriker. Messing oder Mattschwarz. Tischlampen ersetzen.", how:"DIY – 30 Min", budget:"60–250€", emoji:"💡", img:"https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=600&h=220&fit=crop&q=80", amazon:"wandleuchte gelenkarm bett messing leselampe" },
  { cat:"Schlafzimmer", title:"Japandi Schlafzimmer", desc:"Holzlatten vertikal an der Wand, niedriges Plattform-Bett, Greige-Töne, ein großer Ast als Deko. Zen pur.", how:"DIY – 1 Tag", budget:"100–400€", emoji:"🎋", img:"https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600&h=220&fit=crop&q=80", amazon:"japandi schlafzimmer holzlatten niedrig bett" },
  { cat:"Schlafzimmer", title:"Begehbarer Kleiderschrank", desc:"Aus einer Ecke oder kleinem Zimmer einen Walk-in-Closet bauen. Pax-System IKEA oder Maßanfertigung. Traumziel vieler.", how:"Wochenende", budget:"400–2.000€", emoji:"👗", img:"https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?w=600&h=220&fit=crop&q=80", amazon:"begehbarer kleiderschrank system einbau pax" },
  { cat:"Schlafzimmer", title:"Leinenbettwäsche & Schichten", desc:"Qualitäts-Leinenbettwäsche + Baumwolldecken + Wurfkissen in 3 Tönen. Hotel-Feeling ohne Umbau.", how:"Sofort", budget:"80–250€", emoji:"🛌", img:"https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=220&fit=crop&q=80", amazon:"leinen bettwäsche natürlich gewaschener leinen" },
  { cat:"Schlafzimmer", title:"Dunkles Luxus Schlafzimmer", desc:"Charcoal-Wände, Messingakzente, samtiger Teppich, bodenlange Vorhänge. Moodylooks sind Trend 2026.", how:"Streichen + Kaufen", budget:"200–800€", emoji:"🌑", img:"https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600&h=220&fit=crop&q=80", amazon:"wandfarbe dunkel anthrazit schlafzimmer samt teppich" },
  { cat:"Schlafzimmer", title:"Verdunkelungsrollos Kassette", desc:"Kassetten-Rollo direkt am Fensterflügel – komplett dunkel auch im Sommer. Entscheidend für Schlafqualität.", how:"DIY – 30 Min", budget:"30–120€", emoji:"🌚", img:"https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=600&h=220&fit=crop&q=80", amazon:"verdunklungsrollo kassette klebemontage" },
  { cat:"Schlafzimmer", title:"Terrakotta Akzentwand Bett", desc:"Nur die Wand hinter dem Bett in Terrakotta (Alpina Florentiner Erde). Rest weiß. Bouclé-Kissen ergänzen.", how:"DIY – 2h", budget:"20–45€", emoji:"🔶", img:"https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?w=600&h=220&fit=crop&q=80", amazon:"wandfarbe terrakotta alpina florentiner erde" },
  { cat:"Schlafzimmer", title:"Holz-Bettkopfteil Naturholz", desc:"Massivholz-Kopfteil aus roher Eiche oder Nussbaum. Organische Form, kein Schleifen nötig. Charaktervoll.", how:"Kauf/DIY", budget:"150–600€", emoji:"🌲", img:"https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=220&fit=crop&q=80", amazon:"kopfteil massivholz eiche nussbaum bett" },
  { cat:"Schlafzimmer", title:"Einbauschrank mit Schiebetür", desc:"Rahmenlose Schiebetür mit Spiegelfläche = Raum wirkt doppelt so groß. Profil in Mattschwarz oder Weiß.", how:"Tischler", budget:"800–3.000€", emoji:"🪞", img:"https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600&h=220&fit=crop&q=80", amazon:"schiebetür spiegel einbauschrank rahmenlos" },
  { cat:"Schlafzimmer", title:"Nachttisch floating Wandmontage", desc:"Schwebender Nachttisch direkt an der Wand – kein Beingestell, minimalistisch, pflegeleicht. Eiche oder Weiß.", how:"DIY – 1h", budget:"60–250€", emoji:"🛋️", img:"https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=600&h=220&fit=crop&q=80", amazon:"nachttisch wandmontage schwebend eiche weiß" },

  // ── ESSZIMMER (8) ─────────────────────────────────────────────────────────────
  { cat:"Esszimmer", title:"Esstisch Massivholz mit Stahl", desc:"Eiche-Platte auf schwarzen Stahlbeinen = Industrie-Look. 220cm für 8 Personen. Robuest, kratzfest, zeitlos.", how:"Kauf", budget:"500–2.000€", emoji:"🍽️", img:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=220&fit=crop&q=80", amazon:"esstisch massivholz eiche stahl beine industrial" },
  { cat:"Esszimmer", title:"Pendelleuchten über Tisch", desc:"3 Kugel-Pendel oder 1 länglicher Linear-Stab über dem Tisch. Abstand 65–75cm zur Tischfläche. Warm 2700K.", how:"Elektriker", budget:"100–800€", emoji:"💡", img:"https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=600&h=220&fit=crop&q=80", amazon:"pendelleuchte esstisch linear set gold 3er" },
  { cat:"Esszimmer", title:"Bank + Stuhl Kombi", desc:"Eine Seite Sitzbank, andere Seite Stühle = gemütlicher und platzsparender. Bank aus Holz oder gepolstert.", how:"Kauf", budget:"300–1.200€", emoji:"🪑", img:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=220&fit=crop&q=80", amazon:"sitzbank esstisch holz eiche gepolstert" },
  { cat:"Esszimmer", title:"Grüne Pflanzenwand Esszimmer", desc:"Vertikales Pflanzenbild als lebendige Tapete. Oder einfach 3 große Töpfe in der Ecke. Bringt Leben in den Raum.", how:"Sofort", budget:"50–300€", emoji:"🌱", img:"https://images.unsplash.com/photo-1416879595882-b3d065a0e45d?w=600&h=220&fit=crop&q=80", amazon:"pflanzenwand vertikal indoor esszimmer" },
  { cat:"Esszimmer", title:"Marmor-Tisch Statement", desc:"Echter Calacatta-Marmor oder günstige Variante aus Feinsteinzeug. Rechteckig oder oval. Kombination mit Leder-Stühlen.", how:"Kauf", budget:"600–3.000€", emoji:"💎", img:"https://images.unsplash.com/photo-1556909211-36987e6e9a65?w=600&h=220&fit=crop&q=80", amazon:"esstisch marmor oval weiß calacatta" },
  { cat:"Esszimmer", title:"Holzvertäfelung Esszimmer Wand", desc:"Fluted Wood Panels oder einfache Kieferleisten vertikal. Naturfarbe ölen oder weiß lackieren. Wärmt jeden Raum.", how:"DIY – Wochenende", budget:"100–400€", emoji:"🪵", img:"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=220&fit=crop&q=80", amazon:"holzleisten vertikal wand esszimmer fluted" },
  { cat:"Esszimmer", title:"Velvet-Stühle bunt als Akzent", desc:"Samtene Stühle in Senfgelb, Dunkelgrün oder Terrakotta zu einem schlichten Tisch. Ein Farbakzent reicht.", how:"Kauf", budget:"200–800€", emoji:"🪑", img:"https://images.unsplash.com/photo-1549187774-b4e9b0445b41?w=600&h=220&fit=crop&q=80", amazon:"velvet stuhl samt esszimmer grün terrakotta" },
  { cat:"Esszimmer", title:"Offenes Weinregal als Raumteiler", desc:"Streckenmetall- oder Holzregal teilt Wohn- und Essbereich optisch ohne Wände. Weinflaschen als Deko.", how:"DIY/Kauf", budget:"150–600€", emoji:"🍷", img:"https://images.unsplash.com/photo-1558618049-6b1cdd80a2e2?w=600&h=220&fit=crop&q=80", amazon:"weinregal wand raumteiler offen holz metall" },

  // ── FLUR & EINGANG (8) ───────────────────────────────────────────────────────
  { cat:"Flur", title:"Dunkler Flur Dramatisch", desc:"Flur komplett dunkel streichen (Anthrazit oder Nachtblau). Heller Boden = Drama-Effekt. Wandspiegel macht ihn größer.", how:"DIY – 2h", budget:"25–60€", emoji:"🚪", img:"https://images.unsplash.com/photo-1558882224-dda166733046?w=600&h=220&fit=crop&q=80", amazon:"wandfarbe anthrazit flur matt dunkel" },
  { cat:"Flur", title:"Rundspiegel als Statement", desc:"Großer runder Spiegel (80–100cm) macht den Flur sofort größer. Messing oder Mattschwarz Rahmen.", how:"Aufhängen", budget:"80–400€", emoji:"🪞", img:"https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=600&h=220&fit=crop&q=80", amazon:"rundspiegel groß messing flur eingang 80cm" },
  { cat:"Flur", title:"Eingang Garderobenleiste Holz", desc:"Massivholz-Brett mit Eisen-Haken – schlicht und funktional. Alternativ: IKEA Brimnes oder Selbstbau aus Treibholz.", how:"DIY – 1h", budget:"30–150€", emoji:"🧥", img:"https://images.unsplash.com/photo-1600210492493-0946911123ea?w=600&h=220&fit=crop&q=80", amazon:"garderobenleiste holz massiv mit haken flur" },
  { cat:"Flur", title:"Fischgrät Fliesenboden Eingang", desc:"Klassischer Fischgrät-Boden in Schwarz-Weiß oder Terrakotta für den Eingang. Zeitlos und wertsteigernd.", how:"Fliesenleger", budget:"35–70€/m²", emoji:"♟️", img:"https://images.unsplash.com/photo-1574739782594-db4ead022697?w=600&h=220&fit=crop&q=80", amazon:"fischgrät fliesen eingang schwarz weiß terrakotta" },
  { cat:"Flur", title:"Tapete als Hingucker Flur", desc:"Botanische oder geometrische Tapete nur an einer Wand = Kunstwerk. Flur wird zum ersten Eindruck der wow-macht.", how:"DIY – 2h", budget:"50–200€", emoji:"🌺", img:"https://images.unsplash.com/photo-1558882224-dda166733046?w=600&h=220&fit=crop&q=80", amazon:"tapete botanisch flur eingang hingucker" },
  { cat:"Flur", title:"Sitzbank Schuhregal Kombi", desc:"Eingangssitzbank mit Schuhaufbewahrung darunter und Haken darüber. IKEA Hemnes Hack oder Selbstbau.", how:"IKEA/DIY", budget:"100–400€", emoji:"👟", img:"https://images.unsplash.com/photo-1600147831337-1f7ea73a3e40?w=600&h=220&fit=crop&q=80", amazon:"eingangssitzbank schuhregal mit haken" },
  { cat:"Flur", title:"Beleuchtung Sockelleisten LED", desc:"LED-Streifen in der Sockelleiste oder an der Decke = Orientierungslicht nachts ohne Schalter. Bewegungssensor.", how:"DIY", budget:"30–80€", emoji:"🔆", img:"https://images.unsplash.com/photo-1600210492493-0946911123ea?w=600&h=220&fit=crop&q=80", amazon:"led sockelleiste flur orientierungslicht bewegungssensor" },
  { cat:"Flur", title:"Pflanzentisch Eingang Konsolenset", desc:"Schlanker Konsolentisch mit einer Pflanze, Spiegel darüber und Tablett für Schlüssel. Erster Eindruck zählt.", how:"Sofort", budget:"80–300€", emoji:"🌿", img:"https://images.unsplash.com/photo-1416879595882-b3d065a0e45d?w=600&h=220&fit=crop&q=80", amazon:"konsolentisch schmal flur mit spiegel set" },

  // ── HOMEOFFICE (7) ────────────────────────────────────────────────────────────
  { cat:"Homeoffice", title:"Einbau-Schreibtisch an der Wand", desc:"Schwimmendes Schreibtischbrett aus Eiche oder MDF – 180cm breit, 60cm tief. Kein Gestell, mehr Platz, cleaner Look.", how:"DIY – 2h", budget:"80–250€", emoji:"💻", img:"https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&h=220&fit=crop&q=80", amazon:"schreibtisch wandmontage schwebend eiche" },
  { cat:"Homeoffice", title:"Bücherregal als Hintergrund", desc:"Vollgepacktes Bücherregal als Zoom-Hintergrund macht Eindruck. Einbau-Billy-Hack oder Maßregal.", how:"IKEA/Tischler", budget:"200–800€", emoji:"📚", img:"https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&h=220&fit=crop&q=80", amazon:"büchterregal einbau wand homeoffice" },
  { cat:"Homeoffice", title:"Akustikpaneele Filz", desc:"Filz- oder Schaumstoff-Akustikpaneele reduzieren Echo deutlich – wichtig für Videokonferenzen. Auch dekorativ.", how:"DIY – 1h", budget:"50–200€", emoji:"🎵", img:"https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=220&fit=crop&q=80", amazon:"akustikpaneele filz homeoffice schall" },
  { cat:"Homeoffice", title:"Pegboard Wand Organizer", desc:"Lochplatten-System für Werkzeuge, Stifte, Notizen. Ikea Skadis oder individuell. Flexibel und dekorativ.", how:"DIY – 1h", budget:"30–100€", emoji:"📌", img:"https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&h=220&fit=crop&q=80", amazon:"pegboard lochplatte organizer büro wand" },
  { cat:"Homeoffice", title:"Grüne Pflanzenwand hinter Schreibtisch", desc:"Eine echte Pflanzenwand oder Kunstpflanzenwand als Hintergrund. Reduziert Stress, verbessert Luftqualität.", how:"DIY/Kauf", budget:"100–500€", emoji:"🌿", img:"https://images.unsplash.com/photo-1416879595882-b3d065a0e45d?w=600&h=220&fit=crop&q=80", amazon:"pflanzenwand vertikal homeoffice kunstpflanze" },

  // ── BODEN (8) ─────────────────────────────────────────────────────────────────
  { cat:"Boden", title:"SPC-Vinyl Über Fliesen", desc:"100% wasserfest, Klick-System über alte Fliesen. Kein Stemmen, kein Kleber. Fertig an einem Tag.", how:"DIY – 1 Tag", budget:"15–35€/m²", emoji:"🪵", img:"https://images.unsplash.com/photo-1574739782594-db4ead022697?w=600&h=220&fit=crop&q=80", amazon:"spc vinyl klick wasserfest über fliesen" },
  { cat:"Boden", title:"Fischgrät-Eichenparkett", desc:"Dielen in Fischgrät-Muster – eleganteste Verlegeart. Eiche geölt 12cm Breite. Wertsteigernd.", how:"DIY/Profi", budget:"40–80€/m²", emoji:"⬛", img:"https://images.unsplash.com/photo-1562663474-6cbb3eaa4d14?w=600&h=220&fit=crop&q=80", amazon:"fertigparkett eiche fischgrät verlegen" },
  { cat:"Boden", title:"Epoxidharz Betonoptik", desc:"Fugenloser Industrieboden über altem Belag. Sehr robust, ideal für Küche und Flur. Vorbereitung ist alles.", how:"Fortgeschritten", budget:"20–50€/m²", emoji:"🔘", img:"https://images.unsplash.com/photo-1574739782594-db4ead022697?w=600&h=220&fit=crop&q=80", amazon:"epoxidharz boden betonoptik set self leveling" },
  { cat:"Boden", title:"Terrakotta Fliesen mediterran", desc:"Handgefertigte Terrakotta-Bodenfliesen – warm, mediterran, zeitlos. Muss versiegelt werden.", how:"Fliesenleger", budget:"20–60€/m²", emoji:"🔶", img:"https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&h=220&fit=crop&q=80", amazon:"terrakotta fliesen handgemacht boden mediterran" },
  { cat:"Boden", title:"Zementfliesen Vintage Muster", desc:"Bunte Musterfliesen in Schwarz-Weiß oder Bunt. Für Küche, Bad oder Flur. Über alte Fliesen möglich.", how:"Fliesenleger", budget:"30–80€/m²", emoji:"🎨", img:"https://images.unsplash.com/photo-1574739782594-db4ead022697?w=600&h=220&fit=crop&q=80", amazon:"zementfliesen muster vintage bunt schwarz weiß" },
  { cat:"Boden", title:"Teppich als Raumteiler", desc:"Großer Teppich (300×400) definiert den Sitzbereich. Jute, Wolle oder Outdoor-Teppich. Alle Möbelbeine drauf.", how:"Legen", budget:"80–600€", emoji:"🟫", img:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=220&fit=crop&q=80", amazon:"großer teppich wohnzimmer jute wolle 300x400" },
  { cat:"Boden", title:"Dunkler Holzboden Drama", desc:"Dunkles Eichenparkett (Räuchereiche, Nussbaum) + helle Wände = maximaler Kontrast-Effekt.", how:"Verlegen", budget:"45–100€/m²", emoji:"⬛", img:"https://images.unsplash.com/photo-1562663474-6cbb3eaa4d14?w=600&h=220&fit=crop&q=80", amazon:"räuchereiche parkett dunkel holzboden verlegen" },
  { cat:"Boden", title:"Weißer Marmorboden Luxus", desc:"Weiße Großformat-Marmorfliesen oder -Optik. Macht Räume größer und heller. Pflegeleichter Feinsteinzeug statt echter Marmor.", how:"Fliesenleger", budget:"40–120€/m²", emoji:"🤍", img:"https://images.unsplash.com/photo-1574739782594-db4ead022697?w=600&h=220&fit=crop&q=80", amazon:"marmor fliesen weiß groß format luxus" },

  // ── TERRASSE & GARTEN (12) ────────────────────────────────────────────────────
  { cat:"Terrasse", title:"WPC-Dielen mit Clips", desc:"Wartungsfreie WPC-Dielen auf Stelzlagern. Clip-Befestigung unsichtbar. Über Beton direkt verlegbar.", how:"DIY – Wochenende", budget:"35–65€/m²", emoji:"🌴", img:"https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=600&h=220&fit=crop&q=80", amazon:"wpc dielen terrasse clips stelzlager" },
  { cat:"Terrasse", title:"Outdoor-Lounge Polyrattan", desc:"Modulare Polyrattan-Lounge mit Sunbrella-Kissen. UV-beständig, wetterfest. Outdoor-Teppich als Basis.", how:"Aufbau", budget:"400–1.500€", emoji:"☀️", img:"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=220&fit=crop&q=80", amazon:"outdoor lounge polyrattan sunbrella terrasse" },
  { cat:"Terrasse", title:"Pergola Douglasie Selbstbau", desc:"Freistehende Pergola aus Douglasie – wetterfest ohne Imprägnierung. Mit Rankpflanzen begrünen.", how:"Wochenende", budget:"400–1.500€", emoji:"🌿", img:"https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600&h=220&fit=crop&q=80", amazon:"pergola bausatz douglasie selbstbau garten" },
  { cat:"Terrasse", title:"Eingebauter Gasgrill Outdoor", desc:"Modulare Außenküche mit Gasgrill eingebaut, Arbeitsfläche Feinsteinzeug. Das Upgrade für gesellige Abende.", how:"Profi", budget:"1.000–5.000€", emoji:"🔥", img:"https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=220&fit=crop&q=80", amazon:"aussenküche gasgrill einbau outdoor garten" },
  { cat:"Terrasse", title:"Mediterrane Olivenbaum-Oase", desc:"Olivenbäume in Terrakotta-Töpfen, Lavendel als Sichtschutz, Rankrosen. Kein Handwerker nötig.", how:"Sofort", budget:"200–600€", emoji:"🫒", img:"https://images.unsplash.com/photo-1558882224-dda166733046?w=600&h=220&fit=crop&q=80", amazon:"olivenbaum terrasse terrakotta topf groß" },
  { cat:"Terrasse", title:"Solar Lichterketten 2200K", desc:"Warmweiße Solar-Lichterketten über der Terrasse. Kein Kabel, kein Strom. Automatisch an/aus. 10m ab 20€.", how:"Aufhängen", budget:"20–80€", emoji:"✨", img:"https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=600&h=220&fit=crop&q=80", amazon:"solar lichterkette 2200k warmweiß außen" },
  { cat:"Terrasse", title:"Bambussichtschutz & Privatsphäre", desc:"Bambus-Sichtschutz-Matten auf dem Zaun = sofortige Privatsphäre. 3 Matten = ca. 45€. Natürlicher Look.", how:"30 Min", budget:"30–80€", emoji:"🎋", img:"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=220&fit=crop&q=80", amazon:"bambussichtschutz balkon terrasse zaun" },
  { cat:"Terrasse", title:"Outdoor-Teppich als Basis", desc:"Outdoor-Teppich unter der Lounge-Gruppe definiert den Bereich und macht ihn gemütlicher. UV-beständig, waschbar.", how:"Legen", budget:"50–300€", emoji:"🟫", img:"https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600&h=220&fit=crop&q=80", amazon:"outdoor teppich terrasse wetterfest uv" },
  { cat:"Terrasse", title:"Hochbeet Gemüse & Kräuter", desc:"Hochbeet aus Lärchenholz – Gemüse auf kleinstem Raum. Kein Bücken. Füllung: Erde + Kompost 40:60.", how:"DIY – 2h", budget:"80–300€", emoji:"🌱", img:"https://images.unsplash.com/photo-1416879595882-b3d065a0e45d?w=600&h=220&fit=crop&q=80", amazon:"hochbeet holz lärche garten terrasse" },
  { cat:"Terrasse", title:"Poolbereich Lounge Aufblasbar", desc:"Aufblasbarer Pool ab 50€ + Lounge daneben + Sonnensegel = Urlaub zuhause. Für Kinder und Erwachsene.", how:"Aufbauen", budget:"100–500€", emoji:"💦", img:"https://images.unsplash.com/photo-1558905923-6fe62de33bc3?w=600&h=220&fit=crop&q=80", amazon:"aufblasbarer pool terrasse sonnensegel" },
  { cat:"Terrasse", title:"Balkon DIY Stadtgarten", desc:"Auf 6m² alles möglich: Sichtschutz, 1 Stuhl + Tisch, 3 Töpfe. Wandregale für Pflanzen nutzen.", how:"1 Tag", budget:"100–300€", emoji:"🌇", img:"https://images.unsplash.com/photo-1416879595882-b3d065a0e45d?w=600&h=220&fit=crop&q=80", amazon:"balkon sichtschutz stadtgarten topfpflanzen" },
  { cat:"Terrasse", title:"Feuerkorb & Abendatmosphäre", desc:"Gusseiserner Feuerkorb oder Feuerschale + Terracotta-Schüssel mit Bio-Ethanol. Lager-Feuer-Feeling.", how:"Kauf", budget:"50–300€", emoji:"🔥", img:"https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=600&h=220&fit=crop&q=80", amazon:"feuerkorb gusseisen terrasse outdoor feuerschale" },
];

const KATEGORIEN = ["Alle", "Bad", "Küche", "Wohnzimmer", "Schlafzimmer", "Esszimmer", "Flur", "Homeoffice", "Boden", "Terrasse"];

function IdeenTab() {
  const [kat, setKat] = useState("Alle");
  const [openTrend, setOpenTrend] = useState(null);
  const gefiltert = kat === "Alle" ? TRENDS : TRENDS.filter(t => t.cat === kat);

  return (
    <div style={{ overflowY:"auto", height:"100%" }}>
      {/* Filter */}
      <div style={{ padding:"14px 16px 10px", position:"sticky", top:0, background:C.bg, zIndex:10, borderBottom:`1px solid ${C.border}` }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, marginBottom:10 }}>Ideen & Trends 2026</h2>
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
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:C.text }}>Mystorija upgraden</h2>
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
  const [subscription, setSubscription] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  // Service Worker + PWA Install
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); setShowInstall(true); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  const [freeUsed, setFreeUsed] = useState(0);
  const [chatMessages, setChatMessages] = useState([{
    role:"assistant",
    text:"Hey! 👋 Ich bin dein persönlicher Renovierungsexperte – frag mich alles über Bad, Küche, Wohnzimmer, Boden, Licht und mehr.\n\nIch gebe dir **konkrete Antworten** mit Produktnamen, Preisen und Schritt-für-Schritt Anleitungen. Oder lade ein 📷 Foto hoch und ich analysiere deinen Raum sofort!",
  }]);

  useEffect(() => {
    // Onboarding
    try { if (!localStorage.getItem("mystorija_onboarding_done")) setShowOnboarding(true); } catch {}

    // Free usage counter
    try { setFreeUsed(parseInt(localStorage.getItem("mystorija_free_used") || "0")); } catch {}

    // Subscription aus localStorage
    try {
      const saved = localStorage.getItem("mystorija_subscription");
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
            localStorage.removeItem("mystorija_subscription");
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
      try { localStorage.setItem("mystorija_subscription", JSON.stringify(sub)); } catch {}
      // URL säubern
      window.history.replaceState({}, "", "/");
      setShowPricing(false);
    }
  }, []);

  function finishOnboarding() {
    setShowOnboarding(false);
    try { localStorage.setItem("mystorija_onboarding_done", "1"); } catch {}
  }

  function incrementFreeUsed() {
    const next = freeUsed + 1;
    setFreeUsed(next);
    try { localStorage.setItem("mystorija_free_used", String(next)); } catch {}
  }

  function canGenerate() {
    return true; // Kein Limit – Paywall später via Stripe
  }

  const planLabel = subscription?.plan === "pro" ? "Pro ⭐" : subscription?.plan === "basic" ? "Basic" : null;

  return (
    <>
      {showOnboarding && <Onboarding onDone={finishOnboarding} />}
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} freeUsed={freeUsed} />}
      <Head>
        <title>Mystorija – KI-Renovierung & Inspo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="description" content="Mystorija – KI-Renovierung, Inspiration & DIY-Anleitungen für dein Zuhause" />
        <meta name="theme-color" content="#C4622D" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Mystorija" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <style dangerouslySetInnerHTML={{ __html:globalCSS }} />
      </Head>
      <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:C.bg, maxWidth:600, margin:"0 auto" }}>
        <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"13px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700 }}>My<span style={{ color:C.accent }}>storija</span></span>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {showInstall && (
              <button onClick={async () => { if (installPrompt) { installPrompt.prompt(); const r = await installPrompt.userChoice; if (r.outcome==="accepted") setShowInstall(false); }}} style={{ fontSize:11, color:C.green, fontWeight:700, background:C.greenBg, padding:"5px 10px", borderRadius:20, border:`1px solid ${C.green}33`, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                📲 Installieren
              </button>
            )}
            {planLabel ? (
              <span style={{ fontSize:12, color:C.accent, fontWeight:700, background:C.accentBg, padding:"4px 10px", borderRadius:20 }}>{planLabel}</span>
            ) : (
              <button onClick={() => setShowPricing(true)} style={{ fontSize:12, color:"white", fontWeight:700, background:C.accent, padding:"5px 12px", borderRadius:20, border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                Upgrade ✨
              </button>
            )}
            
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
        <div style={{ background:C.card, borderTop:`1px solid ${C.border}`, display:"grid", gridTemplateColumns:"repeat(7, 1fr)", flexShrink:0, overflowX:"auto" }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ background:"none", border:"none", cursor:"pointer", padding:"7px 1px 10px", display:"flex", flexDirection:"column", alignItems:"center", gap:2, borderTop:`2.5px solid ${activeTab===tab.id?C.accent:"transparent"}`, transition:"border-color 0.2s", minWidth:0 }}>
              <span style={{ fontSize:17 }}>{tab.icon}</span>
              <span style={{ fontSize:9, fontWeight:600, color:activeTab===tab.id?C.accent:C.muted, fontFamily:"'DM Sans',sans-serif", whiteSpace:"nowrap" }}>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
