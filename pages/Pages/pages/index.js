import { useState, useRef } from “react”;
import Head from “next/head”;

const STILE = [
{ id: “bad-modern”,    emoji: “🚿”, label: “Bad: Modern & Spa” },
{ id: “bad-warm”,      emoji: “🚿”, label: “Bad: Hell & Warm” },
{ id: “bad-mikro”,     emoji: “🚿”, label: “Bad: Mikrozement” },
{ id: “kueche-navy”,   emoji: “🍳”, label: “Küche: Navy & Holz” },
{ id: “kueche-grau”,   emoji: “🍳”, label: “Küche: Seidengrau” },
{ id: “kueche-gruen”,  emoji: “🍳”, label: “Küche: Salbeigrün” },
{ id: “wohn-gruen”,    emoji: “🛋️”, label: “Wohnzimmer: Dunkelgrün” },
{ id: “wohn-terra”,    emoji: “🛋️”, label: “Wohnzimmer: Terrakotta” },
{ id: “schlaf-terra”,  emoji: “🛏️”, label: “Schlafzimmer: Terrakotta” },
{ id: “schlaf-dunkel”, emoji: “🛏️”, label: “Schlafzimmer: Dunkel” },
{ id: “terrasse-wpc”,  emoji: “🌿”, label: “Terrasse: WPC & Lounge” },
];

const C = { accent: “#C4622D”, bg: “#F8F5F0”, card: “#fff”, border: “#EDE8DF”, muted: “#888”, text: “#1A1A1A” };

function compressImage(file, maxSize = 1024) {
return new Promise((resolve) => {
const img = new Image();
img.onload = () => {
const canvas = document.createElement(“canvas”);
let w = img.width, h = img.height;
if (w > h && w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize; }
else if (h > maxSize) { w = Math.round(w * maxSize / h); h = maxSize; }
canvas.width = w; canvas.height = h;
canvas.getContext(“2d”).drawImage(img, 0, 0, w, h);
canvas.toBlob((blob) => {
const reader = new FileReader();
reader.onload = () => resolve(reader.result.split(”,”)[1]);
reader.readAsDataURL(blob);
}, “image/jpeg”, 0.85);
};
img.src = URL.createObjectURL(file);
});
}

function renderMarkdown(text) {
return text
.split(”\n”)
.map((line, i) => {
if (line.startsWith(”## “)) return <h2 key={i} style={{ fontSize: 18, fontWeight: 700, color: C.accent, margin: “20px 0 8px” }}>{line.slice(3)}</h2>;
if (line.startsWith(”### “)) return <h3 key={i} style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: “14px 0 6px” }}>{line.slice(4)}</h3>;
if (line.startsWith(”- “)) return <p key={i} style={{ fontSize: 14, color: C.text, padding: “3px 0 3px 16px”, lineHeight: 1.6 }}>{”• “ + line.slice(2)}</p>;
if (line.startsWith(”| “)) return null;
if (line.trim() === “”) return <div key={i} style={{ height: 6 }} />;
return <p key={i} style={{ fontSize: 14, color: “#444”, lineHeight: 1.7 }}>{line}</p>;
});
}

export default function Home() {
const [file, setFile] = useState(null);
const [vorherUrl, setVorherUrl] = useState(null);
const [plan, setPlan] = useState(null);
const [stil, setStil] = useState(“bad-modern”);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [progress, setProgress] = useState(0);
const fileRef = useRef();

function handleDatei(e) {
const f = e.target.files[0];
if (!f) return;
setFile(f);
setVorherUrl(URL.createObjectURL(f));
setPlan(null);
setError(null);
}

async function analysieren() {
if (!file) return;
setLoading(true);
setPlan(null);
setError(null);
setProgress(0);

```
const timer = setInterval(() => setProgress(p => p < 85 ? p + 4 : p), 400);

try {
  const base64 = await compressImage(file, 1024);
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: base64, style: stil }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  setProgress(100);
  setPlan(data.plan);
} catch (err) {
  setError(err.message);
} finally {
  clearInterval(timer);
  setLoading(false);
}
```

}

return (
<>
<Head>
<title>RenoPilot – KI Renovierungsplan</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>{`* { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: -apple-system, sans-serif; background: ${C.bg}; } @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } } .fadeIn { animation: fadeIn 0.4s ease; }`}</style>
</Head>
<div style={{ maxWidth: 560, margin: “0 auto”, padding: “20px 16px 60px” }}>

```
    {/* Header */}
    <div style={{ textAlign: "center", padding: "28px 0 24px" }}>
      <h1 style={{ fontSize: 34, fontWeight: 800, color: C.text, letterSpacing: -1 }}>
        Reno<span style={{ color: C.accent }}>Pilot</span>
      </h1>
      <p style={{ fontSize: 15, color: C.muted, marginTop: 6 }}>
        Foto hochladen → KI analysiert → Makeover-Plan
      </p>
    </div>

    {/* Stil */}
    <p style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Ziel-Stil wählen</p>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
      {STILE.map(s => (
        <button key={s.id} onClick={() => setStil(s.id)} style={{
          padding: "10px 12px", borderRadius: 12, cursor: "pointer", textAlign: "left",
          border: "2px solid " + (stil === s.id ? C.accent : C.border),
          background: stil === s.id ? "#FFF0E8" : C.card,
          color: stil === s.id ? C.accent : C.text,
          fontSize: 13, fontWeight: stil === s.id ? 600 : 400,
        }}>
          {s.emoji} {s.label}
        </button>
      ))}
    </div>

    {/* Upload */}
    <div
      onClick={() => fileRef.current.click()}
      style={{
        border: "2px dashed " + (vorherUrl ? C.accent : C.border),
        borderRadius: 16, overflow: "hidden",
        padding: vorherUrl ? 0 : "40px 20px",
        textAlign: "center", cursor: "pointer",
        background: vorherUrl ? "transparent" : C.card,
        marginBottom: 14,
      }}
    >
      {vorherUrl ? (
        <img src={vorherUrl} alt="Vorher" style={{ width: "100%", display: "block", maxHeight: 320, objectFit: "cover" }} />
      ) : (
        <>
          <div style={{ fontSize: 44, marginBottom: 10 }}>📷</div>
          <p style={{ fontWeight: 600, fontSize: 16, color: C.text, marginBottom: 4 }}>Foto hochladen</p>
          <p style={{ fontSize: 13, color: C.muted }}>Bad, Küche, Wohnzimmer, Terrasse…</p>
        </>
      )}
    </div>
    <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleDatei} />

    {/* Button */}
    {vorherUrl && (
      <button onClick={analysieren} disabled={loading} style={{
        width: "100%", padding: 18,
        background: loading ? "#DDD" : "linear-gradient(135deg, #C4622D, #A0522D)",
        color: loading ? "#999" : "white",
        border: "none", borderRadius: 50,
        fontSize: 16, fontWeight: 700, cursor: loading ? "default" : "pointer",
        marginBottom: 16,
        boxShadow: loading ? "none" : "0 4px 20px rgba(196,98,45,0.3)",
      }}>
        {loading ? "⏳ KI analysiert deinen Raum…" : "🔍 Makeover-Plan erstellen"}
      </button>
    )}

    {/* Progress */}
    {loading && (
      <div style={{ marginBottom: 20 }}>
        <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
          <div style={{ height: "100%", width: progress + "%", background: C.accent, borderRadius: 3, transition: "width 0.4s" }} />
        </div>
        <p style={{ fontSize: 13, color: C.muted, textAlign: "center" }}>
          {progress < 40 ? "Foto wird analysiert…" : progress < 80 ? "Plan wird erstellt…" : "Fast fertig…"}
        </p>
      </div>
    )}

    {/* Error */}
    {error && (
      <div style={{ background: "#FFF5F5", border: "1px solid #F5D0D0", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
        <p style={{ fontSize: 14, color: "#B91C1C", fontWeight: 600, marginBottom: 4 }}>Fehler</p>
        <p style={{ fontSize: 13, color: "#7F1D1D" }}>{error}</p>
        {error.includes("Key") && (
          <p style={{ fontSize: 12, color: "#7F1D1D", marginTop: 6 }}>→ .env.local öffnen → ANTHROPIC_API_KEY eintragen</p>
        )}
      </div>
    )}

    {/* Plan */}
    {plan && (
      <div className="fadeIn" style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: "20px 18px", marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid " + C.border }}>
          <span style={{ fontSize: 24 }}>✨</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: 16, color: C.text }}>Dein persönlicher Makeover-Plan</p>
            <p style={{ fontSize: 12, color: C.muted }}>Analysiert von Claude AI · Powered by RenoPilot</p>
          </div>
        </div>
        <div>{renderMarkdown(plan)}</div>
        <button
          onClick={() => { setPlan(null); analysieren(); }}
          style={{ marginTop: 20, width: "100%", padding: 13, background: C.bg, border: "2px solid " + C.border, borderRadius: 50, fontSize: 14, fontWeight: 600, cursor: "pointer", color: C.text }}
        >
          🔄 Neuen Plan generieren
        </button>
      </div>
    )}

    <div style={{ marginTop: 32, padding: 16, background: "#FFF0E8", borderRadius: 12, textAlign: "center" }}>
      <p style={{ fontSize: 12, color: "#8B5E3C", lineHeight: 1.6 }}>
        🤖 Powered by Claude AI · Bilder werden nicht gespeichert<br />
        Ca. 10-20 Sekunden pro Analyse
      </p>
    </div>
  </div>
</>
```

);
}
