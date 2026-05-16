export const config = {
  api: { bodyParser: { sizeLimit: "15mb" } },
};

const PROMPTS = {
  "bad-modern":    "modern luxury spa bathroom renovation, large format dark charcoal 120x60cm tiles, frameless rainfall shower, matte black fixtures, floating teak vanity, LED backlit mirror, warm cove lighting, photorealistic interior 8k",
  "bad-warm":      "bright scandinavian bathroom renovation, white handmade zellige subway tiles, natural oak wood vanity, brushed gold faucets, warm 2200K lighting, herringbone floor, photorealistic interior 8k",
  "bad-mikro":     "microcement bathroom renovation, seamless concrete finish walls and floor, floating walnut vanity, matte black tapware, indirect LED cove lighting, zen minimalist spa, photorealistic interior 8k",
  "kueche-navy":   "modern kitchen renovation, deep navy blue shaker cabinets, brass hardware, open white oak shelves, pendant lights, marble countertop, photorealistic interior 8k",
  "kueche-grau":   "contemporary kitchen renovation, silk grey lacquered flat cabinets, matte black tap, white ceramic backsplash, LED strip under all cabinets, photorealistic interior 8k",
  "kueche-gruen":  "warm kitchen renovation, sage green shaker cabinets, brass bin pulls, live edge walnut open shelves, white zellige tile backsplash, photorealistic interior 8k",
  "wohn-gruen":    "dramatic living room renovation, deep forest green limewash accent wall, wide plank oak floor, curved cream bouclé sofa, brass floor lamp, LED cove lighting, photorealistic interior 8k",
  "wohn-terra":    "earthy living room renovation, burnt terracotta venetian plaster accent wall, natural jute rug, rattan armchairs, warm 2200K ambient lighting, photorealistic interior 8k",
  "schlaf-terra":  "serene bedroom renovation, warm terracotta accent wall, upholstered bouclé headboard, layered linen bedding, aged brass wall sconces 2200K, photorealistic interior 8k",
  "schlaf-dunkel": "moody luxury bedroom renovation, deep midnight navy ceiling, white walls, indirect LED cove lighting, velvet platform bed, brass bedside pendants, photorealistic interior 8k",
  "terrasse-wpc":  "beautiful modern terrace renovation, premium teak WPC decking, modular outdoor sofa, steel pergola, Edison string lights, large terracotta planters with olive trees, photorealistic exterior 8k",
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { imageBase64, style, chatContext } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: "Kein Bild übermittelt." });
  }

  const basePrompt = PROMPTS[style] || PROMPTS["bad-modern"];

  // ── Vollständige DE→EN Übersetzung ────────────────────────────────────────
  function translateDE(text) {
    return text
      // Objekte / Sanitär
      .replace(/badewanne/gi, "bathtub")
      .replace(/walk.?in.?dusche|begehbare dusche/gi, "walk-in shower")
      .replace(/dusche|duschwanne/gi, "shower")
      .replace(/toilette|wc|klo/gi, "toilet")
      .replace(/waschtisch|waschbecken|waschbecken/gi, "bathroom vanity sink")
      .replace(/handtuchhalter/gi, "towel rack")
      .replace(/spiegel/gi, "mirror")
      .replace(/armatur(?:en)?/gi, "faucet")
      .replace(/regendusche/gi, "rainfall shower head")
      .replace(/badewannenarmatur/gi, "bathtub faucet")
      // Möbel
      .replace(/regal(?:e)?/gi, "shelf")
      .replace(/schrank|schränke/gi, "cabinet")
      .replace(/tisch/gi, "table")
      .replace(/stuhl|stühle/gi, "chair")
      .replace(/sofa|couch/gi, "sofa")
      .replace(/bett/gi, "bed")
      .replace(/kopfteil/gi, "headboard")
      // Materialien
      .replace(/fliesen?/gi, "tiles")
      .replace(/parkett/gi, "hardwood parquet floor")
      .replace(/laminat/gi, "laminate floor")
      .replace(/vinyl(?:boden)?/gi, "vinyl floor")
      .replace(/beton(?:optik)?/gi, "concrete look")
      .replace(/mikrozement/gi, "microcement")
      .replace(/marmor/gi, "marble")
      .replace(/holz/gi, "wood")
      .replace(/glas/gi, "glass")
      .replace(/stahl|edelstahl/gi, "stainless steel")
      // Farben
      .replace(/grau/gi, "grey")
      .replace(/weiß|weiss/gi, "white")
      .replace(/schwarz/gi, "black")
      .replace(/dunkelgrün/gi, "dark green")
      .replace(/salbeigrün/gi, "sage green")
      .replace(/navy/gi, "navy blue")
      .replace(/terrakotta/gi, "terracotta")
      .replace(/beige/gi, "beige")
      .replace(/anthrazit/gi, "anthracite grey")
      .replace(/dunkel/gi, "dark")
      .replace(/hell/gi, "bright light")
      .replace(/warm/gi, "warm")
      // Verben / Aktionen
      .replace(/anstatt|statt|anstelle von/gi, "REPLACE with")
      .replace(/einbauen|installieren/gi, "install")
      .replace(/entfernen|rausnehmen|wegnehmen/gi, "remove completely")
      .replace(/ersetzen durch/gi, "replace with")
      .replace(/ersetzen/gi, "replace")
      .replace(/hinzufügen|dazumachen|ergänzen/gi, "add")
      .replace(/vergrößern/gi, "make larger")
      .replace(/verkleinern/gi, "make smaller")
      .replace(/tauschen|wechseln/gi, "change")
      .replace(/möchte ich/gi, "I want")
      .replace(/ich will/gi, "I want")
      .replace(/mach(?:e)?/gi, "make")
      // Bereiche
      .replace(/boden/gi, "floor")
      .replace(/wände?/gi, "wall")
      .replace(/decke/gi, "ceiling")
      .replace(/fenster/gi, "window")
      .replace(/tür(?:en)?/gi, "door")
      .replace(/ecke/gi, "corner")
      .replace(/mitte/gi, "center")
      // Eigenschaften
      .replace(/groß(?:e|en|er)?/gi, "large")
      .replace(/klein(?:e|en|er)?/gi, "small")
      .replace(/modern(?:e|en)?/gi, "modern")
      .replace(/elegant/gi, "elegant")
      .replace(/minimalistisch/gi, "minimalist")
      .replace(/edel/gi, "luxurious")
      .trim();
  }

  // ── Erkennung: Objekt-Austausch vs. Stil-Änderung ─────────────────────────
  function isObjectReplacement(text) {
    const t = text.toLowerCase();
    return t.match(/anstatt|statt|anstelle|ersetzen|entfernen|einbauen|stattdessen|rausnehmen|wegnehmen/);
  }

  let prompt;
  let strength;

  if (chatContext) {
    const translated = translateDE(chatContext);
    const isReplacement = isObjectReplacement(chatContext);

    if (isReplacement) {
      // Objekt-Austausch: sehr direktiv, höchste Strength
      strength = 0.92;
      prompt = `REPLACE OBJECTS AS INSTRUCTED: ${translated}. This is the most important requirement. Completely remove the old object and add the new one in its place. Maintain the same room layout and lighting. ${basePrompt}`;
    } else {
      // Stil-Änderung: Anweisungen first, mittlere Strength
      strength = 0.78;
      prompt = `APPLY THESE CHANGES FIRST: ${translated}. Keep the room structure. ${basePrompt}`;
    }
  } else {
    // Reiner Stil ohne Wünsche
    strength = 0.65;
    prompt = basePrompt;
  }

  // Ob es Objekt-Austausch ist – für Fehlermeldung im Frontend
  const isObjReplace = chatContext ? !!isObjectReplacement(chatContext) : false;

  try {
    // Step 1: Upload image to fal.ai storage
    const imageBuffer = Buffer.from(imageBase64, "base64");

    let uploadedUrl = null;

    try {
      // fal.ai file upload endpoint
      const uploadRes = await fetch("https://fal.run/fal-ai/storage/upload", {
        method: "POST",
        headers: {
          "Authorization": `Key ${process.env.FAL_KEY}`,
          "Content-Type": "image/jpeg",
        },
        body: imageBuffer,
      });

      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        uploadedUrl = uploadData?.url || uploadData?.file_url || null;
      }
    } catch (uploadErr) {
      console.log("Upload error:", uploadErr.message);
    }

    // Step 2: Generate with flux image-to-image
    const imageUrl = uploadedUrl || `data:image/jpeg;base64,${imageBase64}`;

    const falRes = await fetch("https://fal.run/fal-ai/flux/dev/image-to-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${process.env.FAL_KEY}`,
      },
      body: JSON.stringify({
        image_url: imageUrl,
        prompt: prompt,
        strength: strength,
        num_inference_steps: 35,
        guidance_scale: 4.0,
        num_images: 1,
        enable_safety_checker: false,
        output_format: "jpeg",
      }),
    });

    const rawText = await falRes.text();
    let data;
    try { data = JSON.parse(rawText); }
    catch { return res.status(500).json({ error: `Parse Fehler: ${rawText.slice(0, 200)}` }); }

    if (!falRes.ok) {
      return res.status(500).json({ error: `fal.ai Fehler ${falRes.status}: ${JSON.stringify(data).slice(0, 300)}` });
    }

    const resultUrl = data?.images?.[0]?.url || data?.image?.url || data?.output?.[0] || null;

    if (!resultUrl) {
      return res.status(500).json({ error: `Kein Bild in Antwort: ${JSON.stringify(data).slice(0, 200)}` });
    }

    res.json({
      imageUrl: resultUrl,
      materials: generateMaterials(style),
      isObjectReplacement: isObjReplace,
    });

  } catch (err) {
    res.status(500).json({ error: `Server-Fehler: ${err.message}` });
  }
}

function generateMaterials(style) {
  const lists = {
    "bad-modern": `🪨 **Feinsteinzeug 120x60cm Anthrazit** – Großformatige Bodenfliesen, dunkel und pflegeleicht. Ca. 35–55 €/m². Bei Bauhaus oder OBI (Marke "Palazzo" oder "Star Clic Stone"). [Amazon →](https://www.amazon.de/s?k=feinsteinzeug+fliesen+anthrazit+120x60&tag=renopilot-21)
🪵 **Waschtischunterschrank Teak wandhängend** – Schwebender Unterschrank aus massivem Teakholz, wasserresistent. Ca. 600–1.200 €. [Amazon →](https://www.amazon.de/s?k=waschtisch+holz+wandmontage+teakholz&tag=renopilot-21)
💡 **LED-Hinterleuchteter Spiegel** – Badspiegel mit LED-Beleuchtung hinter dem Glas, IP44. Ca. 150–400 €. EMKE oder Talos bei Amazon. [Amazon →](https://www.amazon.de/s?k=led+spiegel+bad+ip44+emke&tag=renopilot-21)
🚿 **Grohe Armatur Matt-Schwarz** – Grohe Essence oder Grohe Plus, Einhebelmischer. Ca. 200–450 €. Bei Bauhaus, OBI oder Amazon. [Amazon →](https://www.amazon.de/s?k=grohe+armatur+mattschwarz&tag=renopilot-21)`,

    "bad-warm": `🟫 **Zellige Metro-Fliesen weiß** – Handgemachte 7,5×15cm Fliesen, warm und zeitlos. Ca. 40–80 €/m². [Amazon →](https://www.amazon.de/s?k=zellige+fliesen+weiß+subway&tag=renopilot-21)
🪵 **Eiche Waschtisch massiv** – Geölt, 80cm wandhängend. Ca. 400–900 €. [Amazon →](https://www.amazon.de/s?k=waschtisch+eiche+massiv+hängend&tag=renopilot-21)
✨ **Hansgrohe Armatur Gold gebürstet** – Logis oder Metropol. Ca. 250–500 €. [Amazon →](https://www.amazon.de/s?k=hansgrohe+armatur+gold+gebürstet&tag=renopilot-21)
💡 **Einbaustrahler IP44 2700K warm** – 5er Set GU10 LED. Ca. 40–80 €. [Amazon →](https://www.amazon.de/s?k=einbaustrahler+ip44+gu10+led+warmweiß&tag=renopilot-21)`,

    "bad-mikro": `🏛️ **Mikrozement Komplett-Set** – Haftgrund + Mikrozement + PU-Versiegelung für 10m². Ca. 150–350 €. [Amazon →](https://www.amazon.de/s?k=mikrozement+set+boden+wand+versiegelung&tag=renopilot-21)
🪵 **Waschtisch Nussbaum schwebend** – 80cm Wandmontage. Ca. 500–1.000 €. [Amazon →](https://www.amazon.de/s?k=waschtisch+nussbaum+wandmontage&tag=renopilot-21)
⬛ **Matt-Schwarze Waschtisch-Armatur** – VINGO oder ähnlich. Ca. 80–250 €. [Amazon →](https://www.amazon.de/s?k=waschtischarmatur+mattschwarz&tag=renopilot-21)
💡 **Alu LED-Profil flach** – Für indirekte Beleuchtung, 2m. Ca. 15–35 €. [Amazon →](https://www.amazon.de/s?k=alu+led+profil+flach+2m&tag=renopilot-21)`,

    "kueche-navy": `🔵 **Klebefolie Navy Blau matt** – Für Küchenfronten, Oracal 8500 Marineblau. Ca. 8–15 €/m². [Amazon →](https://www.amazon.de/s?k=klebefolie+navy+blau+matt+küche&tag=renopilot-21)
✨ **Messing Bügel-Griffe 128mm** – 20er Set gebürstetes Messing. Ca. 50–120 €. [Amazon →](https://www.amazon.de/s?k=küchen+griffe+messing+bügel+128mm&tag=renopilot-21)
💡 **LED-Strip 2700K Küche** – Unter Schränken, 5m + Trafo. Ca. 30–60 €. [Amazon →](https://www.amazon.de/s?k=led+strip+warmweiß+küche+unterschrank&tag=renopilot-21)
🪨 **Marmor-Klebefolie Arbeitsplatte** – Carrara Optik, wasserfest. Ca. 10–20 €/m². [Amazon →](https://www.amazon.de/s?k=marmor+klebefolie+arbeitsplatte&tag=renopilot-21)`,

    "kueche-grau": `⬜ **Klebefolie Seidengrau matt** – RAL 7044, d-c-fix oder Oracal. Ca. 8–15 €/m². [Amazon →](https://www.amazon.de/s?k=klebefolie+seidengrau+matt+möbel&tag=renopilot-21)
⬛ **Matt-Schwarze Griffe 192mm** – 20er Set. Ca. 40–80 €. [Amazon →](https://www.amazon.de/s?k=küchen+griffe+schwarz+matt+192mm&tag=renopilot-21)
💡 **LED-Strip Neutralweiß 4000K** – Ideal für Küche. Ca. 25–50 €. [Amazon →](https://www.amazon.de/s?k=led+strip+4000k+neutralweiß+küche&tag=renopilot-21)
🪨 **Weiße Metro-Fliesen Rückwand** – 7,5×15cm. Ca. 15–30 €/m². [Amazon →](https://www.amazon.de/s?k=metro+fliesen+weiß+küche+rückwand&tag=renopilot-21)`,

    "kueche-gruen": `🌿 **Klebefolie Salbeigrün** – RAL 6021, matte Oberfläche. Ca. 8–15 €/m². [Amazon →](https://www.amazon.de/s?k=klebefolie+salbeigrün+matt+küche&tag=renopilot-21)
🪵 **Holzarbeitsplatte Eiche geölt** – 38mm, OBI oder Bauhaus. Ca. 80–200 €. [Amazon →](https://www.amazon.de/s?k=holzarbeitsplatte+küche+eiche&tag=renopilot-21)
📚 **Schwebende Regalbretter Eiche** – 3cm stark, Wandträger. Ca. 30–80 € pro Brett. [Amazon →](https://www.amazon.de/s?k=regalbretter+eiche+massiv+schwebend&tag=renopilot-21)
✨ **Vintage Messing Griffe** – 128mm. Ca. 40–100 €. [Amazon →](https://www.amazon.de/s?k=küchen+griffe+messing+vintage&tag=renopilot-21)`,

    "wohn-gruen": `🌿 **Wandfarbe Dunkelgrün matt** – Alpina "Im Mooswald" oder Schöner Wohnen. Ca. 20–45 €/2,5L. [Amazon →](https://www.amazon.de/s?k=wandfarbe+dunkelgrün+matt&tag=renopilot-21)
🪵 **Fluted Panel MDF Wandpaneele** – Grundiert, lackierbar. Ca. 30–60 €/m². [Amazon →](https://www.amazon.de/s?k=wandpaneele+mdf+fluted+panel&tag=renopilot-21)
💡 **LED-Strip 2700K für Cove-Licht** – 5m + dimmbarer Trafo. Ca. 25–50 €. [Amazon →](https://www.amazon.de/s?k=led+strip+2700k+dimmbar&tag=renopilot-21)
✨ **Messing Deko-Set** – Vasen, Kerzenhalter, Tablett. Ca. 40–120 €. [Amazon →](https://www.amazon.de/s?k=deko+messing+gold+wohnzimmer+set&tag=renopilot-21)`,

    "wohn-terra": `🍂 **Wandfarbe Terrakotta/Ocker** – Alpina "Florentiner Erde". Ca. 20–50 €. [Amazon →](https://www.amazon.de/s?k=wandfarbe+terrakotta+ocker&tag=renopilot-21)
🌿 **Rattan Sessel Boho** – Ca. 150–400 €. [Amazon →](https://www.amazon.de/s?k=rattan+sessel+boho+wohnzimmer&tag=renopilot-21)
🪵 **Jute Teppich 200×300cm** – Naturfaser. Ca. 80–200 €. [Amazon →](https://www.amazon.de/s?k=jute+teppich+200x300+naturfarben&tag=renopilot-21)
🏺 **Keramik Vasen handgemacht** – Terrakotta-Töne. Ca. 20–80 €. [Amazon →](https://www.amazon.de/s?k=keramik+vase+terrakotta+handgemacht&tag=renopilot-21)`,

    "schlaf-terra": `🍂 **Wandfarbe Terrakotta Akzentwand** – Nur Bett-Wand. Ca. 20–45 €. [Amazon →](https://www.amazon.de/s?k=wandfarbe+terrakotta+schlafzimmer&tag=renopilot-21)
🛏️ **Bouclé Bettkopfteil** – Gepolstert, 180cm. Ca. 200–600 €. [Amazon →](https://www.amazon.de/s?k=bettkopfteil+bouclé+gepolstert&tag=renopilot-21)
💡 **Wandleuchten Messing 2200K** – Stecker-Variante, kein Elektriker. Ca. 60–200 €. [Amazon →](https://www.amazon.de/s?k=wandleuchte+messing+2200k+schlafzimmer&tag=renopilot-21)
🛏️ **Leinenbettwäsche naturfarben** – 135×200cm. Ca. 50–120 €. [Amazon →](https://www.amazon.de/s?k=bettwäsche+leinen+naturfarben&tag=renopilot-21)`,

    "schlaf-dunkel": `🌙 **Wandfarbe Nachtblau** – Farrow & Ball "Hague Blue" oder Alpina. Ca. 40–90 €. [Amazon →](https://www.amazon.de/s?k=wandfarbe+nachtblau+dunkelblau+matt&tag=renopilot-21)
🛏️ **Samtbettkopfteil dunkel** – Velvet, 160cm. Ca. 250–700 €. [Amazon →](https://www.amazon.de/s?k=bettkopfteil+samt+velvet+dunkel&tag=renopilot-21)
💡 **LED-Strip 2200K Warmst** – Für Schlafqualität wichtig! Ca. 30–60 €. [Amazon →](https://www.amazon.de/s?k=led+strip+2200k+warm&tag=renopilot-21)
✨ **Messing Wandleuchten Gelenkarm** – Leseleuchte. Ca. 80–250 €. [Amazon →](https://www.amazon.de/s?k=wandleuchte+messing+gelenkarm&tag=renopilot-21)`,

    "terrasse-wpc": `🌿 **WPC Dielen Clip-System** – Wartungsfrei, Holzoptik. Ca. 35–65 €/m². [Amazon →](https://www.amazon.de/s?k=wpc+dielen+terrasse+clip&tag=renopilot-21)
🪑 **Outdoor Lounge Set** – Polyrattan. Ca. 400–1.200 €. [Amazon →](https://www.amazon.de/s?k=outdoor+lounge+set+polyrattan&tag=renopilot-21)
💡 **Solar Lichterkette 2200K** – Kein Kabel nötig. Ca. 20–50 €. [Amazon →](https://www.amazon.de/s?k=lichterkette+solar+außen+warmweiß&tag=renopilot-21)
🌳 **Terrakotta Pflanzgefäße groß** – Für Olivenbaum. Ca. 30–120 €. [Amazon →](https://www.amazon.de/s?k=terrakotta+pflanzkübel+groß&tag=renopilot-21)`,
  };

  return lists[style] || lists["bad-modern"];
}
