import { useState, useRef, useEffect } from "react";
import Head from "next/head";

const G = {
  bg: "#F8F5F0", card: "#FFFFFF", border: "#EDE8DF",
  accent: "#C4622D", al: "#FFF0E8", text: "#1A1A1A",
  sub: "#444444", muted: "#888888",
  green: "#3A7A56", gbg: "#EDF5F1",
  red: "#C0392B", rbg: "#FDEEEC",
  blue: "#2A6DB5", bbg: "#EBF2FA",
  surface: "#FFF8F3", tag: "#F2EDE6",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  html,body,#__next{height:100%;}
  body{font-family:'DM Sans',sans-serif;background:${G.bg};}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  .fu{animation:fadeUp .28s ease both}
  textarea,input,button{font-family:'DM Sans',sans-serif;}
  textarea:focus,input:focus{outline:none;}
  ::-webkit-scrollbar{width:3px}
  ::-webkit-scrollbar-thumb{background:${G.border};border-radius:3px}
`;

const Spin = ({ s = 22 }) => (
  <div style={{ width: s, height: s, border: `2px solid ${G.border}`, borderTop: `2px solid ${G.accent}`, borderRadius: "50%", animation: "spin .8s linear infinite", flexShrink: 0 }} />
);

const Pill = ({ children, bg = G.al, color = G.accent, size = 12 }) => (
  <span style={{ background: bg, color, padding: "3px 10px", borderRadius: 20, fontSize: size, fontWeight: 500, whiteSpace: "nowrap" }}>{children}</span>
);

const Badge = ({ level }) => {
  const m = { "Leicht": [G.gbg, G.green], "Mittel": [G.al, G.accent], "Hoch": [G.rbg, G.red] };
  const [bg, color] = m[level] || [G.tag, G.muted];
  return <Pill bg={bg} color={color}>{level}</Pill>;
};

const SYS = `Du bist RenoPilot, ein freundlicher DIY-Renovierungsberater mit Wissen aus 20 Handwerker-YouTube-Videos. Antworte immer auf Deutsch.

WENN EIN FOTO hochgeladen wird, analysiere IMMER in dieser Struktur:
🏠 **Raum & Materialien**: Was siehst du genau? Welche Materialien erkennst du (Fliesen, Putz, Laminat, Armaturen, Farbe, Zustand)?
🔨 **Sofortmaßnahmen**: Was kann man selbst schnell verbessern ohne großen Aufwand?
✨ **Upgrade-Ideen**: 2–3 konkrete Renovierungsideen was sich hier gut machen würde
🛒 **Material-Empfehlungen**: Konkrete Produktnamen. Für Amazon-Produkte nutze dieses Format: [Produktname](https://www.amazon.de/s?k=SUCHBEGRIFF&tag=renopilot-21)

BEI TEXTNACHRICHTEN ohne Bild: Kurz, konkret, max. 5 Sätze.

Nutze **Fettschrift** für wichtige Begriffe und - Aufzählungen für Listen.

FACHWISSEN:
- STREICHEN: Lammfellrolle 12–18mm, Dispersionsfarbe trocken abziehen, Latexfarbe NASS abziehen
- SPACHTELN: Q1 (Fugen), Q2 (Übergang), Q3 (Abporen). Pulverspachtel Q1, Fertigspachtel Q2/Q3
- FLIESEN: Doppelklebung, Zahnkelle 8mm, Nivelliersystem, 1/3-Verband
- BAD: Alte Fliesen lassen (Klopftest), Silikon raus, SMP-Klebstoff ohne Dispersionsgrundierung
- LAMINAT: 10mm Dehnungsfuge, 48h akklimatisieren, Trittschalldämmung
- WANDPANEELE: Fluted Panels Akzentwand, erstes Panel mit Wasserwaage, S-Muster Kleber
- LED: 24V, WAGO-Klemmen, Trailing-Edge-Dimmer, 20% Trafo-Reserve`;

// ─── TEXT RENDERER (Markdown Links + Bold + Listen) ────────────────────────
function RenderText({ text, isUser }) {
  const lines = text.split("\n");
  return (
    <div>
      {lines.map((line, li) => {
        if (!line.trim()) return <div key={li} style={{ height: 6 }} />;
        // Parse bold + links inline
        const parts = [];
        let rest = line;
        let key = 0;
        // Regex: **bold**, [text](url), bare URLs
        const pattern = /(\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:\/\/[^\)]+)\)|(https?:\/\/[^\s]+))/g;
        let last = 0, m;
        pattern.lastIndex = 0;
        while ((m = pattern.exec(rest)) !== null) {
          if (m.index > last) parts.push(<span key={key++}>{rest.slice(last, m.index)}</span>);
          if (m[2]) { // **bold**
            parts.push(<strong key={key++} style={{ fontWeight: 600, color: isUser ? "#fff" : G.text }}>{m[2]}</strong>);
          } else if (m[3] && m[4]) { // [text](url)
            parts.push(<a key={key++} href={m[4]} target="_blank" rel="noopener noreferrer" style={{ color: isUser ? "#ffd5b8" : G.accent, textDecoration: "underline", textDecorationStyle: "dotted", fontWeight: 500 }}>{m[3]}</a>);
          } else if (m[5]) { // bare URL
            const display = m[5].replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "").slice(0, 40);
            parts.push(<a key={key++} href={m[5]} target="_blank" rel="noopener noreferrer" style={{ color: isUser ? "#ffd5b8" : G.accent, textDecoration: "underline", textDecorationStyle: "dotted", fontWeight: 500 }}>🔗 {display}</a>);
          }
          last = m.index + m[0].length;
        }
        if (last < rest.length) parts.push(<span key={key++}>{rest.slice(last)}</span>);

        // List items
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return <div key={li} style={{ display: "flex", gap: 6, marginBottom: 3 }}><span style={{ color: isUser ? "#ffd5b8" : G.accent, flexShrink: 0, marginTop: 1 }}>•</span><span>{parts.length ? parts : line.slice(2)}</span></div>;
        }
        // Emoji headers (🏠 🔨 ✨ 🛒)
        if (/^[🏠🔨✨🛒💡⚠️]/.test(line)) {
          return <div key={li} style={{ marginBottom: 6, marginTop: li > 0 ? 10 : 0, fontWeight: 600, fontSize: 13, color: isUser ? "#fff" : G.text }}>{parts.length ? parts : line}</div>;
        }
        return <div key={li} style={{ marginBottom: 2 }}>{parts.length ? parts : line}</div>;
      })}
    </div>
  );
}

const ANLEITUNGEN = [
  { id:"streichen",emoji:"🖌️",titel:"Wände streichen",schwierigkeit:"Leicht",zeit:"1–2 Tage",kosten:"30–80€",img:"https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=120&q=80",werkzeug:["Teleskopstange","Lammfellrolle 12–18mm","Flachpinsel 5cm","Abklebeband","Abdeckfolie"],schritte:["Möbel raus / abdecken, Steckdosen abkleben","Risse spachteln, schleifen, Staub absaugen","Abkleben mit Wasserwaage – Band fingerspitzenartig andrücken","Farbton auf Pappe testen – Tageslicht UND Kunstlicht!","Erste Schicht mit Rolle gleichmäßig auftragen","Min. 4h trocknen, dann zweite Schicht","Dispersionsfarbe: Band nach Trocknen abziehen. Latexfarbe: Band NASS abziehen!","Anschlüsse (Decke, Fenster) mit Pinsel nacharbeiten"],tipp:"Lammfellrolle 12–18mm = beste Oberfläche ohne Flusen.",fehler:"Zu wenig abkleben, falscher Abziehmodus, zu dicke Schichten.",youtube:"https://www.youtube.com/results?search_query=wände+streichen+profi",amazon:"https://www.amazon.de/s?k=lammfellrolle+teleskopstange&tag=renopilot-21" },
  { id:"spachteln",emoji:"🔧",titel:"Wände spachteln",schwierigkeit:"Mittel",zeit:"2–3 Tage",kosten:"40–120€",img:"https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=120&q=80",werkzeug:["Glättekelle 40cm","Rakel","Schleifgitter 120er","Glasflies","Pulverspachtel","Fertigspachtel"],schritte:["Q1 – Fugen: Pulverspachtel einpressen, Fugendeckstreifen einlegen","Q2 – Übergänge: Fertigspachtel dünn mit Kelle ziehen","Q3 – Abporen: dünner Abrieb über die gesamte Fläche","Glasflies empfohlen: verhindert Rissbildung","Nach jeder Schicht nass mit Rakel überziehen","Schleifen nur Q2/Q3 mit Gitter auf Brett","Vor Streichen: Tiefengrund dünn auftragen"],tipp:"Pulverspachtel für Q1 (stabiler), Fertigspachtel für Q2/Q3 (schleifbar).",fehler:"Q1 und Q2 verwechseln, zu dick auftragen, nicht schleifen.",youtube:"https://www.youtube.com/results?search_query=wand+spachteln+anleitung",amazon:"https://www.amazon.de/s?k=glättekelle+spachtelset&tag=renopilot-21" },
  { id:"fliesen",emoji:"⬛",titel:"Fliesen legen",schwierigkeit:"Mittel",zeit:"2–4 Tage",kosten:"100–400€",img:"https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=120&q=80",werkzeug:["Zahnkelle 8mm","Nivelliersystem","Fliesenschneider","Fugenmasse","Gummihammer"],schritte:["Raumbreite ÷ Fliesenbreite – letzter Streifen mind. ¾ Breite","Mitte des Raums als Startpunkt","Untergrund: eben, trocken, tragfähig","Doppelklebung: Kleber auf Boden UND Fliese","Zahnkelle 8mm gleichmäßig aufziehen","1/3-Verband verlegen","Nivelliersystem bei großen Formaten","24h trocknen, dann fugen"],tipp:"Große Formate (60×60+) immer Doppelklebung + Nivelliersystem.",fehler:"Untergrund nicht prüfen, Doppelklebung vergessen.",youtube:"https://www.youtube.com/results?search_query=fliesen+legen+anleitung",amazon:"https://www.amazon.de/s?k=fliesen+nivelliersystem&tag=renopilot-21" },
  { id:"bad",emoji:"🚿",titel:"Bad ohne Abriss renovieren",schwierigkeit:"Mittel",zeit:"3–5 Tage",kosten:"200–800€",img:"https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=120&q=80",werkzeug:["Cuttermesser","Anlauger","Silikon+Pistole","Abdichtband","SMP-Klebstoff"],schritte:["Klopftest: hohle Fliesen markieren (>20% = Abriss)","Altes Silikon komplett raus + Untergrund entfetten","Abdichtung: Wanne, Dusche bis 2m, Boden","SMP-Klebstoff: KEINE Dispersionsgrundierung darunter","Neue Fliesen auf alte legen (Boden +1–2cm)","Silikon mit Finger+Spülmittel glattziehen","Armaturentausch: Wasser ab, Teflonband","Licht, Spiegel, Accessoires"],tipp:"Nur Silikon + Oberflächen = 80% Arbeitsersparnis bei gleichem Ergebnis.",fehler:"Abdichtung vergessen, Silikon auf Fett, falscher Kleber.",youtube:"https://www.youtube.com/results?search_query=bad+renovieren+ohne+abriss",amazon:"https://www.amazon.de/s?k=bad+renovierung+set&tag=renopilot-21" },
  { id:"laminat",emoji:"🪵",titel:"Laminat verlegen",schwierigkeit:"Leicht",zeit:"1 Tag",kosten:"15–50€/m²",img:"https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=120&q=80",werkzeug:["Stichsäge","Zugeisen","Trittschalldämmung","Abstandshalter 10mm","Gummihammer"],schritte:["Untergrund: eben (max. 3mm/2m), trocken","Trittschalldämmung vollflächig verlegen","48h Laminat akklimatisieren – Pflicht!","Abstandshalter 10mm an alle Wände","Nut zur Wand, erste Reihe ausrichten","Jede Reihe mind. 40cm versetzt","Letzte Reihe messen, schneiden, einziehen","Sockelleisten an Wand schrauben (NICHT ans Laminat)"],tipp:"48h akklimatisieren verhindert, dass sich der Boden nach Verlegen wölbt.",fehler:"Dehnungsfuge vergessen, keine Folie auf Beton.",youtube:"https://www.youtube.com/results?search_query=laminat+verlegen+anleitung",amazon:"https://www.amazon.de/s?k=laminat+verlegewerkzeug&tag=renopilot-21" },
  { id:"wandpaneele",emoji:"📐",titel:"Wandpaneele / Fluted Panels",schwierigkeit:"Leicht",zeit:"4–8 Stunden",kosten:"50–200€",img:"https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=120&q=80",werkzeug:["Bohrschrauber","Stichsäge","SPC-Kleber","Wasserwaage","Abstandshalter"],schritte:["Wand: gerade, trocken, tapetenfrei","Paneele 24h akklimatisieren","Erstes Panel mit Wasserwaage ausrichten","Kleber: S-Muster, mind. 5cm vom Rand","Panel andrücken, 2 Min. halten","Stöße versetzen wie Mauerwerk","Steckdosen: Pappe-Schablone, dann Stichsäge","Abschluss mit Profil oder Anstrich"],tipp:"Fluted Panels hinter Bett oder Sofa – meistgesuchter Look 2025.",fehler:"Erstes Panel nicht ausrichten, Lösungsmittel-Kleber auf Kunststoff.",youtube:"https://www.youtube.com/results?search_query=wandpaneele+fluted+panel",amazon:"https://www.amazon.de/s?k=wandpaneele+fluted+panel&tag=renopilot-21" },
  { id:"led",emoji:"💡",titel:"LED-Beleuchtung einbauen",schwierigkeit:"Leicht",zeit:"2–4 Stunden",kosten:"30–150€",img:"https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=120&q=80",werkzeug:["WAGO-Klemmen","Seitenschneider","Spannungsprüfer","LED-Streifen 24V","Dimmer"],schritte:["Sicherung raus! Spannungsprüfer nutzen","24V LED-Streifen wählen","WAGO statt Lüsterklemmen","Untergrund entfetten, Ecken mit Verbinder","Streifen kleben, andrücken","Trailing-Edge-Dimmer einbauen","Trafo: min. 20% Leistungsreserve","Test vor dem Abdecken"],tipp:"Indirekte LED in Stuckkehle wirkt besser als direkte Spots.",fehler:"Zu schwacher Trafo, Streifen knicken, falscher Dimmer.",youtube:"https://www.youtube.com/results?search_query=led+streifen+einbauen",amazon:"https://www.amazon.de/s?k=led+24v+wago+dimmer&tag=renopilot-21" },
  { id:"silikon",emoji:"🔲",titel:"Silikon erneuern",schwierigkeit:"Leicht",zeit:"2–3 Stunden",kosten:"10–25€",img:"https://images.unsplash.com/photo-1484154218962-a197022b5858?w=120&q=80",werkzeug:["Silikonentferner","Cuttermesser","Sanitär-Silikon","Silikonpistole","Spülmittel"],schritte:["Altes Silikon mit Cuttermesser raus","Reste mit Entferner lösen (15 Min.)","Untergrund mit Isopropanol entfetten","Malerband beidseitig abkleben","Silikon in einem Zug auftragen","Finger mit Spülmittel glattziehen","Band SOFORT (nass) abziehen","24h nicht nass"],tipp:"Badewanne vor Abdichten mit Wasser füllen – hält bei Belastung besser.",fehler:"Band zu spät, fettig, kein Pilzhemmer.",youtube:"https://www.youtube.com/results?search_query=silikon+erneuern+bad",amazon:"https://www.amazon.de/s?k=sanitär+silikon+pilzhemmend&tag=renopilot-21" },
];

const IDEEN = [
  { id:"bad-spa",raum:"Bad",titel:"Modernes Spa-Bad",img:"https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&q=80",beschreibung:"Mikrozement + schwarze Armaturen + Regendusche. Maximaler Wow-Faktor.",schwierigkeit:"Hoch",kosten:"8.000–20.000€",tags:["Mikrozement","Schwarze Armaturen","Regendusche"],youtube:"https://www.youtube.com/results?search_query=badezimmer+spa+modern",amazon:"https://www.amazon.de/s?k=schwarze+armatur+bad&tag=renopilot-21" },
  { id:"bad-warm",raum:"Bad",titel:"Helles Terrazzo-Bad",img:"https://images.unsplash.com/photo-1620626011761-996317702782?w=600&q=80",beschreibung:"Beige Terrazzo, Holzakzente, warme Beleuchtung. Zeitlos.",schwierigkeit:"Mittel",kosten:"3.000–8.000€",tags:["Terrazzo","Holzakzente","Warmes Licht"],youtube:"https://www.youtube.com/results?search_query=bad+terrazzo",amazon:"https://www.amazon.de/s?k=terrazzo+fliesen&tag=renopilot-21" },
  { id:"kueche-navy",raum:"Küche",titel:"Navy Blue mit Messing",img:"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80",beschreibung:"Dunkle Fronten, Messingarmaturen, Steinarbeitsplatte. Klassisch-luxuriös.",schwierigkeit:"Mittel",kosten:"5.000–15.000€",tags:["Navy Blue","Messing","Stein"],youtube:"https://www.youtube.com/results?search_query=küche+navy+messing",amazon:"https://www.amazon.de/s?k=messing+küchenarmatur&tag=renopilot-21" },
  { id:"kueche-sage",raum:"Küche",titel:"Salbeigrüne Landhausküche",img:"https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=600&q=80",beschreibung:"Offene Regale, Holzarbeitsplatte, grüne Fronten. Organisch.",schwierigkeit:"Leicht",kosten:"1.000–5.000€",tags:["Salbeigrün","Holzplatte","Offene Regale"],youtube:"https://www.youtube.com/results?search_query=küche+salbeigrün",amazon:"https://www.amazon.de/s?k=küchenfronten+grün&tag=renopilot-21" },
  { id:"wohn-gruen",raum:"Wohnzimmer",titel:"Dunkelgrüne Akzentwand",img:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80",beschreibung:"Tiefes Flaschengrün, Bouclé-Sofa, Messing.",schwierigkeit:"Leicht",kosten:"200–800€",tags:["Dunkelgrün","Fluted Panel","Bouclé"],youtube:"https://www.youtube.com/results?search_query=wohnzimmer+dunkelgrün",amazon:"https://www.amazon.de/s?k=wandfarbe+flaschengrün&tag=renopilot-21" },
  { id:"wohn-terra",raum:"Wohnzimmer",titel:"Terrakotta & Naturtöne",img:"https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80",beschreibung:"Warme Erdtöne, Rattan-Möbel, Lehm-Optik.",schwierigkeit:"Leicht",kosten:"300–1.500€",tags:["Terrakotta","Rattan","Lehm"],youtube:"https://www.youtube.com/results?search_query=wohnzimmer+terrakotta",amazon:"https://www.amazon.de/s?k=terrakotta+wandfarbe&tag=renopilot-21" },
  { id:"schlaf-japandi",raum:"Schlafzimmer",titel:"Minimales Japandi",img:"https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?w=600&q=80",beschreibung:"Helles Holz, weiße Wände, bodentiefes Bett.",schwierigkeit:"Leicht",kosten:"500–2.000€",tags:["Japandi","Helles Holz","Minimal"],youtube:"https://www.youtube.com/results?search_query=schlafzimmer+japandi",amazon:"https://www.amazon.de/s?k=japandi+bett&tag=renopilot-21" },
  { id:"schlaf-dark",raum:"Schlafzimmer",titel:"Dark & Cozy Hotelzimmer",img:"https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80",beschreibung:"Dunkle Decke, Samtbettkopfteil, indirekte Beleuchtung.",schwierigkeit:"Leicht",kosten:"400–1.500€",tags:["Dunkle Decke","Samt","Indirekte LED"],youtube:"https://www.youtube.com/results?search_query=schlafzimmer+hotel+dark",amazon:"https://www.amazon.de/s?k=dunkle+wandfarbe&tag=renopilot-21" },
  { id:"boden-eiche",raum:"Boden",titel:"Geöltes Eichenparkett",img:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80",beschreibung:"Breite Dielen, Naturöl. Wertsteigernd und warm.",schwierigkeit:"Mittel",kosten:"80–200€/m²",tags:["Eiche","Parkett","Naturöl"],youtube:"https://www.youtube.com/results?search_query=eichenparkett+verlegen",amazon:"https://www.amazon.de/s?k=eiche+landhausdiele&tag=renopilot-21" },
  { id:"boden-spc",raum:"Boden",titel:"Wasserfester SPC-Boden",img:"https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&q=80",beschreibung:"Über alte Fliesen verlegbar, wasserfest.",schwierigkeit:"Leicht",kosten:"20–60€/m²",tags:["SPC","Wasserfest","Klick"],youtube:"https://www.youtube.com/results?search_query=spc+vinylboden",amazon:"https://www.amazon.de/s?k=spc+vinylboden&tag=renopilot-21" },
];

const INSPO = [
  { url:"https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=400&q=80",label:"Modernes Bad" },
  { url:"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80",label:"Designer Küche" },
  { url:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80",label:"Wohnzimmer" },
  { url:"https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?w=400&q=80",label:"Japandi Schlafzimmer" },
  { url:"https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&q=80",label:"Spa Bad" },
  { url:"https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=400&q=80",label:"Landhausküche" },
  { url:"https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80",label:"Hotel Schlafzimmer" },
  { url:"https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80",label:"Boho Wohnzimmer" },
  { url:"https://images.unsplash.com/photo-1620626011761-996317702782?w=400&q=80",label:"Terrazzo Bad" },
  { url:"https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=400&q=80",label:"Wandpaneele" },
  { url:"https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&q=80",label:"Vinylboden" },
  { url:"https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=400&q=80",label:"LED Beleuchtung" },
];

const STILE = [
  { id:"bad-modern",label:"Bad Modern",emoji:"🚿" },
  { id:"bad-warm",label:"Bad Warm",emoji:"🛁" },
  { id:"kueche-navy",label:"Küche Navy",emoji:"🍳" },
  { id:"kueche-gruen",label:"Küche Grün",emoji:"🌿" },
  { id:"wohn-dunkel",label:"Wohnzimmer Dark",emoji:"🛋️" },
  { id:"wohn-terra",label:"Wohnzimmer Warm",emoji:"🏺" },
  { id:"schlaf-hell",label:"Schlafzimmer Hell",emoji:"🌙" },
  { id:"schlaf-dunkel",label:"Schlafzimmer Dark",emoji:"✨" },
];

// ─── MAKEOVER TAB (wie Image 3: Stil-Grid + Generieren-Button) ───────────────
const STIL_GRID = [
  { id:"bad-modern",   label:"Bad: Modern & Spa",       emoji:"🚿" },
  { id:"bad-warm",     label:"Bad: Hell & Warm",         emoji:"🛁" },
  { id:"bad-mikro",    label:"Bad: Mikrozement",         emoji:"⬜" },
  { id:"kueche-navy",  label:"Küche: Navy & Holz",       emoji:"🍳" },
  { id:"kueche-grau",  label:"Küche: Seidengrau",        emoji:"🪨" },
  { id:"kueche-gruen", label:"Küche: Salbeigrün",        emoji:"🌿" },
  { id:"wohn-dunkel",  label:"Wohnzimmer: Grün",         emoji:"🛋️" },
  { id:"wohn-terra",   label:"Wohnzimmer: Terrakotta",   emoji:"🏺" },
  { id:"schlaf-terra", label:"Schlafzimmer: Terrakotta", emoji:"🌙" },
  { id:"schlaf-dunkel",label:"Schlafzimmer: Dunkel",     emoji:"✨" },
  { id:"terrasse-wpc", label:"Terrasse: WPC & Lounge",   emoji:"🌿" },
];

const STIL_PROMPTS = {
  "bad-modern":    "modern luxury spa bathroom, dark slate tiles, rainfall shower, matte black fixtures, LED mirror, floating vanity, photorealistic interior 8k",
  "bad-warm":      "bright scandinavian bathroom, white subway tiles, oak wood accents, gold faucets, warm lighting, photorealistic interior",
  "bad-mikro":     "microcement bathroom seamless concrete walls and floor, floating vanity, indirect warm lighting, minimalist, photorealistic",
  "kueche-navy":   "modern kitchen dark navy blue cabinets, brass handles, marble countertop, pendant lights, photorealistic interior 8k",
  "kueche-grau":   "modern kitchen grey satin cabinets, matte black handles, white subway tile backsplash, LED lighting, photorealistic",
  "kueche-gruen":  "modern kitchen sage green cabinets, wooden open shelves, black handles, plants, bright scandinavian interior photorealistic",
  "wohn-dunkel":   "living room dark forest green accent wall, oak floor, bouclé sofa, brass lamp, indirect LED, photorealistic interior",
  "wohn-terra":    "living room terracotta warm tones, rattan furniture, boho, natural light, cozy photorealistic interior",
  "schlaf-terra":  "bedroom terracotta accent wall, linen bedding, warm oak furniture, morning light, photorealistic interior",
  "schlaf-dunkel": "moody dark bedroom charcoal walls, velvet headboard, brass sconces, indirect LED, hotel suite photorealistic",
  "terrasse-wpc":  "modern terrace WPC decking, outdoor lounge furniture, pergola, evening lighting, photorealistic exterior",
};

function MakeoverTab() {
  const [stil, setStil] = useState("bad-modern");
  const [imgPreview, setImgPreview] = useState(null);
  const [wunsch, setWunsch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genImg, setGenImg] = useState(null);
  const [saved, setSaved] = useState([]);
  const [selSaved, setSelSaved] = useState(null);
  const [showSaved, setShowSaved] = useState(false);
  const fileRef = useRef(null);

  // Gespeicherte laden
  useEffect(() => {
    try {
      const s = localStorage.getItem("renopilot_makeovers");
      if (s) setSaved(JSON.parse(s));
    } catch {}
  }, []);

  const onFile = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => { setImgPreview(ev.target.result); setGenImg(null); };
    r.readAsDataURL(f);
  };

  const generate = async () => {
    if (!imgPreview) return;
    setGenerating(true); setGenImg(null);
    try {
      const prompt = STIL_PROMPTS[stil] + (wunsch ? `, ${wunsch}` : "");
      const res = await fetch("/api/generate", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ stil, prompt, imgBase64: imgPreview }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setGenImg(data.imageUrl);
        // Speichern
        const entry = { id: Date.now(), stilLabel: STIL_GRID.find(s=>s.id===stil)?.label || stil, imgUrl: data.imageUrl, original: imgPreview, date: new Date().toLocaleDateString("de-DE") };
        const newSaved = [entry, ...saved].slice(0, 20);
        setSaved(newSaved);
        try { localStorage.setItem("renopilot_makeovers", JSON.stringify(newSaved)); } catch {}
      }
    } catch {}
    setGenerating(false);
  };

  const aktuell = selSaved || null;

  return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden" }}>
      {/* Gespeicherte Sidebar */}
      {showSaved && (
        <div style={{ width:160, flexShrink:0, borderRight:`1px solid ${G.border}`, background:G.card, overflowY:"auto", padding:"10px 8px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <span style={{ fontSize:12, fontWeight:600, color:G.text }}>Meine Makeovers</span>
            <button onClick={()=>setShowSaved(false)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:14, color:G.muted }}>✕</button>
          </div>
          <button onClick={()=>{ setSelSaved(null); setGenImg(null); setImgPreview(null); }} style={{ width:"100%", padding:"8px", borderRadius:10, background:G.al, border:`1px solid ${G.accent}`, color:G.accent, fontSize:12, fontWeight:600, cursor:"pointer", marginBottom:8 }}>+ Neues Makeover</button>
          {saved.map(s => (
            <div key={s.id} onClick={()=>{ setSelSaved(s); setGenImg(s.imgUrl); setImgPreview(s.original); setStil(""); }} style={{ marginBottom:8, cursor:"pointer", borderRadius:10, overflow:"hidden", border:`2px solid ${selSaved?.id===s.id?G.accent:G.border}` }}>
              <img src={s.imgUrl} alt="" style={{ width:"100%", display:"block" }} />
              <div style={{ padding:"4px 6px", background:G.bg }}>
                <div style={{ fontSize:11, fontWeight:600, color:G.text }}>{s.stilLabel}</div>
                <div style={{ fontSize:10, color:G.muted }}>{s.date}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Haupt-Bereich */}
      <div style={{ flex:1, overflowY:"auto", padding:"14px 16px" }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:G.text, fontWeight:700 }}>KI Makeover</div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>setShowSaved(!showSaved)} style={{ fontSize:12, padding:"5px 11px", borderRadius:20, background:saved.length>0?G.al:G.bg, border:`1px solid ${saved.length>0?G.accent:G.border}`, color:saved.length>0?G.accent:G.muted, cursor:"pointer" }}>
              {saved.length > 0 ? `${saved.length} gespeichert` : "Gespeichert"}
            </button>
          </div>
        </div>

        {/* Wunsch-Beschreibung */}
        <div style={{ marginBottom:14 }}>
          <input value={wunsch} onChange={e=>setWunsch(e.target.value)} placeholder="Wünsche beschreiben (optional)…" style={{ width:"100%", padding:"10px 13px", borderRadius:10, border:`1px solid ${G.border}`, background:G.bg, color:G.text, fontSize:13 }} />
        </div>

        {/* Stil-Auswahl */}
        <div style={{ fontSize:11, color:G.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:.5, marginBottom:10 }}>STIL</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
          {STIL_GRID.map(s => (
            <button key={s.id} onClick={()=>setStil(s.id)} style={{ padding:"10px 12px", borderRadius:12, border:`2px solid ${stil===s.id?G.accent:G.border}`, background:stil===s.id?G.al:G.card, color:stil===s.id?G.accent:G.sub, fontSize:13, cursor:"pointer", textAlign:"left", fontWeight:stil===s.id?600:400 }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Foto hochladen */}
        <div onClick={()=>fileRef.current?.click()} style={{ borderRadius:14, overflow:"hidden", border:`2px dashed ${imgPreview?G.accent:G.border}`, minHeight:180, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", background:G.bg, marginBottom:14, position:"relative" }}>
          {imgPreview
            ? <img src={imgPreview} alt="Dein Raum" style={{ width:"100%", display:"block" }} />
            : <div style={{ textAlign:"center", padding:24 }}>
                <div style={{ fontSize:28, marginBottom:8 }}>📷</div>
                <div style={{ fontSize:14, fontWeight:600, color:G.sub }}>Foto hochladen</div>
                <div style={{ fontSize:12, color:G.muted, marginTop:4 }}>Tippe um ein Bild auszuwählen</div>
              </div>}
        </div>
        <input type="file" ref={fileRef} accept="image/*" onChange={onFile} style={{ display:"none" }} />

        {/* Generieren Button */}
        <button onClick={generate} disabled={!imgPreview || generating} style={{ width:"100%", padding:"14px", borderRadius:14, background:imgPreview&&!generating?G.accent:"#ccc", color:"#fff", border:"none", fontSize:16, fontWeight:700, cursor:imgPreview&&!generating?"pointer":"default", marginBottom:16 }}>
          {generating ? "⏳ KI generiert… (15–30 Sek.)" : "✨ Makeover generieren"}
        </button>

        {/* Ergebnis */}
        {generating && (
          <div style={{ borderRadius:14, background:G.surface, border:`1px solid ${G.border}`, padding:32, textAlign:"center", marginBottom:16 }}>
            <Spin s={36} />
            <p style={{ marginTop:12, color:G.muted, fontSize:13 }}>KI verarbeitet dein Bild…</p>
          </div>
        )}
        {genImg && !generating && (
          <div className="fu" style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, color:G.muted, marginBottom:8, fontStyle:"italic" }}>✨ KI-Ergebnis – {STIL_GRID.find(s=>s.id===stil)?.label || "Makeover"}</div>
            <img src={genImg} alt="KI Makeover" style={{ width:"100%", borderRadius:14, display:"block", boxShadow:"0 4px 24px rgba(0,0,0,.1)" }} />
            <button onClick={generate} style={{ width:"100%", marginTop:10, padding:"10px", borderRadius:10, background:G.bg, border:`1px solid ${G.border}`, color:G.sub, fontSize:13, cursor:"pointer" }}>🔄 Nochmal generieren</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CHAT TAB (Anthropic API – braucht ANTHROPIC_API_KEY in Vercel) ───────────
const INITIAL_MSG = { role:"assistant", text:"Hallo! 👋 Ich bin RenoPilot – dein persönlicher Renovierungsberater.\n\n📷 Lade ein **Foto deines Raumes** hoch und ich analysiere:\n- Welche Materialien verbaut sind\n- Was du selbst schnell verbessern kannst\n- Konkrete Upgrade-Ideen\n- Welche Produkte du brauchst (mit Links)\n\nOder schreib einfach deine Frage!" };

function ChatTab() {
  const [msgs, setMsgs] = useState([INITIAL_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [imgFile, setImgFile] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const endRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("renopilot_chat");
      if (saved) { const p = JSON.parse(saved); if (Array.isArray(p) && p.length > 0) setMsgs(p); }
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("renopilot_chat", JSON.stringify(msgs.slice(-40))); } catch {}
    endRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [msgs]);

  const onFile = (e) => {
    const f = e.target.files[0]; if (!f) return;
    setImgFile(f);
    const r = new FileReader(); r.onload = ev => setImgPreview(ev.target.result); r.readAsDataURL(f);
  };

  const sendMsg = async (textOverride, previewOverride, mimeOverride) => {
    const userText = textOverride || input;
    const preview = previewOverride || imgPreview;
    if (!userText.trim() && !preview) return;
    setInput(""); setImgPreview(null); setImgFile(null);
    setMsgs(m => [...m, { role:"user", text:userText, img:preview }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ message: userText, imgBase64: preview, mimeType: mimeOverride || "image/jpeg" }),
      });
      const data = await res.json();
      setMsgs(m => [...m, { role:"assistant", text: data.reply || "Fehler – bitte erneut." }]);
    } catch { setMsgs(m => [...m, { role:"assistant", text:"Verbindungsfehler. Bitte erneut versuchen." }]); }
    setLoading(false);
  };

  const onFileAndSend = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => sendMsg("Analysiere dieses Foto meines Raumes detailliert.", ev.target.result, f.type);
    r.readAsDataURL(f);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <div style={{ flex:1, overflowY:"auto", padding:"16px" }}>
        {msgs.map((m, i) => (
          <div key={i} className="fu" style={{ marginBottom:14, display:"flex", flexDirection:"column", alignItems:m.role==="user"?"flex-end":"flex-start" }}>
            {m.role==="assistant" && <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}><div style={{ width:22, height:22, borderRadius:"50%", background:G.al, border:`1px solid ${G.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11 }}>🏠</div><span style={{ fontSize:11, color:G.muted, fontWeight:500 }}>RenoPilot</span></div>}
            {m.img && m.img !== "[Foto]" && <img src={m.img} alt="" style={{ maxWidth:220, borderRadius:12, marginBottom:6, boxShadow:"0 2px 12px rgba(0,0,0,.1)" }} />}
            <div style={{ maxWidth:"88%", padding:"11px 15px", borderRadius:m.role==="user"?"18px 18px 4px 18px":"4px 18px 18px 18px", background:m.role==="user"?G.accent:G.card, color:m.role==="user"?"#fff":G.text, fontSize:14, lineHeight:1.6, boxShadow:"0 1px 6px rgba(0,0,0,.07)", border:m.role==="assistant"?`1px solid ${G.border}`:"none" }}>
              <RenderText text={m.text} isUser={m.role==="user"} />
            </div>
          </div>
        ))}
        {loading && <div style={{ display:"flex", gap:8, alignItems:"center", padding:"4px 0 12px" }}><Spin s={18}/><span style={{ fontSize:13, color:G.muted, fontStyle:"italic" }}>RenoPilot analysiert…</span></div>}
        <div ref={endRef}/>
      </div>
      <div style={{ padding:"10px 16px", borderTop:`1px solid ${G.border}`, display:"flex", gap:8, alignItems:"flex-end", background:G.card }}>
        {imgPreview && <img src={imgPreview} alt="" style={{ width:42, height:42, borderRadius:8, objectFit:"cover", flexShrink:0, border:`2px solid ${G.accent}` }}/>}
        <button onClick={()=>fileRef.current?.click()} style={{ padding:"9px 11px", background:G.al, border:`1px solid ${G.border}`, borderRadius:10, cursor:"pointer", fontSize:16, flexShrink:0 }}>📷</button>
        <input type="file" ref={fileRef} accept="image/*" onChange={onFileAndSend} style={{ display:"none" }}/>
        <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg();}}} placeholder="Frage stellen, z.B. 'Wie streiche ich Wände?'" rows={1} style={{ flex:1, background:G.bg, border:`1px solid ${G.border}`, borderRadius:10, padding:"9px 13px", color:G.text, fontSize:14, resize:"none", minHeight:40, maxHeight:120 }}/>
        <button onClick={()=>sendMsg()} disabled={loading||!input.trim()} style={{ padding:"9px 16px", background:G.accent, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontSize:16, fontWeight:600, opacity:(loading||!input.trim())?.6:1, flexShrink:0 }}>→</button>
      </div>
    </div>
  );
}
  const [msgs, setMsgs] = useState([INITIAL_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [imgFile, setImgFile] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const [stilWahl, setStilWahl] = useState(null);
  const [genImg, setGenImg] = useState(null);
  const [genLoading, setGenLoading] = useState(false);
  const [lastUploadedImg, setLastUploadedImg] = useState(null);
  const endRef = useRef(null);
  const fileRef = useRef(null);

  // ── Chat aus localStorage laden
  useEffect(() => {
    try {
      const saved = localStorage.getItem("renopilot_chat");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setMsgs(parsed);
      }
    } catch {}
  }, []);

  // ── Chat in localStorage speichern (ohne Base64-Bilder – zu groß)
  useEffect(() => {
    try {
      const toSave = msgs.map(m => ({ ...m, img: m.img ? "[Foto]" : undefined }));
      localStorage.setItem("renopilot_chat", JSON.stringify(toSave.slice(-40)));
    } catch {}
    endRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [msgs]);

  // ── Foto hochladen → sofort analysieren
  const onFile = (e) => {
    const f = e.target.files[0]; if (!f) return;
    setImgFile(f);
    const r = new FileReader();
    r.onload = async (ev) => {
      const preview = ev.target.result;
      setImgPreview(preview);
      setLastUploadedImg(preview);
      // Sofort Analyse starten
      await analyseImage(preview, f.type);
    };
    r.readAsDataURL(f);
  };

  const analyseImage = async (preview, mimeType) => {
    const userMsg = { role:"user", text:"Foto hochgeladen – bitte analysieren.", img: preview };
    setMsgs(m => [...m, userMsg]);
    setImgPreview(null); setImgFile(null);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ message: "Analysiere dieses Foto meines Raumes detailliert: erkenne Materialien, Zustand, und gib mir konkrete Renovierungsempfehlungen mit Produktlinks.", imgBase64: preview, mimeType: mimeType || "image/jpeg" }),
      });
      const data = await res.json();
      setMsgs(m => [...m, { role:"assistant", text: data.reply || "Fehler – bitte erneut." }]);
    } catch { setMsgs(m => [...m, { role:"assistant", text:"Verbindungsfehler. Bitte erneut versuchen." }]); }
    setLoading(false);
  };

  const sendMsg = async () => {
    if (!input.trim()) return;
    const userText = input;
    setInput("");
    setMsgs(m => [...m, { role:"user", text:userText }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ message: userText }),
      });
      const data = await res.json();
      setMsgs(m => [...m, { role:"assistant", text: data.reply || "Fehler – bitte erneut." }]);
    } catch { setMsgs(m => [...m, { role:"assistant", text:"Verbindungsfehler." }]); }
    setLoading(false);
  };

  const genMakeover = async (stil) => {
    setStilWahl(stil); setGenLoading(true); setGenImg(null);
    try {
      const res = await fetch("/api/generate", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ stil, imgBase64: lastUploadedImg }),
      });
      const data = await res.json();
      if (data.imageUrl) setGenImg(data.imageUrl);
    } catch {}
    setGenLoading(false);
  };

  const clearChat = () => {
    setMsgs([INITIAL_MSG]);
    setGenImg(null); setStilWahl(null); setLastUploadedImg(null);
    try { localStorage.removeItem("renopilot_chat"); } catch {}
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px" }}>
        {msgs.map((m, i) => (
          <div key={i} className="fu" style={{ marginBottom:14, display:"flex", flexDirection:"column", alignItems:m.role==="user"?"flex-end":"flex-start" }}>
            {m.role==="assistant" && (
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                <div style={{ width:22, height:22, borderRadius:"50%", background:G.al, border:`1px solid ${G.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11 }}>🏠</div>
                <span style={{ fontSize:11, color:G.muted, fontWeight:500 }}>RenoPilot</span>
              </div>
            )}
            {m.img && m.img !== "[Foto]" && (
              <img src={m.img} alt="" style={{ maxWidth:220, borderRadius:12, marginBottom:6, boxShadow:"0 2px 12px rgba(0,0,0,.1)", border:`2px solid ${G.border}` }} />
            )}
            {m.img === "[Foto]" && (
              <div style={{ maxWidth:220, borderRadius:12, marginBottom:6, background:G.tag, border:`1px solid ${G.border}`, padding:"8px 12px", fontSize:12, color:G.muted }}>📷 Foto (nicht mehr im Speicher)</div>
            )}
            <div style={{ maxWidth:"88%", padding:"11px 15px", borderRadius:m.role==="user"?"18px 18px 4px 18px":"4px 18px 18px 18px", background:m.role==="user"?G.accent:G.card, color:m.role==="user"?"#fff":G.text, fontSize:14, lineHeight:1.6, boxShadow:"0 1px 6px rgba(0,0,0,.07)", border:m.role==="assistant"?`1px solid ${G.border}`:"none" }}>
              <RenderText text={m.text} isUser={m.role==="user"} />
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:"flex", gap:8, alignItems:"center", padding:"4px 0 12px" }}>
            <Spin s={18} />
            <span style={{ fontSize:13, color:G.muted, fontStyle:"italic" }}>RenoPilot analysiert…</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* KI-Makeover Stilauswahl */}
      <div style={{ padding:"10px 16px", borderTop:`1px solid ${G.border}`, background:G.surface }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <p style={{ fontSize:11, color:G.muted, fontStyle:"italic" }}>KI-Makeover generieren:</p>
          <button onClick={clearChat} style={{ fontSize:11, color:G.muted, background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>Chat leeren</button>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
          {STILE.map(s => (
            <button key={s.id} onClick={() => genMakeover(s.id)} style={{ padding:"5px 11px", borderRadius:20, border:`1px solid ${stilWahl===s.id?G.accent:G.border}`, background:stilWahl===s.id?G.al:G.card, color:stilWahl===s.id?G.accent:G.sub, fontSize:12, cursor:"pointer" }}>
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
        {(genLoading || genImg) && (
          <div style={{ borderRadius:12, overflow:"hidden", background:G.border, minHeight:160, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:4 }}>
            {genLoading
              ? <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, padding:24 }}><Spin s={28} /><span style={{ fontSize:13, color:G.muted }}>KI generiert Bild… (15–30 Sek.)</span></div>
              : <img src={genImg} alt="Makeover" style={{ width:"100%", display:"block" }} />}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding:"10px 16px", borderTop:`1px solid ${G.border}`, display:"flex", gap:8, alignItems:"flex-end", background:G.card }}>
        <button onClick={() => fileRef.current?.click()} title="Foto hochladen" style={{ padding:"9px 11px", background:G.al, border:`1px solid ${G.border}`, borderRadius:10, cursor:"pointer", fontSize:16, flexShrink:0 }}>📷</button>
        <input type="file" ref={fileRef} accept="image/*" onChange={onFile} style={{ display:"none" }} />
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
          placeholder="Frage stellen, z.B. 'Was kostet ein Bad renovieren?'"
          rows={1} style={{ flex:1, background:G.bg, border:`1px solid ${G.border}`, borderRadius:10, padding:"9px 13px", color:G.text, fontSize:14, resize:"none", minHeight:40, maxHeight:120, lineHeight:1.5 }} />
        <button onClick={sendMsg} disabled={loading || !input.trim()} style={{ padding:"9px 16px", background:G.accent, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontSize:16, fontWeight:600, opacity:(loading||!input.trim())?.6:1, flexShrink:0 }}>→</button>
      </div>
    </div>
  );
}

function IdeenTab() {
  const [filter, setFilter] = useState("Alle");
  const raeume = ["Alle","Bad","Küche","Wohnzimmer","Schlafzimmer","Boden"];
  const gefiltert = filter==="Alle" ? IDEEN : IDEEN.filter(i => i.raum===filter);
  return (
    <div style={{ overflowY:"auto", padding:"14px 16px" }}>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
        {raeume.map(r => (
          <button key={r} onClick={() => setFilter(r)} style={{ padding:"5px 13px", borderRadius:20, border:`1px solid ${filter===r?G.accent:G.border}`, background:filter===r?G.al:G.card, color:filter===r?G.accent:G.muted, fontSize:12, cursor:"pointer", fontWeight:filter===r?600:400 }}>{r}</button>
        ))}
      </div>
      {gefiltert.map(idee => (
        <div key={idee.id} className="fu" style={{ background:G.card, borderRadius:16, marginBottom:14, border:`1px solid ${G.border}`, overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,.04)" }}>
          <div style={{ position:"relative", height:170, overflow:"hidden" }}>
            <img src={idee.img} alt={idee.titel} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(0,0,0,.75) 0%,transparent 55%)" }} />
            <div style={{ position:"absolute", bottom:12, left:14, right:14 }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,.6)", marginBottom:2, textTransform:"uppercase", letterSpacing:1 }}>{idee.raum}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, color:"#fff", fontWeight:700 }}>{idee.titel}</div>
            </div>
            <div style={{ position:"absolute", top:12, right:12 }}><Badge level={idee.schwierigkeit} /></div>
          </div>
          <div style={{ padding:"12px 14px" }}>
            <p style={{ fontSize:13, color:G.sub, lineHeight:1.6, marginBottom:10 }}>{idee.beschreibung}</p>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
              {idee.tags.map(t => <span key={t} style={{ fontSize:11, padding:"3px 9px", background:G.tag, color:G.muted, borderRadius:20, border:`1px solid ${G.border}` }}>{t}</span>)}
              <span style={{ fontSize:11, padding:"3px 9px", background:G.gbg, color:G.green, borderRadius:20, marginLeft:"auto" }}>{idee.kosten}</span>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <a href={idee.youtube} target="_blank" rel="noopener noreferrer" style={{ flex:1, textAlign:"center", padding:"7px", borderRadius:8, background:G.rbg, color:G.red, fontSize:12, textDecoration:"none", fontWeight:500 }}>▶ YouTube</a>
              <a href={idee.amazon} target="_blank" rel="noopener noreferrer" style={{ flex:1, textAlign:"center", padding:"7px", borderRadius:8, background:G.al, color:G.accent, fontSize:12, textDecoration:"none", fontWeight:500 }}>🛒 Amazon</a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AnleitungenTab({ extra = [] }) {
  const [offen, setOffen] = useState(null);
  const [erledigt, setErledigt] = useState({});
  const alle = [...ANLEITUNGEN, ...extra];
  return (
    <div style={{ overflowY:"auto", padding:"14px 16px" }}>
      <p style={{ fontSize:12, color:G.muted, marginBottom:14, fontStyle:"italic" }}>Profi-Anleitungen aus Handwerker-Videos – Schritte abhaken während du arbeitest ({alle.length} Anleitungen)</p>
      {alle.map(a => {
        const done = a.schritte.filter((_, i) => erledigt[`${a.id}-${i}`]).length;
        const isOpen = offen===a.id;
        return (
          <div key={a.id} style={{ background:G.card, borderRadius:14, marginBottom:10, border:`1px solid ${isOpen?G.accent+"66":G.border}`, boxShadow:isOpen?`0 2px 16px ${G.accent}18`:"0 1px 4px rgba(0,0,0,.04)", overflow:"hidden" }}>
            <button onClick={() => setOffen(isOpen?null:a.id)} style={{ width:"100%", padding:"13px 14px", background:"transparent", border:"none", display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}>
              <div style={{ width:52, height:52, borderRadius:10, overflow:"hidden", flexShrink:0, border:`1px solid ${G.border}` }}>
                <img src={a.img} alt={a.titel} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              </div>
              <div style={{ flex:1, textAlign:"left" }}>
                <div style={{ fontSize:15, color:G.text, fontWeight:600 }}>{a.emoji} {a.titel}</div>
                <div style={{ display:"flex", gap:7, marginTop:5, flexWrap:"wrap" }}>
                  <Badge level={a.schwierigkeit} />
                  <Pill bg={G.bbg} color={G.blue}>⏱ {a.zeit}</Pill>
                  <Pill bg={G.gbg} color={G.green}>💶 {a.kosten}</Pill>
                </div>
              </div>
              {done > 0 && <div style={{ fontSize:12, color:G.green, fontWeight:600, flexShrink:0 }}>{done}/{a.schritte.length}</div>}
              <span style={{ fontSize:20, color:G.muted, transform:isOpen?"rotate(90deg)":"none", transition:"transform .2s", flexShrink:0 }}>›</span>
            </button>
            {isOpen && (
              <div className="fu" style={{ padding:"0 14px 16px" }}>
                <div style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:10, padding:"10px 13px", marginBottom:14 }}>
                  <div style={{ fontSize:11, color:G.accent, fontWeight:600, marginBottom:8, textTransform:"uppercase", letterSpacing:.5 }}>🔨 Werkzeug & Material</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {a.werkzeug.map(w => <span key={w} style={{ fontSize:12, padding:"3px 10px", background:G.tag, color:G.sub, borderRadius:20, border:`1px solid ${G.border}` }}>{w}</span>)}
                  </div>
                </div>
                <div style={{ fontSize:11, color:G.accent, fontWeight:600, marginBottom:10, textTransform:"uppercase", letterSpacing:.5 }}>📋 Schritt für Schritt</div>
                {a.schritte.map((s, idx) => {
                  const key = `${a.id}-${idx}`, d = erledigt[key];
                  return (
                    <div key={idx} onClick={() => setErledigt(prev => ({ ...prev, [key]:!prev[key] }))} style={{ display:"flex", gap:10, padding:"9px 11px", borderRadius:9, marginBottom:4, cursor:"pointer", background:d?G.gbg:G.surface, border:`1px solid ${d?G.green+"44":G.border}` }}>
                      <div style={{ width:24, height:24, borderRadius:"50%", flexShrink:0, border:`2px solid ${d?G.green:G.border}`, background:d?G.green:"transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:d?"#fff":G.muted, fontWeight:700 }}>{d?"✓":idx+1}</div>
                      <span style={{ fontSize:13, color:d?G.muted:G.sub, textDecoration:d?"line-through":"none", lineHeight:1.5 }}>{s}</span>
                    </div>
                  );
                })}
                <div style={{ background:G.al, border:`1px solid ${G.accent}33`, borderRadius:10, padding:"11px 13px", marginTop:10 }}>
                  <div style={{ fontSize:11, color:G.accent, fontWeight:600, marginBottom:4 }}>💡 Profi-Tipp</div>
                  <p style={{ fontSize:13, color:G.sub, lineHeight:1.6 }}>{a.tipp}</p>
                </div>
                <div style={{ background:G.rbg, border:`1px solid ${G.red}22`, borderRadius:10, padding:"11px 13px", marginTop:8 }}>
                  <div style={{ fontSize:11, color:G.red, fontWeight:600, marginBottom:4 }}>⚠️ Häufige Fehler</div>
                  <p style={{ fontSize:13, color:G.sub, lineHeight:1.6 }}>{a.fehler}</p>
                </div>
                <div style={{ display:"flex", gap:8, marginTop:10 }}>
                  <a href={a.youtube} target="_blank" rel="noopener noreferrer" style={{ flex:1, textAlign:"center", padding:"9px", borderRadius:9, background:G.rbg, color:G.red, fontSize:12, textDecoration:"none", fontWeight:600 }}>▶ Video anschauen</a>
                  <a href={a.amazon} target="_blank" rel="noopener noreferrer" style={{ flex:1, textAlign:"center", padding:"9px", borderRadius:9, background:G.al, color:G.accent, fontSize:12, textDecoration:"none", fontWeight:600 }}>🛒 Material kaufen</a>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InspoTab() {
  const [sel, setSel] = useState(null);
  return (
    <div style={{ overflowY:"auto", padding:"14px 16px" }}>
      {sel && (
        <div onClick={() => setSel(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.8)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ maxWidth:500, width:"100%" }}>
            <img src={sel.url.replace("w=400","w=800")} alt={sel.label} style={{ width:"100%", borderRadius:16, display:"block" }} />
            <p style={{ textAlign:"center", color:"#fff", marginTop:10, fontSize:14 }}>{sel.label}</p>
          </div>
        </div>
      )}
      <div style={{ columns:2, gap:10 }}>
        {INSPO.map((img, i) => (
          <div key={i} onClick={() => setSel(img)} className="fu" style={{ marginBottom:10, borderRadius:12, overflow:"hidden", cursor:"pointer", breakInside:"avoid", border:`1px solid ${G.border}`, boxShadow:"0 1px 6px rgba(0,0,0,.06)" }}>
            <img src={img.url} alt={img.label} style={{ width:"100%", display:"block" }} />
            <div style={{ background:G.card, padding:"6px 10px", fontSize:11, color:G.muted, fontWeight:500 }}>{img.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const PREISE = {
  bad:{name:"Bad komplett",low:350,high:900}, kueche:{name:"Küche komplett",low:250,high:700},
  wohnzimmer:{name:"Wohnzimmer",low:100,high:300}, schlafzimmer:{name:"Schlafzimmer",low:80,high:250},
  streichen:{name:"Nur streichen",low:15,high:40}, boden:{name:"Neuer Boden",low:30,high:150},
};
function RechnerTab() {
  const [m2, setM2] = useState(20); const [typ, setTyp] = useState("bad");
  const p=PREISE[typ], low=Math.round(m2*p.low), high=Math.round(m2*p.high), mid=Math.round((low+high)/2);
  return (
    <div style={{ overflowY:"auto", padding:"16px" }}>
      <div style={{ background:G.card, borderRadius:14, padding:16, marginBottom:12, border:`1px solid ${G.border}` }}>
        <div style={{ fontSize:12, color:G.muted, fontWeight:600, marginBottom:12, textTransform:"uppercase", letterSpacing:.5 }}>Renovierungstyp</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
          {Object.entries(PREISE).map(([k,v]) => (
            <button key={k} onClick={() => setTyp(k)} style={{ padding:"6px 13px", borderRadius:20, border:`1px solid ${typ===k?G.accent:G.border}`, background:typ===k?G.al:G.bg, color:typ===k?G.accent:G.muted, fontSize:12, cursor:"pointer", fontWeight:typ===k?600:400 }}>{v.name}</button>
          ))}
        </div>
      </div>
      <div style={{ background:G.card, borderRadius:14, padding:16, marginBottom:12, border:`1px solid ${G.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}><span style={{ fontSize:13, color:G.muted }}>Fläche</span><span style={{ fontSize:16, color:G.accent, fontWeight:700 }}>{m2} m²</span></div>
        <input type="range" min={5} max={100} value={m2} onChange={e => setM2(+e.target.value)} style={{ width:"100%", accentColor:G.accent }} />
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}><span style={{ fontSize:11, color:G.muted }}>5 m²</span><span style={{ fontSize:11, color:G.muted }}>100 m²</span></div>
      </div>
      <div style={{ background:G.card, borderRadius:14, padding:20, border:`1px solid ${G.border}` }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:G.text, marginBottom:18, textAlign:"center" }}>Kosten für {p.name} ({m2} m²)</div>
        <div style={{ display:"flex", justifyContent:"space-around", marginBottom:16 }}>
          <div style={{ textAlign:"center" }}><div style={{ fontSize:11, color:G.muted, marginBottom:4 }}>Minimum</div><div style={{ fontSize:22, fontWeight:700, color:G.green }}>{low.toLocaleString()}€</div></div>
          <div style={{ textAlign:"center", borderLeft:`1px solid ${G.border}`, borderRight:`1px solid ${G.border}`, padding:"0 20px" }}><div style={{ fontSize:11, color:G.muted, marginBottom:4 }}>Realistisch</div><div style={{ fontSize:28, fontWeight:700, color:G.accent }}>{mid.toLocaleString()}€</div></div>
          <div style={{ textAlign:"center" }}><div style={{ fontSize:11, color:G.muted, marginBottom:4 }}>Premium</div><div style={{ fontSize:22, fontWeight:700, color:G.red }}>{high.toLocaleString()}€</div></div>
        </div>
        <p style={{ fontSize:11, color:G.muted, textAlign:"center", fontStyle:"italic" }}>Inkl. Material, Werkzeug, Handwerker. Ohne Möbel.</p>
      </div>
    </div>
  );
}

const PHASEN = [
  {titel:"Planung & Budget",aufgaben:["Budget festlegen","Angebote einholen","Genehmigung prüfen","Zeitplan erstellen"]},
  {titel:"Vorbereitung",aufgaben:["Möbel ausräumen","Wasser/Strom abdrehen","Schutzmaterial auslegen","Werkzeug besorgen"]},
  {titel:"Abriss",aufgaben:["Altes entfernen","Mängel dokumentieren","Entsorgung","Wände + Boden prüfen"]},
  {titel:"Installation",aufgaben:["Elektro prüfen/erneuern","Sanitär vorbereiten","Wandreparaturen","Abdichtung"]},
  {titel:"Oberflächen",aufgaben:["Fliesen legen","Spachteln + schleifen","Streichen","Boden verlegen"]},
  {titel:"Einbau",aufgaben:["Sanitär einbauen","Armaturen montieren","Elektro abschließen","Möbel aufbauen"]},
  {titel:"Finishing",aufgaben:["Silikon erneuern","Fugen","Beleuchtung","Accessoires"]},
  {titel:"Abnahme",aufgaben:["Alles prüfen","Mängel abarbeiten","Reinigung","Fotos machen"]},
];
function PlanerTab() {
  const [done, setDone] = useState({});
  const total = PHASEN.reduce((s,p) => s+p.aufgaben.length, 0);
  const checked = Object.values(done).filter(Boolean).length;
  const pct = Math.round((checked/total)*100);
  return (
    <div style={{ overflowY:"auto", padding:"14px 16px" }}>
      <div style={{ background:G.card, borderRadius:14, padding:16, marginBottom:14, border:`1px solid ${G.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}><span style={{ fontSize:13, color:G.muted }}>Gesamtfortschritt</span><span style={{ fontSize:16, color:G.accent, fontWeight:700 }}>{pct}%</span></div>
        <div style={{ height:7, background:G.border, borderRadius:4 }}><div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(to right,${G.accent},#E8855A)`, borderRadius:4, transition:"width .4s" }} /></div>
        <p style={{ fontSize:11, color:G.muted, marginTop:6 }}>{checked} von {total} Aufgaben erledigt</p>
      </div>
      {PHASEN.map((phase, pi) => {
        const phDone = phase.aufgaben.filter((_,ai) => done[`${pi}-${ai}`]).length;
        const all = phDone===phase.aufgaben.length;
        return (
          <div key={pi} style={{ background:G.card, borderRadius:12, marginBottom:10, border:`1px solid ${all?G.green+"44":G.border}`, overflow:"hidden" }}>
            <div style={{ padding:"10px 14px", background:all?G.gbg:G.surface, display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${G.border}` }}>
              <span style={{ fontSize:14, color:all?G.green:G.text, fontWeight:600 }}>Phase {pi+1}: {phase.titel}</span>
              <span style={{ fontSize:12, color:all?G.green:G.muted, fontWeight:600 }}>{phDone}/{phase.aufgaben.length}{all?" ✓":""}</span>
            </div>
            <div style={{ padding:"8px 14px" }}>
              {phase.aufgaben.map((auf, ai) => {
                const k=`${pi}-${ai}`, d=done[k];
                return (
                  <label key={ai} onClick={() => setDone(prev => ({ ...prev, [k]:!prev[k] }))} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", cursor:"pointer", borderBottom:ai<phase.aufgaben.length-1?`1px solid ${G.border}`:"none" }}>
                    <div style={{ width:20, height:20, borderRadius:6, flexShrink:0, border:`2px solid ${d?G.green:G.border}`, background:d?G.green:"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {d && <span style={{ color:"#fff", fontSize:11, fontWeight:700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize:13, color:d?G.muted:G.sub, textDecoration:d?"line-through":"none" }}>{auf}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── NEUE ANLEITUNGEN (zusätzlich zu den 8 bestehenden) ──────────────────────
const ANLEITUNGEN_EXTRA = [
  { id:"tapezieren", emoji:"🖼️", titel:"Tapete entfernen & neu tapezieren", schwierigkeit:"Leicht", zeit:"1–2 Tage", kosten:"20–80€", img:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&q=80", werkzeug:["Tapeziertisch","Tapezierbürste","Tapezierpaste","Cuttermesser","Wasserwalze"], schritte:["Alte Tapete einweichen: Wasser + Spülmittel mit Walze auftragen, 15 Min. warten","Tapete in langen Streifen von oben nach unten abziehen","Kleisterreste nass abwischen, Untergrund trocknen lassen","Neue Tapete messen: Raumhöhe + 5cm Zugabe oben und unten","Kleister anrühren (Herstellerangaben beachten), auf Tapete auftragen","Tapete einschlagen, 5 Min. einweichen lassen (Angabe auf Verpackung)","Von oben nach unten ansetzen, Luftblasen mit Bürste herausstreichen","Überschuss an Decke und Boden mit Cuttermesser abschneiden"], tipp:"Immer in Richtung des Fensterlichts tapezieren – Stöße werden unsichtbar.", fehler:"Zu kurze Einweichzeit (Tapete reißt), Luftblasen nicht rausstreichen, falsche Stärke Kleister.", youtube:"https://www.youtube.com/results?search_query=tapete+entfernen+tapezieren+anleitung", amazon:"https://www.amazon.de/s?k=tapezierpaste+tapezierbürste+set&tag=renopilot-21" },
  { id:"fugenreinigen", emoji:"🧹", titel:"Fugen reinigen & auffrischen", schwierigkeit:"Leicht", zeit:"2–4 Stunden", kosten:"15–40€", img:"https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=120&q=80", werkzeug:["Fugenreiniger (Chlor-frei)","Fugenbürste","Dampfreiniger (optional)","Fugenstift weiß","Schleifklotz"], schritte:["Fugenreiniger auftragen, 10–15 Min. einwirken lassen","Mit Fugenbürste kräftig schrubben – kleine Kreisbewegungen","Dampfreiniger für hartnäckige Stellen nutzen (sehr effektiv)","Gründlich abspülen, Fläche trocknen lassen","Wenn Fugen grau/gelblich: Fugenstift auftragen wie einen Marker","Bei komplett verfärbten Fugen: ausschleifen und neu verfugen","Abschluss: Fugenschutz-Spray auftragen (verhindert Schmutz)"], tipp:"Dampfreiniger ist das effektivste Werkzeug – leihen statt kaufen für einmalige Nutzung.", fehler:"Chlorhaltige Reiniger auf farbigen Fliesen, Fugen nicht vollständig trocknen lassen vor Stift.", youtube:"https://www.youtube.com/results?search_query=fugen+reinigen+auffrischen+anleitung", amazon:"https://www.amazon.de/s?k=fugenreiniger+fugenstift+weiß&tag=renopilot-21" },
  { id:"kueche-fronten", emoji:"🍳", titel:"Küchenfronten austauschen", schwierigkeit:"Leicht", zeit:"1 Tag", kosten:"200–800€", img:"https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=120&q=80", werkzeug:["Akkuschrauber","Kreuzschlitzschrauber","Wasserwaage","Maßband","Scharnier-Einstellwerkzeug"], schritte:["Alte Fronten abschrauben: Scharniere lösen (meist 2 Schrauben pro Scharnier)","Scharniere auf neue Fronten montieren – gleiche Position messen","Neue Front einhängen, noch nicht festschrauben","Spaltmaß prüfen: 2–3mm gleichmäßig rundum mit Wasserwaage","Scharniere in 3 Richtungen justieren (Tiefe, Höhe, Seite)","Erst wenn alles passt: alle Schrauben fest anziehen","Griffe montieren: Position mit Schablone anzeichnen, bohren"], tipp:"Küchenfronten sind oft günstig als IKEA-Aftermarket (z.B. Semihandmade). Fronten-Tausch = halbe neue Küche für 10% des Preises.", fehler:"Scharniere falsch justiert (Front klemmt), Schablone für Griffe nicht genutzt.", youtube:"https://www.youtube.com/results?search_query=küchenfronten+austauschen+anleitung", amazon:"https://www.amazon.de/s?k=küchenfronten+scharnier+set&tag=renopilot-21" },
  { id:"trockenbau", emoji:"🔩", titel:"Trockenbauwand bauen", schwierigkeit:"Mittel", zeit:"1–2 Tage", kosten:"80–200€", img:"https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=120&q=80", werkzeug:["Metallprofil-Schere","Akkuschrauber","Wasserwaage + Lot","Rigipsplatten","Schrauben 3,5×35mm"], schritte:["Raumhöhe messen, Bodenprofile (UW) mit Lot ausrichten und verschrauben","Deckenprofile parallel dazu befestigen","Vertikale Ständerprofile (CW) alle 62,5cm einsetzen (Plattenbreite 125cm = 2 Felder)","Elektriker-Leerrohr jetzt einziehen wenn Steckdosen geplant","Erste Lage Rigips verschrauben: Schrauben alle 25cm, 10mm vom Rand","Mineralwolle als Dämmung einlegen (Schall + Wärme)","Zweite Seite beplanken","Fugen verspachteln: Fugenband einlegen, Q1 + Q2 Spachtel"], tipp:"CW-Profile alle 62,5cm = perfekter Raster für 125cm-Platten. Nie improvisieren – sonst Fugen mitten im Feld.", fehler:"Ständer falsch messen (Fugen in Feldmitte), keine Dämmung einlegen, Schrauben zu tief (Platte beschädigt).", youtube:"https://www.youtube.com/results?search_query=trockenbauwand+bauen+anleitung", amazon:"https://www.amazon.de/s?k=rigips+ständerwerk+set&tag=renopilot-21" },
  { id:"parkett-schleifen", emoji:"🪵", titel:"Parkett schleifen & ölen", schwierigkeit:"Mittel", zeit:"2–3 Tage", kosten:"80–300€", img:"https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=120&q=80", werkzeug:["Parkettschleifer (leihen!)","Deltaschleifer für Ecken","Schleifpapier 40/80/120er","Naturöl oder Versiegelung","Parkettrolle"], schritte:["Raum komplett leeren, alle Nägel versenken (Schleifer beschädigen sonst)","Erste Runde: grobes Papier 40er diagonal zur Maserung","Zweite Runde: 80er entlang der Maserung","Dritte Runde: 120er für Feinschliff","Ecken mit Deltaschleifer manuell nacharbeiten","Gründlich saugen + feucht wischen, 2h trocknen","Öl auftragen: dünn, mit Rolle, in Maserungsrichtung","Nach 12h zweite Ölschicht, nach 24h begehbar"], tipp:"Parkettschleifer im Baumarkt leihen – 2 Tage reichen. Schutzmaske Pflicht (Feinstaub!).", fehler:"Nägel nicht versenken (Schleifblatt reißt), zu dicke Ölschicht (trocknet nie), Ecken vergessen.", youtube:"https://www.youtube.com/results?search_query=parkett+schleifen+ölen+anleitung", amazon:"https://www.amazon.de/s?k=parkett+naturöl+hartwachs&tag=renopilot-21" },
  { id:"fenster-abdichten", emoji:"🪟", titel:"Fenster abdichten & dämmen", schwierigkeit:"Leicht", zeit:"2–4 Stunden", kosten:"20–60€", img:"https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=120&q=80", werkzeug:["Dichtungsband selbstklebend","Acryl-Dichtstoff","Silikonpistole","Cuttermesser","Isopropanol"], schritte:["Alte Dichtungen im Falz prüfen: eindrücken – federt es zurück? Wenn nicht: erneuern","Alte Gummidichtung aus Nut ziehen (oft nur eingelegt)","Neue Moosgummi-Dichtung in passender Breite einlegen","Außenfuge prüfen: Acryl aufgebraucht oder gerissen?","Alte Außenfuge mit Cuttermesser entfernen, Untergrund säubern","Neues Acryl einspritzen, glatt abziehen, nach 2h übermalen","Innenfuge zwischen Rahmen und Wand: Kompriband einlegen"], tipp:"Fensterdichtungen alle 10–15 Jahre erneuern. Kosten 5€, sparen 15% Heizenergie.", fehler:"Falsches Dichtungsmaß (zu dünn = Zugluft, zu dick = Fenster schließt nicht), Acryl auf fettigem Untergrund.", youtube:"https://www.youtube.com/results?search_query=fenster+abdichten+dämmen+anleitung", amazon:"https://www.amazon.de/s?k=fensterdichtung+moosgummi+selbstklebend&tag=renopilot-21" },
  { id:"aussenputz", emoji:"🧱", titel:"Risse im Außenputz reparieren", schwierigkeit:"Mittel", zeit:"1 Tag", kosten:"30–100€", img:"https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=120&q=80", werkzeug:["Flex mit Trennscheibe","Putzspachtel","Außenputz-Reparaturmasse","Gewebe-Armierungsband","Grundierung"], schritte:["Riss aufweiten: mit Flex V-förmig aufschlitzen (besser Haftung)","Losen Putz komplett entfernen, Untergrund abbürsten","Grundierung auftragen, 30 Min. trocknen lassen","Armierungsband in Riss einlegen (verhindert Wiederaufreißen)","Reparaturmasse in zwei Schichten einarbeiten","Erste Schicht leicht eindrücken, trocknen lassen (2h)","Zweite Schicht bündig abglätten, Oberfläche strukturieren","Nach 24h: Fassadenfarbe in passendem Farbton auftragen"], tipp:"Risse >3mm immer aufschlitzen. Zugekleisterter Riss reißt nach einem Winter wieder auf.", fehler:"Riss nicht aufweiten, kein Armierungsband, Farbton nicht anpassen.", youtube:"https://www.youtube.com/results?search_query=außenputz+riss+reparieren+anleitung", amazon:"https://www.amazon.de/s?k=außenputz+reparatur+set&tag=renopilot-21" },
  { id:"duschkabine", emoji:"🚿", titel:"Duschkabine einbauen", schwierigkeit:"Mittel", zeit:"1 Tag", kosten:"150–600€", img:"https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=120&q=80", werkzeug:["Wasserwaage","Akkuschrauber","Dübel + Schrauben","Sanitär-Silikon","Metallsäge (optional)"], schritte:["Duschkabine komplett auspacken, Teile laut Anleitung sortieren","Duschwanne / Duschtasse einbauen: Füße justieren bis waagerecht","Ablauf anschließen und auf Dichtigkeit testen (Wasser einlaufen lassen)","Wandprofil anzeichnen: senkrecht mit Lot, an Wand dübeln","Glaselemente einhängen / einsetzen","Alle Verbindungen mit Sanitär-Silikon abdichten (Wanne + Wand)","Türen einhängen und Öffnungsmechanismus prüfen","24h aushärten lassen, dann Wassertest"], tipp:"Duschwanne IMMER mit Wasser füllen bevor du abdichtest – sie gibt unter Last nach.", fehler:"Wanne nicht waagerecht, Ablauf nicht getestet, Silikon auf nasser Fläche.", youtube:"https://www.youtube.com/results?search_query=duschkabine+einbauen+anleitung", amazon:"https://www.amazon.de/s?k=duschkabine+dichtband&tag=renopilot-21" },
];

// ─── HANDWERKER TAB ───────────────────────────────────────────────────────────
const HW_KATEGORIEN = [
  { id:"sanitaer", label:"Sanitär", emoji:"🚿", beschreibung:"Badumbau, Rohre, Heizung" },
  { id:"elektro", label:"Elektro", emoji:"⚡", beschreibung:"Leitungen, Sicherungskasten" },
  { id:"fliesen", label:"Fliesenleger", emoji:"⬛", beschreibung:"Boden- & Wandfliesen" },
  { id:"maler", label:"Maler", emoji:"🖌️", beschreibung:"Streichen, Spachteln, Tapete" },
  { id:"schreiner", label:"Schreiner", emoji:"🪵", beschreibung:"Einbauschränke, Parkett, Türen" },
  { id:"trockenbau", label:"Trockenbau", emoji:"🔩", beschreibung:"Wände, Decken, Verkleidungen" },
  { id:"estrich", label:"Estrich", emoji:"🧱", beschreibung:"Unterböden, Ausgleich" },
  { id:"fenster", label:"Fenster & Türen", emoji:"🪟", beschreibung:"Einbau, Abdichtung, Tausch" },
];

const HW_BEISPIELE = [
  { name:"Thomas Müller Sanitär GmbH", kat:"sanitaer", plz:"80331", ort:"München", rating:4.8, jobs:127, tel:"+49 89 123456", beschreibung:"Spezialist für Badumbau und Heizungsanlagen. Kostenloser Vor-Ort-Termin.", verified:true },
  { name:"Elektro Schreiber", kat:"elektro", plz:"80469", ort:"München", rating:4.9, jobs:203, tel:"+49 89 234567", beschreibung:"Zertifizierter Elektroinstallateur, Smart Home Spezialist.", verified:true },
  { name:"Fliesen Kovac", kat:"fliesen", plz:"80336", ort:"München", rating:4.7, jobs:89, tel:"+49 89 345678", beschreibung:"Großformat-Experte, auch Naturstein und Mikrozement.", verified:true },
  { name:"Malerbetrieb Huber", kat:"maler", plz:"80797", ort:"München", rating:4.6, jobs:156, tel:"+49 89 456789", beschreibung:"Alles rund ums Streichen, Spachteln und Tapezieren.", verified:false },
  { name:"Schreinerei Weber", kat:"schreiner", plz:"80687", ort:"München", rating:4.9, jobs:64, tel:"+49 89 567890", beschreibung:"Maßmöbel, Einbauküchen, Parkett verlegen.", verified:true },
];

function HandwerkerTab() {
  const [selKat, setSelKat] = useState(null);
  const [plz, setPlz] = useState("");
  const [anfrage, setAnfrage] = useState(null);

  const gefiltert = HW_BEISPIELE.filter(h => !selKat || h.kat === selKat);

  return (
    <div style={{ overflowY:"auto", padding:"14px 16px" }}>
      {/* Intro Banner */}
      <div style={{ background:`linear-gradient(135deg, ${G.al}, ${G.card})`, border:`1px solid ${G.border}`, borderRadius:14, padding:"14px 16px", marginBottom:16 }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:G.text, fontWeight:700, marginBottom:4 }}>🔨 Handwerker in deiner Nähe</div>
        <p style={{ fontSize:13, color:G.sub, lineHeight:1.5 }}>Geprüfte Fachbetriebe die RenoPilot-Partner sind. Alle Betriebe wurden verifiziert und von echten Kunden bewertet.</p>
      </div>

      {/* PLZ Suche */}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        <input value={plz} onChange={e => setPlz(e.target.value)} placeholder="PLZ oder Ort eingeben…" style={{ flex:1, padding:"10px 13px", borderRadius:10, border:`1px solid ${G.border}`, background:G.bg, color:G.text, fontSize:14 }} />
        <button style={{ padding:"10px 16px", background:G.accent, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontSize:14, fontWeight:600 }}>Suchen</button>
      </div>

      {/* Kategorien */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
        {HW_KATEGORIEN.map(k => (
          <button key={k.id} onClick={() => setSelKat(selKat===k.id ? null : k.id)} style={{ padding:"10px 12px", borderRadius:12, border:`1px solid ${selKat===k.id?G.accent:G.border}`, background:selKat===k.id?G.al:G.card, cursor:"pointer", textAlign:"left", boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
            <div style={{ fontSize:18, marginBottom:3 }}>{k.emoji}</div>
            <div style={{ fontSize:13, color:selKat===k.id?G.accent:G.text, fontWeight:600 }}>{k.label}</div>
            <div style={{ fontSize:11, color:G.muted }}>{k.beschreibung}</div>
          </button>
        ))}
      </div>

      {/* Ergebnisse */}
      <div style={{ fontSize:12, color:G.muted, marginBottom:10, fontStyle:"italic" }}>
        {selKat ? `${gefiltert.length} Betrieb${gefiltert.length!==1?"e":""} gefunden` : `Alle ${gefiltert.length} Partner-Betriebe`}
      </div>

      {gefiltert.map((h, i) => (
        <div key={i} className="fu" style={{ background:G.card, borderRadius:14, marginBottom:10, border:`1px solid ${G.border}`, padding:"14px", boxShadow:"0 1px 6px rgba(0,0,0,.04)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                <span style={{ fontSize:14, fontWeight:700, color:G.text }}>{h.name}</span>
                {h.verified && <span style={{ fontSize:10, background:G.gbg, color:G.green, padding:"2px 7px", borderRadius:20, fontWeight:600 }}>✓ Geprüft</span>}
              </div>
              <div style={{ fontSize:12, color:G.muted }}>{h.plz} {h.ort}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:14, color:G.accent, fontWeight:700 }}>★ {h.rating}</div>
              <div style={{ fontSize:11, color:G.muted }}>{h.jobs} Aufträge</div>
            </div>
          </div>
          <p style={{ fontSize:13, color:G.sub, lineHeight:1.5, marginBottom:10 }}>{h.beschreibung}</p>
          <div style={{ display:"flex", gap:8 }}>
            <a href={`tel:${h.tel}`} style={{ flex:1, textAlign:"center", padding:"8px", borderRadius:9, background:G.gbg, color:G.green, fontSize:12, textDecoration:"none", fontWeight:600, border:`1px solid ${G.green}33` }}>📞 Anrufen</a>
            <button onClick={() => setAnfrage(h)} style={{ flex:1, padding:"8px", borderRadius:9, background:G.al, color:G.accent, fontSize:12, fontWeight:600, border:`1px solid ${G.accent}33`, cursor:"pointer" }}>✉️ Anfrage</button>
          </div>
        </div>
      ))}

      {/* Betrieb eintragen CTA */}
      <div style={{ background:G.surface, border:`2px dashed ${G.border}`, borderRadius:14, padding:"16px", textAlign:"center", marginTop:8 }}>
        <div style={{ fontSize:20, marginBottom:6 }}>🏢</div>
        <div style={{ fontSize:14, fontWeight:700, color:G.text, marginBottom:4 }}>Bist du Handwerker?</div>
        <p style={{ fontSize:12, color:G.muted, marginBottom:12, lineHeight:1.5 }}>Werde RenoPilot-Partner und erhalte direkte Anfragen von Kunden in deiner Region.</p>
        <button style={{ padding:"9px 20px", background:G.accent, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontSize:13, fontWeight:600 }}>Jetzt kostenlos eintragen</button>
      </div>

      {/* Anfrage Modal */}
      {anfrage && (
        <div onClick={() => setAnfrage(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:300, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background:G.card, borderRadius:"20px 20px 0 0", padding:"20px 20px 32px", width:"100%", maxWidth:600 }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, color:G.text, marginBottom:4 }}>Anfrage an {anfrage.name}</div>
            <p style={{ fontSize:12, color:G.muted, marginBottom:14 }}>Beschreib kurz was du renovieren möchtest:</p>
            <textarea placeholder="z.B. Bad 8m², Fliesen erneuern, Dusche einbauen…" rows={3} style={{ width:"100%", padding:"10px 13px", borderRadius:10, border:`1px solid ${G.border}`, background:G.bg, color:G.text, fontSize:14, resize:"none", marginBottom:12 }} />
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setAnfrage(null)} style={{ flex:1, padding:"11px", borderRadius:10, background:G.bg, border:`1px solid ${G.border}`, color:G.muted, cursor:"pointer", fontSize:14 }}>Abbrechen</button>
              <button onClick={() => setAnfrage(null)} style={{ flex:2, padding:"11px", borderRadius:10, background:G.accent, border:"none", color:"#fff", cursor:"pointer", fontSize:14, fontWeight:600 }}>Anfrage senden →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TABS = [
  {label:"Makeover",icon:"✨"},{label:"Chat",icon:"💬"},{label:"Ideen",icon:"💡"},
  {label:"Anleitungen",icon:"📋"},{label:"Inspo",icon:"🖼️"},
  {label:"Profis",icon:"🔨"},{label:"Rechner",icon:"🧮"},{label:"Planer",icon:"📅"},
];

export default function Home() {
  const [tab, setTab] = useState(0);
  return (
    <>
      <Head>
        <title>RenoPilot – KI Renovierungsberater</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="description" content="KI-Renovierungsplaner: Makeover generieren, Anleitungen & Ideen." />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:G.bg, maxWidth:600, margin:"0 auto" }}>
        <div style={{ padding:"12px 18px 10px", borderBottom:`1px solid ${G.border}`, background:G.card, display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:G.al, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🏠</div>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, color:G.text, fontWeight:700, letterSpacing:"-0.3px" }}>RenoPilot</div>
            <div style={{ fontSize:10, color:G.muted, fontStyle:"italic" }}>KI-Renovierungsberater</div>
          </div>
          <div style={{ marginLeft:"auto" }}><Pill size={11}>Beta</Pill></div>
        </div>
        <div style={{ display:"flex", overflowX:"auto", borderBottom:`1px solid ${G.border}`, background:G.card, flexShrink:0 }}>
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)} style={{ flex:"0 0 auto", padding:"9px 11px", background:"transparent", border:"none", borderBottom:`2px solid ${tab===i?G.accent:"transparent"}`, color:tab===i?G.accent:G.muted, cursor:"pointer", fontSize:10, fontWeight:tab===i?600:400, display:"flex", flexDirection:"column", alignItems:"center", gap:2, minWidth:60, transition:"color .15s" }}>
              <span style={{ fontSize:16 }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
        <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
          {tab===0 && <MakeoverTab />}
          {tab===1 && <ChatTab />}
          {tab===2 && <IdeenTab />}
          {tab===3 && <AnleitungenTab extra={ANLEITUNGEN_EXTRA} />}
          {tab===4 && <InspoTab />}
          {tab===5 && <HandwerkerTab />}
          {tab===6 && <RechnerTab />}
          {tab===7 && <PlanerTab />}
        </div>
      </div>
    </>
  );
}
