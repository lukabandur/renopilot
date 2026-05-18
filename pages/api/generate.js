export const config = {
  api: { bodyParser: { sizeLimit: "15mb" } },
};

const FREE_LIMIT = 3;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { imageBase64, chatContext, plan, style, dimensions } = req.body;

  if (!imageBase64 || imageBase64.length < 100) {
    return res.status(400).json({ error: "Kein Bild übermittelt." });
  }

  const cleanBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

  // Maße für Claude-Prompt aufbereiten
  let dimensionInfo = "";
  if (dimensions?.laenge && dimensions?.breite) {
    const l = parseFloat(String(dimensions.laenge).replace(",", "."));
    const b = parseFloat(String(dimensions.breite).replace(",", "."));
    const h = parseFloat(String(dimensions.hoehe || "2.4").replace(",", "."));
    const sqm = (l * b).toFixed(1);
    dimensionInfo = `Room dimensions: ${l}m × ${b}m × ${h}m high (${sqm}m² floor area). `;
  }

  try {
    // Nutzerwunsch vorübersetzen für besseres Verständnis
    function preTranslate(text) {
      return text
        .replace(/füge?\s+(.+?)\s+(?:hinzu|ein|dazu)/gi, (_, obj) => `ADD ${obj}`)
        .replace(/füge?\s+(.+?)\s+(?:hinzu|ein|dazu)/gi, (_, obj) => `ADD ${obj}`)
        .replace(/baue?\s+(.+?)\s+ein/gi, (_, obj) => `ADD ${obj}`)
        .replace(/grill|bbq|gasgrill/gi, "built-in BBQ grill / outdoor kitchen")
        .replace(/pergola/gi, "wooden pergola with climbing plants")
        .replace(/pool|schwimmbad/gi, "swimming pool")
        .replace(/jacuzzi|whirlpool/gi, "jacuzzi hot tub")
        .replace(/außenküche|outdoor.?küche/gi, "full outdoor kitchen with countertop")
        .replace(/hochbeet/gi, "raised garden bed with herbs")
        .replace(/pavillon/gi, "garden pavilion / gazebo")
        .replace(/lichterketten?/gi, "warm 2200K string lights")
        .replace(/sichtschutz/gi, "privacy fence / screen")
        .replace(/pflanzen|blumen/gi, "potted plants and flowers")
        .replace(/olivenbaum/gi, "large olive tree in terracotta planter")
        .replace(/lavendel/gi, "lavender bushes")
        .replace(/sofa|couch/gi, "outdoor lounge sofa with cushions")
        .replace(/tisch/gi, "dining table")
        .replace(/stühle?/gi, "designer chairs")
        .replace(/lounge/gi, "outdoor lounge area")
        .replace(/beleuchtu\w+|licht/gi, "warm outdoor lighting 2200K")
        .replace(/mauer|wand/gi, "wall")
        .replace(/boden/gi, "floor")
        .replace(/fliesen/gi, "large format outdoor porcelain tiles")
        .replace(/holz(?:boden|dielen)?/gi, "teak wood decking")
        .replace(/keine?|kein/gi, "REMOVE")
        .replace(/dafür|stattdessen/gi, "and instead ADD")
        .replace(/anstatt|statt/gi, "instead of");
    }

    const translatedContext = chatContext ? preTranslate(chatContext) : null;
    let roomDescription = "";
    let fluxPrompt = "";

    if (process.env.ANTHROPIC_API_KEY) {
      const analysePrompt = chatContext
        ? `${dimensionInfo}You are an expert renovation designer.

MANDATORY USER REQUEST - MUST BE IN PROMPT: "${chatContext}"
TRANSLATED: "${translatedContext}"

The above changes are NON-NEGOTIABLE. They must appear at the START of the flux prompt.

Analyze the photo briefly, then write ONE detailed English image-to-image renovation prompt:
1. FIRST: ${translatedContext} (mandatory changes - highest priority)
2. THEN: describe the complete renovated space keeping all existing elements
3. Specific materials, furniture names, plant species, lighting (e.g. "2700K warm LED")
4. Outdoor: golden hour light, exact furniture, named plant species in terracotta planters
5. Indoor: tile sizes (e.g. 120x60cm), brand names (Grohe/Hansgrohe), LED temp
6. End: same exact perspective and layout, photorealistic 8k photography

Return ONLY JSON: {"description": "current state in 1 sentence", "prompt": "full prompt starting with mandatory changes", "negative": "what to exclude"}`
        : `${dimensionInfo}You are an expert renovation designer. Analyze this space and create a stunning renovation.

Write ONE highly detailed English prompt for image-to-image AI. Rules:
- Describe the fully renovated space with specific materials, furniture, plants, lighting
- For outdoor/terrace: large format outdoor tiles, lounge furniture with thick cushions, olive trees in terracotta planters, string lights, outdoor wall sconces
- For bathroom: specific tile sizes (120x60cm), fixture brands (Grohe/Hansgrohe), LED mirror, floating vanity
- For kitchen: cabinet color (RAL code), hardware style, countertop material, backsplash, lighting
- End with: preserve exact layout and perspective, photorealistic 8k photography, professional lighting
${dimensionInfo ? `- Space is ${dimensionInfo}` : ""}

Return ONLY JSON: {"description": "current state", "prompt": "detailed renovation prompt", "negative": "exclusions"}`;

      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 800,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: cleanBase64 } },
              { type: "text", text: analysePrompt },
            ],
          }],
        }),
      });

      if (claudeRes.ok) {
        const claudeData = await claudeRes.json();
        const rawText = claudeData.content?.map(b => b.text || "").join("").trim();
        try {
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            roomDescription = parsed.description || "";
            fluxPrompt = parsed.prompt || "";
            const negFromClaude = parsed.negative || "";

            // Combine with user-specified negatives
            const baseNeg = "blurry, low quality, distorted, unrealistic, cartoon, painting";
            const finalNeg = negFromClaude ? `${negFromClaude}, ${baseNeg}` : baseNeg;

            // Use Claude's prompt directly – it already has everything
            console.log("Claude prompt:", fluxPrompt.slice(0, 200));

            // ── SCHRITT 2: Flux mit Claude-optimiertem Prompt ──────────────
            const result = await runFlux(cleanBase64, fluxPrompt, finalNeg, plan, chatContext);
            if (result.error) return res.status(500).json({ error: result.error });

            return res.json({
              imageUrl: result.imageUrl,
              imageBase64: result.imageBase64,
              materials: generateMaterials(chatContext, style),
              roomDescription,
              isObjectReplacement: !!(chatContext && chatContext.match(/keine|dafür|statt|anstatt|ersetzen|entfernen/i)),
              model: plan === "pro" ? "claude+flux-pro" : "claude+flux-dev",
            });
          }
        } catch (parseErr) {
          console.log("Claude parse error, falling back to direct prompt");
        }
      }
    }

    // ── FALLBACK: Direkter Prompt ohne Claude-Analyse ─────────────────────
    const fallbackPrompt = buildFallbackPrompt(chatContext, style);
    const fallbackNeg = "blurry, low quality, distorted, unrealistic";
    const result = await runFlux(cleanBase64, fallbackPrompt, fallbackNeg, plan, chatContext);
    if (result.error) return res.status(500).json({ error: result.error });

    res.json({
      imageUrl: result.imageUrl,
      imageBase64: result.imageBase64,
      materials: generateMaterials(chatContext, style),
      isObjectReplacement: !!(chatContext && chatContext.match(/keine|dafür|statt|anstatt|ersetzen|entfernen/i)),
      model: plan === "pro" ? "flux-pro" : "flux-dev",
    });

  } catch (err) {
    console.error("Generate error:", err);
    res.status(500).json({ error: `Server-Fehler: ${err.message}` });
  }
}

// ── Flux ausführen ────────────────────────────────────────────────────────────
async function runFlux(base64, prompt, negativePrompt, plan, chatContext) {
  let uploadedUrl = null;
  const imageBuffer = Buffer.from(base64, "base64");

  // Upload zu fal.ai
  try {
    const uploadRes = await fetch("https://fal.run/fal-ai/storage/upload", {
      method: "POST",
      headers: { "Authorization": `Key ${process.env.FAL_KEY}`, "Content-Type": "image/jpeg" },
      body: imageBuffer,
    });
    if (uploadRes.ok) {
      const uploadData = await uploadRes.json();
      uploadedUrl = uploadData?.url || uploadData?.file_url || null;
    }
  } catch {}

  const imageUrl = uploadedUrl || `data:image/jpeg;base64,${base64}`;

  // Strength basierend auf Wunsch
  const hasObjReplace = chatContext && chatContext.match(/keine|dafür|statt|anstatt|entfernen/i);
  const strength = hasObjReplace ? 0.82 : (chatContext ? 0.72 : 0.62);

  const isPro = plan === "pro";
  const falEndpoint = isPro
    ? "https://fal.run/fal-ai/flux-pro/v1/redux"
    : "https://fal.run/fal-ai/flux/dev/image-to-image";

  const falBody = isPro ? {
    image_url: imageUrl, prompt,
    image_size: "landscape_4_3",
    num_inference_steps: 50,
    guidance_scale: 4.0,
    num_images: 1,
    output_format: "jpeg",
  } : {
    image_url: imageUrl, prompt,
    negative_prompt: negativePrompt,
    strength,
    num_inference_steps: 35,
    guidance_scale: 4.5,
    num_images: 1,
    enable_safety_checker: false,
    output_format: "jpeg",
  };

  const falRes = await fetch(falEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Key ${process.env.FAL_KEY}` },
    body: JSON.stringify(falBody),
  });

  const rawText = await falRes.text();
  let data;
  try { data = JSON.parse(rawText); }
  catch { return { error: `fal.ai Parse Fehler: ${rawText.slice(0, 200)}` }; }

  if (!falRes.ok) return { error: `fal.ai ${falRes.status}: ${JSON.stringify(data).slice(0, 300)}` };

  const resultUrl = data?.images?.[0]?.url || data?.image?.url || data?.output?.[0] || null;
  if (!resultUrl) return { error: `Kein Bild. Response: ${JSON.stringify(data).slice(0, 200)}` };

  // Bild server-seitig holen (kein CORS)
  let resultBase64 = null;
  try {
    const imgFetch = await fetch(resultUrl);
    if (imgFetch.ok) {
      resultBase64 = Buffer.from(await imgFetch.arrayBuffer()).toString("base64");
    }
  } catch {}

  return { imageUrl: resultUrl, imageBase64: resultBase64 };
}

// ── Fallback Prompt ohne Claude ───────────────────────────────────────────────
function buildFallbackPrompt(chatContext, style) {
  const PRESERVE_IN  = "Preserve exact room layout, same window positions, same walls, same perspective. Photorealistic interior architecture photography, 8k, professional lighting.";
  const PRESERVE_OUT = "Preserve exact outdoor layout, same balustrade, same stairs, same walls, same perspective. Photorealistic architectural photography, 8k, golden hour lighting.";

  if (!chatContext) {
    const STYLE_PROMPTS = {
      "bad-modern":   { p:"luxury spa bathroom renovation, large format 120x60cm dark anthracite porcelain tiles floor to ceiling, frameless glass walk-in shower with rainfall showerhead, floating teak wall-mounted vanity, backlit LED mirror, matte black Grohe fixtures, warm 2700K recessed lighting", pr:PRESERVE_IN },
      "bad-warm":     { p:"warm scandinavian bathroom renovation, handmade white zellige subway tiles, natural oak floating vanity, brushed brass Hansgrohe faucet, herringbone marble floor, round brass mirror, green plant, warm 2200K lighting", pr:PRESERVE_IN },
      "bad-mikro":    { p:"microcement spa bathroom, seamless warm grey microcement walls and floor, floating walnut vanity, matte black tapware, large rectangular backlit mirror, indirect LED cove lighting, zen minimalist atmosphere", pr:PRESERVE_IN },
      "kueche-navy":  { p:"stunning navy blue shaker kitchen, deep navy cabinets, brushed brass bin pulls, open floating white oak shelves, calacatta marble countertop, aged brass pendant lights, zellige white tile backsplash", pr:PRESERVE_IN },
      "kueche-grau":  { p:"sleek grey lacquered kitchen, silk grey flat-front cabinets, integrated appliances, matte black tap, large white ceramic backsplash, LED strip under wall cabinets, quartz countertop", pr:PRESERVE_IN },
      "kueche-gruen": { p:"warm sage green shaker kitchen, sage green cabinets, aged brass cup pulls, live edge walnut open shelves, white zellige tile backsplash, butcher block island, rattan pendant lights", pr:PRESERVE_IN },
      "wohn-gruen":   { p:"dramatic living room, deep forest green limewash feature wall, wide plank oak herringbone floor, curved cream bouclé sofa, large brass arc floor lamp, built-in bookshelves with warm LED cove lighting, terracotta ceramic vases", pr:PRESERVE_IN },
      "wohn-terra":   { p:"earthy warm living room, burnt terracotta venetian plaster accent wall, natural jute rug, curved rattan lounge chairs, low solid oak coffee table, warm 2200K lighting, clay pots with plants", pr:PRESERVE_IN },
      "schlaf-terra": { p:"serene terracotta bedroom, warm terracotta venetian plaster feature wall, upholstered bouclé curved headboard 180cm, layered linen bedding, aged brass wall sconces 2200K, linen curtains", pr:PRESERVE_IN },
      "schlaf-dunkel":{ p:"moody luxury bedroom, deep midnight navy ceiling, white limewash walls, invisible LED cove lighting, low velvet platform bed in charcoal, brass bedside pendant lights, floor-length curtains", pr:PRESERVE_IN },
      "terrasse-wpc": { p:"stunning renovated Mediterranean terrace, premium large format 80x80cm sandstone porcelain outdoor tiles covering entire floor, modern outdoor lounge set with thick weatherproof sand-color cushions, solid teak dining table with 4 designer chairs, multiple large terracotta planters with olive trees and lavender, outdoor wall sconces warm 2200K, climbing plants on white wall, outdoor rug under lounge area", pr:PRESERVE_OUT },
    };
    const s = STYLE_PROMPTS[style] || STYLE_PROMPTS["bad-modern"];
    return `${s.p}. ${s.pr}`;
  }

  const isOutdoor = style === "terrasse-wpc" || /terrasse|balkon|outdoor|garten/i.test(chatContext);
  const PRESERVE = isOutdoor ? PRESERVE_OUT : PRESERVE_IN;

  const t = chatContext
    .replace(/keine?\s+(\w+)\s+dafür/gi, "REMOVE $1, ADD")
    .replace(/keine?|kein/gi, "remove")
    .replace(/dafür|stattdessen/gi, "instead add")
    .replace(/badewanne/gi, "bathtub").replace(/dusche/gi, "shower")
    .replace(/fliesen/gi, "tiles").replace(/dunkel/gi, "dark")
    .replace(/modern/gi, "modern").replace(/weiß/gi, "white")
    .replace(/grau/gi, "grey").replace(/schwarz/gi, "matte black")
    .replace(/terrasse|balkon/gi, "terrace").replace(/boden/gi, "floor")
    .replace(/lounge/gi, "outdoor lounge furniture").replace(/pflanzen/gi, "plants and planters");

  return `${t}. ${PRESERVE}`;
}

// ── Affiliate Links ──────────────────────────────────────────────────────────
// TODO: Echte Tags nach Anmeldung eintragen:
// Amazon:  tag=mystorija-21   → amazon.de/associates
// OBI:     awc=XXXX           → awin.com (Merchant: OBI, ID: 13295)
// Bauhaus: awc=XXXX           → awin.com (Merchant: Bauhaus)
// Hornbach: awc=XXXX          → belboon.com oder awin.com

const AMZN  = (q) => `https://www.amazon.de/s?k=${encodeURIComponent(q)}&tag=mystorija-21`;
const OBI   = (q) => `https://www.obi.de/suche/${encodeURIComponent(q)}/`;
const BH    = (q) => `https://www.bauhaus.info/search?q=${encodeURIComponent(q)}`;
const HB    = (q) => `https://www.hornbach.de/s/${encodeURIComponent(q)}/`;

function shopLinks(q_amzn, q_bau) {
  const bq = q_bau || q_amzn;
  return `[Amazon](${AMZN(q_amzn)}) · [OBI](${OBI(bq)}) · [Bauhaus](${BH(bq)}) · [Hornbach](${HB(bq)})`;
}

// ── Materialien generieren ────────────────────────────────────────────────────
function generateMaterials(chatContext, style) {
  const ctx = (chatContext || "").toLowerCase();
  const items = [];

  if (ctx.match(/dusche|shower/))
    items.push(`🚿 **Walk-In Dusche Set** – Glaswand 8mm ESG + Armatur + Ablaufrinne. Ca. 800–2.500€.
${shopLinks("walk in dusche set glaswand", "walk-in dusche")}`);

  if (ctx.match(/badewanne/))
    items.push(`🛁 **Freistehende Badewanne** – Acryl oval 170×75cm. Ca. 400–1.500€.
${shopLinks("freistehende badewanne acryl oval", "freistehende badewanne")}`);

  if (ctx.match(/fliesen|tiles/))
    items.push(`🪨 **Feinsteinzeug 60×120cm** – Betonoptik oder Marmor. Ca. 25–55€/m².
${shopLinks("feinsteinzeug fliesen 60x120 grau", "feinsteinzeug fliesen 60x120")}`);

  if (ctx.match(/dunkel|anthrazit|dark|schwarz/))
    items.push(`⬛ **Mattschwarz Armaturen** – Grohe Essence oder Hansgrohe. Ca. 200–600€.
${shopLinks("grohe armatur mattschwarz bad", "armatur mattschwarz bad")}`);

  if (ctx.match(/holz|eiche|wood|oak/))
    items.push(`🪵 **Waschtisch Eiche wandhängend** – Massiv, 80cm. Ca. 400–900€.
${shopLinks("waschtisch eiche wandmontage", "waschtisch holz wandmontage")}`);

  if (ctx.match(/licht|light|led/))
    items.push(`💡 **LED-Spiegel IP44** – Hinterbeleuchtet, dimmbar. Ca. 80–300€.
${shopLinks("led spiegel bad ip44 dimmbar", "led spiegel bad")}`);

  if (ctx.match(/mikrozement|beton/))
    items.push(`🏛️ **Mikrozement Set 10m²** – Haftgrund + Mikrozement + Versiegelung. Ca. 200–400€.
${shopLinks("mikrozement set komplett boden wand", "mikrozement set")}`);

  if (ctx.match(/farbe|streichen|wandfarbe/))
    items.push(`🎨 **Wandfarbe Premium matt** – Alpina oder Schöner Wohnen. Ca. 20–60€.
${shopLinks("wandfarbe matt premium alpina", "wandfarbe innen matt")}`);

  if (ctx.match(/parkett|boden|laminat|vinyl/))
    items.push(`🪵 **SPC-Vinyl / Laminat** – Klicksystem, wasserfest. Ca. 15–35€/m².
${shopLinks("spc vinyl klick boden wasserfest", "vinyl laminat klick boden")}`);

  if (ctx.match(/tapete|tapezier/))
    items.push(`🌿 **Tapete Premium** – Vliestapete, einfach zu verarbeiten. Ca. 20–60€/Rolle.
${shopLinks("vliestapete premium wohnzimmer", "vliestapete")}`);

  if (ctx.match(/terrasse|wpc|dielen/))
    items.push(`🌴 **WPC-Dielen Set** – Inkl. Stelzlager und Clips. Ca. 35–65€/m².
${shopLinks("wpc dielen terrasse stelzlager set", "wpc dielen terrasse")}`);

  if (ctx.match(/grill|bbq|außenküche/))
    items.push(`🔥 **Gasgrill Outdoor** – 3-Brenner, inkl. Seitenkocher. Ca. 300–1.500€.
${shopLinks("gasgrill outdoor 3 brenner edelstahl", "gasgrill outdoor")}`);

  if (ctx.match(/pergola/))
    items.push(`🌿 **Pergola Bausatz** – Douglasie, wetterfest. Ca. 400–1.500€.
${shopLinks("pergola bausatz douglasie holz", "pergola bausatz holz")}`);

  if (ctx.match(/rigips|trockenbau|wand bauen/))
    items.push(`🏗️ **Trockenbau Set** – CW/UW-Profile + Rigipsplatten + Schrauben. Ca. 8–15€/m².
${shopLinks("rigips ständerwerk trockenbau set", "trockenbau set rigips")}`);

  if (ctx.match(/spiegel/))
    items.push(`🪞 **Rundspiegel / LED-Spiegel** – Messing oder Mattschwarz. Ca. 80–400€.
${shopLinks("spiegel rund messing bad wohnzimmer", "spiegel rund bad")}`);

  // Fallback Style-Materialien
  if (items.length === 0) {
    const SM = {
      "bad-modern": [
        `🪨 **Feinsteinzeug Anthrazit 120×60cm** – Ca. 35–55€/m².
${shopLinks("feinsteinzeug anthrazit 120x60", "feinsteinzeug anthrazit")}`,
        `🚿 **Grohe Armatur Mattschwarz** – Ca. 200–450€.
${shopLinks("grohe armatur mattschwarz", "armatur mattschwarz")}`,
        `💡 **LED-Spiegel IP44** – Ca. 150–400€.
${shopLinks("led spiegel bad ip44 hinterbeleuchtet", "led spiegel bad")}`,
        `🪵 **Waschtisch Teak wandhängend** – Ca. 600–1.200€.
${shopLinks("waschtisch teak wandmontage", "waschtisch holz")}`,
      ],
      "bad-warm": [
        `🟫 **Zellige Metro-Fliesen 7,5×15cm** – Ca. 40–80€/m².
${shopLinks("zellige fliesen metro weiß handgemacht", "metro fliesen bad")}`,
        `🪵 **Eiche Waschtisch 80cm** – Ca. 400–900€.
${shopLinks("waschtisch eiche massiv bad", "waschtisch eiche")}`,
        `✨ **Hansgrohe Armatur Gold** – Ca. 250–500€.
${shopLinks("hansgrohe armatur gold gebürstet", "armatur gold bad")}`,
      ],
      "bad-mikro": [
        `🏛️ **Mikrozement Set 10m²** – Ca. 200–400€.
${shopLinks("mikrozement set komplett bad boden", "mikrozement bad")}`,
        `🖤 **Armatur Mattschwarz** – Ca. 150–400€.
${shopLinks("armatur mattschwarz bad unterputz", "armatur mattschwarz")}`,
        `💡 **LED-Spiegel rechteckig** – Ca. 120–350€.
${shopLinks("led spiegel bad rechteckig dimmbar", "led spiegel bad")}`,
      ],
      "kueche-navy": [
        `🎨 **Haftgrund + Seidenmatt Lack** – Zinsser BIN + Jotun. Ca. 60–120€.
${shopLinks("zinsser bin haftgrund küche lackieren", "haftgrund küchenfronten")}`,
        `✨ **Messing Griffe 128mm** – Ca. 50–120€.
${shopLinks("küchen griffe messing gebürstet 128mm set", "küchen griffe messing")}`,
        `🪨 **Calacatta Arbeitsplatte** – Quarz oder Feinsteinzeug. Ca. 200–600€.
${shopLinks("quarz arbeitsplatte calacatta küche", "arbeitsplatte marmor optik")}`,
        `💡 **LED-Strip 2700K Küche** – Ca. 30–60€.
${shopLinks("led strip küche unterschrank 2700k", "led strip küche")}`,
      ],
      "kueche-grau": [
        `🎨 **Seidenmatt Lack Grau** – RAL 7035 oder 7016. Ca. 30–80€.
${shopLinks("küche lack grau seidenmatt ral", "lack küche grau")}`,
        `🪨 **Quarz Arbeitsplatte weiß** – Ca. 200–500€.
${shopLinks("quarz arbeitsplatte weiß küche silestone", "quarz arbeitsplatte küche")}`,
        `💡 **LED-Strip Neutralweiß 4000K** – Ca. 25–55€.
${shopLinks("led strip 4000k neutralweiß küche", "led strip küche neutralweiß")}`,
      ],
      "kueche-gruen": [
        `🌿 **Seidenmatt Lack Salbeigrün** – RAL 6021. Ca. 30–80€.
${shopLinks("lack salbeigrün küche seidenmatt ral 6021", "lack küche grün")}`,
        `✨ **Messing Cup Pulls** – Ca. 40–100€.
${shopLinks("küchen griffe cup pull messing alt", "küchen griffe messing cup")}`,
        `🪵 **Live Edge Wandregal Eiche** – Ca. 80–200€.
${shopLinks("wandregal massivholz eiche live edge küche", "wandregal massivholz küche")}`,
      ],
      "wohn-gruen": [
        `🌿 **Wandfarbe Flaschengrün matt** – Alpina. Ca. 25–60€.
${shopLinks("wandfarbe flaschengrün dunkelgrün matt alpina", "wandfarbe dunkelgrün")}`,
        `🪵 **Fluted Panel MDF** – Ca. 30–60€/m².
${shopLinks("wandpaneele mdf fluted panel holzoptik", "wandpaneele mdf fluted")}`,
        `💡 **LED-Strip 2700K Cove** – Ca. 25–50€.
${shopLinks("led strip 2700k warmweiß dimmbar cove", "led strip 2700k")}`,
        `🛋️ **Bouclé Kissenbezüge** – Ca. 20–60€.
${shopLinks("bouclé kissenbezug creme wohnzimmer", "kissen bouclé wohnzimmer")}`,
      ],
      "wohn-terra": [
        `🎨 **Wandfarbe Terrakotta** – Alpina Florentiner Erde. Ca. 20–45€.
${shopLinks("wandfarbe terrakotta alpina florentiner erde", "wandfarbe terrakotta")}`,
        `🪑 **Rattan Sessel** – Ca. 150–500€.
${shopLinks("rattan sessel wohnzimmer natur", "rattan sessel")}`,
        `🟫 **Jute Teppich 200×300** – Ca. 80–250€.
${shopLinks("jute teppich naturfarben 200x300", "jute teppich groß")}`,
      ],
      "schlaf-terra": [
        `🎨 **Wandfarbe Terrakotta** – Ca. 20–45€.
${shopLinks("wandfarbe terrakotta schlafzimmer warm", "wandfarbe terrakotta")}`,
        `🛏️ **Bouclé Stoff für Kopfteil** – Ca. 15–30€/m².
${shopLinks("bouclé stoff polsterstoff creme meterware", "bouclé stoff meterware")}`,
        `💡 **Wandleuchten Messing 2x** – Ca. 80–200€.
${shopLinks("wandleuchte messing schlafzimmer gelenkarm", "wandleuchte messing bett")}`,
      ],
      "schlaf-dunkel": [
        `🎨 **Wandfarbe Nachtblau / Anthrazit** – Ca. 25–60€.
${shopLinks("wandfarbe nachtblau dunkel matt premium", "wandfarbe dunkelblau")}`,
        `🪟 **Samtvorhänge bodenlang** – Ca. 80–200€.
${shopLinks("samtvorhang velvet dunkel bodenlang öse", "samtvorhang dunkel")}`,
        `💡 **LED-Cove Strip 2200K** – Ca. 30–70€.
${shopLinks("led strip 2200k extra warmweiß dimmbar", "led strip extra warmweiß")}`,
      ],
      "terrasse-wpc": [
        `🌴 **WPC-Dielen Set 10m²** – Inkl. Clips + Stelzlager. Ca. 35–65€/m².
${shopLinks("wpc dielen terrasse 10m2 stelzlager clips", "wpc dielen terrasse set")}`,
        `☀️ **Outdoor Lounge Set** – Polyrattan, Sunbrella-Kissen. Ca. 400–1.200€.
${shopLinks("outdoor lounge polyrattan set sunbrella terrasse", "outdoor lounge set")}`,
        `✨ **Solar Lichterketten 2200K** – Ca. 20–60€.
${shopLinks("solar lichterketten warmweiß außen terrasse", "lichterketten solar außen")}`,
        `🌿 **Olivenbaum + Terrakotta Topf** – Ca. 80–300€.
${shopLinks("olivenbaum groß topf terrasse balkon", "olivenbaum terrakotta topf")}`,
      ],
    };
    return (SM[style] || SM["bad-modern"]).join("
");
  }

  return items.join("
");
}
