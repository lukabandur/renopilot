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

// ─── ANLEITUNGEN TAB ──────────────────────────────────────────────────────────
function AnleitungenTab() {
  const [offen, setOffen] = useState(null);
  const [erledigt, setErledigt] = useState({});
  return (
    <div style={{ overflowY:"auto", height:"100%", padding:"14px 16px" }}>
      <p style={{ fontSize:12, color:C.muted, marginBottom:14, fontStyle:"italic" }}>
        Profi-Anleitungen aus Handwerker-Videos – Schritte während der Arbeit abhaken ({ANLEITUNGEN.length} Anleitungen)
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
                    <div key={idx} onClick={() => setErledigt(prev => ({ ...prev, [key]:!prev[key] }))} style={{ display:"flex", gap:10, padding:"9px 11px", borderRadius:9, marginBottom:4, cursor:"pointer", background:d?C.greenBg:C.accentBg+"44", border:`1px solid ${d?C.green+"44":C.border}` }}>
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
function MakeoverTab({ onSaveToPlaner, savedMakeovers }) {
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
  const [chatOpen, setChatOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewingHistory, setViewingHistory] = useState(null);

  function handleDatei(e) {
    const f = e.target.files[0]; if (!f) return;
    setFile(f); setVorherUrl(URL.createObjectURL(f));
    setNachherUrl(null); setMaterials(null); setError(null); setSaved(false); setViewingHistory(null);
  }

  const [refinementInput, setRefinementInput] = useState("");
  const [refining, setRefining] = useState(false);
  const [refinementHistory, setRefinementHistory] = useState([]); // [{url, instruction}]

  async function refineMakeover() {
    if (!refinementInput.trim() || !nachherUrl) return;
    const instruction = refinementInput;
    setRefinementInput("");
    setRefining(true);

    // Add current image to history
    setRefinementHistory(prev => [...prev, { url: nachherUrl, instruction }]);

    // Fetch the current generated image and convert to base64
    try {
      const imgRes = await fetch(nachherUrl);
      const blob = await imgRes.blob();
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.readAsDataURL(blob);
      });

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          style: stil,
          chatContext: instruction,
        }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setNachherUrl(data.imageUrl);
        if (data.materials) setMaterials(data.materials);
        setSaved(false);
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
    setViewingHistory(null); setLoading(true); setNachherUrl(null); setMaterials(null);
    setError(null); setProgress(0); setSaved(false);
    const timer = setInterval(() => setProgress(p => p < 85 ? p + 2 : p), 600);
    compressImageFile(file).then(base64 =>
      fetch("/api/generate", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ imageBase64:base64, style:stil, chatContext:wunsch||null }),
      })
    ).then(res => res.json())
    .then(data => {
      clearInterval(timer);
      if (data.error) { setError(data.error); setLoading(false); return; }
      setProgress(100); setNachherUrl(data.imageUrl); setMaterials(data.materials||null); setLoading(false);
    }).catch(err => { clearInterval(timer); setError(err.message); setLoading(false); });
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
            {/* Wunsch */}
            <div style={{ marginBottom:16 }}>
              <button onClick={() => setChatOpen(!chatOpen)} style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:`1px solid ${wunsch?C.accent:C.border}`, background:wunsch?"#FFF0E8":C.card, color:wunsch?C.accent:C.muted, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span>{wunsch ? `Wunsch: ${wunsch.slice(0,30)}${wunsch.length>30?"...":""}` : "Wünsche beschreiben (optional)"}</span>
                <span>{chatOpen ? "Schließen" : "Bearbeiten"}</span>
              </button>
              {chatOpen && (
                <div style={{ border:`1px solid ${C.border}`, borderTop:"none", borderRadius:"0 0 10px 10px", padding:"10px 12px", background:C.card }}>
                  <textarea value={wunsch} onChange={e => setWunsch(e.target.value)} placeholder="z.B. Keine Badewanne, dunkle Fliesen, Walk-In Dusche..." rows={3} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", fontSize:13, resize:"none", fontFamily:"'DM Sans',sans-serif", background:C.bg }} />
                  <p style={{ fontSize:11, color:C.muted, marginTop:6 }}>Die KI berücksichtigt deine Wünsche beim Generieren</p>
                </div>
              )}
            </div>

            {/* Stil */}
            <p style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>Stil</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:18 }}>
              {STILE_MAKEOVER.map(s => (
                <button key={s.id} onClick={() => setStil(s.id)} style={{ padding:"8px 10px", borderRadius:10, cursor:"pointer", textAlign:"left", border:`2px solid ${stil===s.id?C.accent:C.border}`, background:stil===s.id?C.accentBg:C.card, color:stil===s.id?C.accent:C.text, fontSize:12, fontWeight:stil===s.id?600:400, fontFamily:"'DM Sans',sans-serif" }}>{s.label}</button>
              ))}
            </div>

            {/* Upload */}
            <div onClick={() => fileRef.current.click()} style={{ border:`2px dashed ${vorherUrl?C.accent:C.border}`, borderRadius:16, overflow:"hidden", padding:vorherUrl?0:"32px 20px", textAlign:"center", cursor:"pointer", background:vorherUrl?"transparent":C.card, marginBottom:12 }}>
              {vorherUrl ? <img src={vorherUrl} alt="Vorher" style={{ width:"100%", display:"block", maxHeight:260, objectFit:"cover" }} /> :
                <div><p style={{ fontSize:36, marginBottom:8 }}>📷</p><p style={{ fontWeight:600, fontSize:15, color:C.text, marginBottom:4 }}>Foto hochladen</p><p style={{ fontSize:13, color:C.muted }}>Bad, Küche, Wohnzimmer...</p></div>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleDatei} />

            {vorherUrl && (
              <button onClick={generieren} disabled={loading} style={{ width:"100%", padding:15, marginBottom:12, background:loading?"#DDD":"linear-gradient(135deg, #C4622D, #A0522D)", color:loading?"#999":"white", border:"none", borderRadius:50, fontSize:15, fontWeight:700, cursor:loading?"default":"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                {loading ? "KI generiert Bild..." : "✨ Makeover generieren"}
              </button>
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
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);

  async function sendMessage() {
    const text = inputText.trim(); if (!text || loading) return;
    const userMsg = { role:"user", text };
    setMessages(prev => [...prev, userMsg]); setInputText(""); setLoading(true);
    const allMsgs = [...messages, userMsg];
    const firstUser = allMsgs.findIndex(m => m.role === "user");
    const apiMessages = allMsgs.slice(firstUser).map(m => ({ role:m.role, content:m.text }));
    try {
      const res = await fetch("/api/chat", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ messages:apiMessages }) });
      const data = await res.json();
      const reply = data?.reply;
      if (reply) { setMessages(prev => [...prev, { role:"assistant", text:reply }]); }
      else throw new Error("Keine Antwort");
    } catch {
      const offline = getRenovierungsAntwort(text, false);
      setMessages(prev => [...prev, { role:"assistant", text:offline }]);
    }
    setLoading(false);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <div style={{ flex:1, overflowY:"auto", padding:"16px 16px 8px" }}>
        {messages.map((msg, i) => (
          <div key={i} className="fu" style={{ display:"flex", justifyContent:msg.role==="user"?"flex-end":"flex-start", marginBottom:14, gap:8, alignItems:"flex-end" }}>
            {msg.role==="assistant" && <div style={{ width:30, height:30, background:C.accent, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>🔨</div>}
            <div style={{ maxWidth:"85%" }}>
              <div style={{ background:msg.role==="user"?C.accent:C.card, color:msg.role==="user"?"#fff":C.text, border:msg.role==="assistant"?`1px solid ${C.border}`:"none", borderRadius:msg.role==="user"?"16px 16px 3px 16px":"16px 16px 16px 3px", padding:"11px 15px", fontSize:14, lineHeight:1.65 }}>
                {msg.role === "user" ? msg.text : renderChatText(msg.text)}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:14 }}>
            <div style={{ width:30, height:30, background:C.accent, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>🔨</div>
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"16px 16px 16px 3px", padding:"12px 16px", display:"flex", gap:5 }}>
              {[0,1,2].map(j => <div key={j} style={{ width:6, height:6, borderRadius:"50%", background:C.muted, animation:`blink 1.2s ease ${j*0.2}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding:"8px 14px 14px", borderTop:`1px solid ${C.border}`, background:C.card }}>
        <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
          <textarea value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();} }} placeholder="Frag mich alles über Renovierung…" rows={2} style={{ flex:1, resize:"none", border:`2px solid ${C.border}`, borderRadius:12, padding:"9px 13px", fontSize:14, fontFamily:"'DM Sans',sans-serif", background:C.bg, lineHeight:1.5 }} />
          <button onClick={sendMessage} disabled={loading||!inputText.trim()} style={{ width:42, height:42, borderRadius:12, flexShrink:0, background:loading||!inputText.trim()?C.border:C.accent, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:18 }}>
            {loading ? <LoadingSpinner size={18} /> : "→"}
          </button>
        </div>
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

// ─── PLANER TAB ───────────────────────────────────────────────────────────────
const PROJECT_TEMPLATES = [
  { name:"Bad Upgrade", icon:"🚿", steps:["Altes Silikon ablösen","Wand entfetten","Neues Bad-Silikon ziehen","24h trocknen","Spiegel tauschen","Armaturen tauschen"] },
  { name:"Boden verlegen", icon:"🪟", steps:["Untergrund reinigen","Unterlage auslegen","Vinyl einrasten","Randstücke schneiden","Sockelleisten montieren"] },
  { name:"Küche aufwerten", icon:"🍳", steps:["Fronten entfetten","Griffe tauschen","Schleifen + Haftgrund","Lackieren","LED-Strip kleben"] },
  { name:"Terrasse aufwerten", icon:"🌿", steps:["Boden reinigen","Klick-Fliesen legen","Sichtschutz montieren","Kissen aufstellen","Lichterketten hängen"] },
];

function PlanerTab({ savedMakeovers }) {
  const [projects, setProjects] = useState([{ id:1, name:"Mein erstes Projekt", icon:"🏠", steps:[{text:"Raumgröße ausmessen",done:false},{text:"Material bestellen",done:false},{text:"Loslegen!",done:false}] }]);
  const [openProject, setOpenProject] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState(""); const [newIcon, setNewIcon] = useState("🏠");
  const [newSteps, setNewSteps] = useState([]); const [stepInput, setStepInput] = useState("");

  function toggleStep(pid, si) { setProjects(prev => prev.map(p => p.id!==pid?p:{...p,steps:p.steps.map((s,idx)=>idx!==si?s:{...s,done:!s.done})})); }
  function createProject(template) {
    const id = Date.now();
    const proj = template ? {id,name:template.name,icon:template.icon,steps:template.steps.map(t=>({text:t,done:false}))} : {id,name:newName||"Mein Projekt",icon:newIcon,steps:newSteps.map(t=>({text:t,done:false}))};
    setProjects(prev=>[...prev,proj]); setCreating(false); setNewName(""); setNewIcon("🏠"); setNewSteps([]); setOpenProject(id);
  }
  function addStep() { if(stepInput.trim()){setNewSteps(prev=>[...prev,stepInput.trim()]);setStepInput("");} }
  const ICONS = ["🏠","🚿","🍳","🌿","🛋️","🛏️","🔨","📦"];
  return (
    <div style={{ overflowY:"auto", height:"100%", padding:"16px" }}>
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, marginBottom:16 }}>Planer & Projekte</h2>
      {projects.map(proj => {
        const doneCount=proj.steps.filter(s=>s.done).length;
        const pct=proj.steps.length?Math.round((doneCount/proj.steps.length)*100):0;
        return (
          <div key={proj.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, marginBottom:14, overflow:"hidden" }}>
            <div onClick={() => setOpenProject(openProject===proj.id?null:proj.id)} style={{ padding:"14px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:28 }}>{proj.icon}</span>
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:600, fontSize:15 }}>{proj.name}</p>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}>
                  <div style={{ flex:1, height:6, background:C.border, borderRadius:3, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:pct===100?C.green:C.accent, borderRadius:3, transition:"width 0.3s" }} />
                  </div>
                  <span style={{ fontSize:12, color:C.muted, flexShrink:0 }}>{doneCount}/{proj.steps.length}</span>
                </div>
              </div>
              <span style={{ color:C.muted }}>{openProject===proj.id?"▲":"▼"}</span>
            </div>
            {openProject===proj.id && (
              <div style={{ borderTop:`1px solid ${C.border}`, padding:"12px 16px" }}>
                {proj.steps.map((step,si) => (
                  <div key={si} onClick={() => toggleStep(proj.id,si)} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:si<proj.steps.length-1?`1px solid ${C.border}`:"none", cursor:"pointer" }}>
                    <div style={{ width:20, height:20, borderRadius:5, border:`2px solid ${step.done?C.green:C.border}`, background:step.done?C.green:"white", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      {step.done && <span style={{ color:"white", fontSize:11, fontWeight:700 }}>✓</span>}
                    </div>
                    <p style={{ fontSize:14, color:step.done?C.muted:C.text, textDecoration:step.done?"line-through":"none" }}>{step.text}</p>
                  </div>
                ))}
                {pct===100 && <div style={{ marginTop:10, background:C.greenBg, borderRadius:10, padding:"10px 12px", textAlign:"center" }}><p style={{ color:C.green, fontWeight:600, fontSize:14 }}>🎉 Projekt abgeschlossen!</p></div>}
                <button onClick={() => setProjects(prev=>prev.filter(p=>p.id!==proj.id))} style={{ marginTop:10, background:"none", border:"none", color:"#B91C1C", fontSize:13, cursor:"pointer", padding:"4px 0" }}>🗑 Projekt löschen</button>
              </div>
            )}
          </div>
        );
      })}
      {!creating && (
        <div>
          <p style={{ fontSize:13, color:C.muted, marginBottom:10 }}>Schnellstart-Vorlage:</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
            {PROJECT_TEMPLATES.map((tmpl,i) => (
              <div key={i} onClick={() => createProject(tmpl)} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px", cursor:"pointer", textAlign:"center" }}>
                <div style={{ fontSize:28, marginBottom:6 }}>{tmpl.icon}</div>
                <p style={{ fontSize:13, fontWeight:500 }}>{tmpl.name}</p>
                <p style={{ fontSize:11, color:C.muted, marginTop:3 }}>{tmpl.steps.length} Schritte</p>
              </div>
            ))}
          </div>
          <button onClick={() => setCreating(true)} style={{ width:"100%", padding:"12px", borderRadius:50, border:`2px dashed ${C.accent}`, background:C.accentBg, color:C.accent, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:14 }}>+ Eigenes Projekt erstellen</button>
        </div>
      )}
      {creating && (
        <div className="fu" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px" }}>
          <p style={{ fontWeight:600, fontSize:15, marginBottom:14 }}>Neues Projekt</p>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
            {ICONS.map(ic => <button key={ic} onClick={() => setNewIcon(ic)} style={{ width:38, height:38, borderRadius:10, border:`2px solid ${newIcon===ic?C.accent:C.border}`, background:newIcon===ic?C.accentBg:"white", cursor:"pointer", fontSize:20 }}>{ic}</button>)}
          </div>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Projektname" style={{ width:"100%", padding:"10px 13px", borderRadius:10, border:`2px solid ${C.border}`, fontSize:14, fontFamily:"'DM Sans',sans-serif", marginBottom:14, background:C.bg }} />
          {newSteps.map((s,i) => <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}><span style={{ width:20, height:20, background:C.accent, color:"white", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, flexShrink:0 }}>{i+1}</span><p style={{ flex:1, fontSize:14 }}>{s}</p><button onClick={() => setNewSteps(prev=>prev.filter((_,j)=>j!==i))} style={{ background:"none", border:"none", color:"#CCC", cursor:"pointer" }}>✕</button></div>)}
          <div style={{ display:"flex", gap:8, marginBottom:14 }}>
            <input value={stepInput} onChange={e => setStepInput(e.target.value)} onKeyDown={e => { if(e.key==="Enter")addStep(); }} placeholder="Schritt hinzufügen…" style={{ flex:1, padding:"9px 13px", borderRadius:10, border:`1px solid ${C.border}`, fontSize:13, fontFamily:"'DM Sans',sans-serif", background:C.bg }} />
            <button onClick={addStep} style={{ padding:"9px 16px", borderRadius:10, background:C.accent, color:"white", border:"none", cursor:"pointer", fontWeight:600 }}>+</button>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => createProject(null)} style={{ flex:1, padding:"12px", borderRadius:50, background:C.accent, color:"white", border:"none", fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Erstellen</button>
            <button onClick={() => setCreating(false)} style={{ flex:1, padding:"12px", borderRadius:50, border:`2px solid ${C.border}`, background:"none", fontWeight:500, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Abbrechen</button>
          </div>
        </div>
      )}
      {savedMakeovers?.length > 0 && (
        <EinkaufsListe savedMakeovers={savedMakeovers} />
      )}
    </div>
  );
}

// ─── IDEEN TAB (Trends-Karten) ────────────────────────────────────────────────
const TRENDS = [
  { title:"Dunkle Küchenfronten", desc:"Navy, Dunkelgrün, Anthrazit – weg von Weiß. Mattschwarz-Armaturen dazu.", how:"Fronten folieren oder lackieren", emoji:"🖤", img:"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=220&fit=crop&q=80" },
  { title:"Warme Erdetöne", desc:"Terrakotta, Ocker, Sandstein statt kaltem Grau. In Farbe, Kissen, Keramik.", how:"Akzentwand + Deko tauschen", emoji:"🍂", img:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=220&fit=crop&q=80" },
  { title:"Mikrozement-Optik", desc:"Beton-Look auf Wänden und Böden. Edel, zeitlos.", how:"Folie oder echter Mikrozement", emoji:"🏛️", img:"https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=600&h=220&fit=crop&q=80" },
  { title:"Großformatige Fliesen", desc:"60×60 oder 120×60 statt kleiner Kacheln. Lässt Räume größer wirken.", how:"Über alte Fliesen möglich", emoji:"⬛", img:"https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&h=220&fit=crop&q=80" },
  { title:"Mattschwarz überall", desc:"Armaturen, Griffe, Lampen – ein Farbton, kompletter Stil-Shift.", how:"Armaturen + Griffe selbst tauschen", emoji:"🔩", img:"https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=600&h=220&fit=crop&q=80" },
  { title:"Offene Regale", desc:"Küche und Wohnzimmer: offen, luftig, persönlich.", how:"Schwebende Regale montieren", emoji:"📚", img:"https://images.unsplash.com/photo-1556909211-36987e6e9a65?w=600&h=220&fit=crop&q=80" },
  { title:"Indoor-Pflanzen", desc:"Monstera, Ficus, Olivenbaum als Hauptelement statt Deko-Beiwerk.", how:"Sofort umsetzbar", emoji:"🌿", img:"https://images.unsplash.com/photo-1416879595882-b3d065a0e45d?w=600&h=220&fit=crop&q=80" },
  { title:"Wellness-Bad", desc:"Walk-In Dusche, Regendusche, warmes Licht, Holz-Elemente.", how:"Licht + Armaturen als Start", emoji:"🚿", img:"https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=600&h=220&fit=crop&q=80" },
  { title:"Fluted Panel Wand", desc:"Gerillte MDF-Latten hinter TV oder Bett – Statement-Wand.", how:"MDF zuschneiden + lackieren", emoji:"🎨", img:"https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=220&fit=crop&q=80" },
  { title:"Outdoor-Lounge", desc:"Terrasse als echtes Wohnzimmer draußen. Holz, Polster, Licht.", how:"Klickfliesen + Paletten-Sofa", emoji:"🌴", img:"https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=600&h=220&fit=crop&q=80" },
];

function IdeenTab() {
  return (
    <div style={{ overflowY:"auto", height:"100%", padding:"16px" }}>
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, marginBottom:6 }}>Ideen & Trends 2025</h2>
      <p style={{ color:C.muted, fontSize:14, marginBottom:16 }}>Was gerade in modernen Wohnungen angesagt ist – und wie du es günstig umsetzt.</p>
      {TRENDS.map((trend, i) => (
        <div key={i} className="fu" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, marginBottom:14, overflow:"hidden", animationDelay:`${i*0.04}s` }}>
          <div style={{ position:"relative", height:160, overflow:"hidden" }}>
            <img src={trend.img} alt={trend.title} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)" }} />
            <div style={{ position:"absolute", bottom:12, left:14, right:14 }}>
              <p style={{ color:"white", fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, textShadow:"0 1px 4px rgba(0,0,0,0.5)" }}>{trend.emoji} {trend.title}</p>
            </div>
          </div>
          <div style={{ padding:"14px 16px" }}>
            <p style={{ fontSize:13, color:"#555", lineHeight:1.65, marginBottom:10 }}>{trend.desc}</p>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <Pill bg={C.greenBg} color={C.green}>{"✓ " + trend.how}</Pill>
              <a href={`https://www.amazon.de/s?k=${encodeURIComponent(trend.title)}&tag=${AFFILIATE_TAG}`} target="_blank" rel="noopener noreferrer" style={{ background:C.accentBg, color:C.accent, padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:500, textDecoration:"none" }}>🛒 Amazon</a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── TABS & APP ROOT ──────────────────────────────────────────────────────────
const TABS = [
  { id:"makeover", label:"Makeover", icon:"✨" },
  { id:"chat",     label:"Chat",     icon:"💬" },
  { id:"ideen",    label:"Ideen",    icon:"💡" },
  { id:"anleit",   label:"Anleit.",  icon:"📋" },
  { id:"planer",   label:"Planer",   icon:"📅" },
  { id:"profis",   label:"Profis",   icon:"🔨" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("makeover");
  const [savedMakeovers, setSavedMakeovers] = useState([]);
  const [chatMessages, setChatMessages] = useState([{
    role:"assistant",
    text:"Hey! 👋 Ich bin dein RenoPilot Experte.\n\nSchreib mir was du renovieren möchtest:\n\n🚿 Bad renovieren\n🍳 Küche aufwerten\n🪵 Boden verlegen\n💡 LED einbauen\n🌿 Terrasse aufwerten\n\nOder lade ein Foto hoch!",
  }]);
  return (
    <>
      <Head>
        <title>RenoPilot – KI Renovierungs-App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="description" content="KI-Renovierungsplaner: Foto hochladen, Makeover-Bilder generieren, Ideen und Anleitungen für dein Zuhause." />
        <style dangerouslySetInnerHTML={{ __html:globalCSS }} />
      </Head>
      <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:C.bg, maxWidth:600, margin:"0 auto" }}>
        <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"13px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700 }}>Reno<span style={{ color:C.accent }}>Pilot</span></span>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:"#4ade80" }} />
            <span style={{ fontSize:12, color:C.accent, fontWeight:600 }}>KI aktiv</span>
          </div>
        </div>
        <div style={{ flex:1, overflow:"hidden", position:"relative" }}>
          <div style={{ display:activeTab==="makeover"?"flex":"none", height:"100%", overflow:"hidden" }}>
            <MakeoverTab onSaveToPlaner={m => setSavedMakeovers(prev=>[m,...prev])} savedMakeovers={savedMakeovers} />
          </div>
          <div style={{ display:activeTab==="chat"?"flex":"none", flexDirection:"column", height:"100%" }}>
            <ChatTab messages={chatMessages} setMessages={setChatMessages} />
          </div>
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
