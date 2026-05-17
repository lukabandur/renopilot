export const config = {
  api: { bodyParser: { sizeLimit: "15mb" } },
};

const FREE_LIMIT = 3;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { imageBase64, chatContext, plan, style } = req.body;

  if (!imageBase64 || imageBase64.length < 100) {
    return res.status(400).json({ error: "Kein Bild übermittelt." });
  }

  const cleanBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

  try {
    // ── SCHRITT 1: Claude analysiert das Bild ─────────────────────────────
    let roomDescription = "";
    let fluxPrompt = "";

    if (process.env.ANTHROPIC_API_KEY) {
      const analysePrompt = chatContext
        ? `Analyze this room photo in detail for an interior renovation AI. Describe EXACTLY what you see:
1. Room type and dimensions (rough estimate)
2. Every object visible: bathtub/shower/toilet/sink/furniture - with position (left/right/center)
3. Materials: tile type, size, color, floor material, wall finish
4. Fixtures: faucet style, color (chrome/black/gold)
5. Lighting, windows, doors

Then, the user wants these changes: "${chatContext}"

Based on your analysis, write a single optimized English prompt for an image-to-image AI that:
- Describes the FULL renovated room (not just changes)
- Explicitly states what to REMOVE and what to ADD
- Preserves: same room layout, same window position, same perspective
- Is specific about materials, colors, and finishes

Return ONLY a JSON object:
{"description": "your room analysis", "prompt": "the flux prompt", "negative": "what to exclude"}`
        : `Analyze this room and write an optimized English prompt for a renovation AI to make it look modern and high-end.
Return ONLY JSON: {"description": "room analysis", "prompt": "flux prompt for modern renovation", "negative": "things to exclude"}`;

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
  const PRESERVE = "Preserve exact room layout, same window position, same walls, same perspective. Photorealistic interior renovation photography, 8k.";

  if (!chatContext) {
    const STYLE_PROMPTS = {
      "bad-modern": "modern luxury spa bathroom, dark charcoal tiles, matte black fixtures, floating teak vanity",
      "bad-warm": "warm scandinavian bathroom, white zellige tiles, oak vanity, brushed gold faucets",
      "bad-mikro": "microcement bathroom, seamless concrete walls and floor, minimalist spa",
      "kueche-navy": "navy blue shaker kitchen, brass hardware, marble countertop",
      "kueche-grau": "grey modern kitchen, integrated appliances, LED under-cabinet lighting",
      "kueche-gruen": "sage green kitchen, wood countertop, open oak shelves",
      "wohn-gruen": "dark forest green accent wall living room, curved sofa, warm cove lighting",
      "wohn-terra": "terracotta warm living room, rattan furniture, jute rug",
      "schlaf-terra": "terracotta bedroom, bouclé headboard, warm 2200K lighting",
      "schlaf-dunkel": "moody navy ceiling bedroom, velvet bed, brass sconces",
      "terrasse-wpc": "modern WPC decking terrace, outdoor lounge, string lights",
    };
    return `${STYLE_PROMPTS[style] || "modern renovated interior"}. ${PRESERVE}`;
  }

  // Basis-Übersetzung
  const t = chatContext
    .replace(/keine?\s+(\w+)\s+dafür/gi, "REMOVE $1, ADD")
    .replace(/keine?|kein/gi, "remove")
    .replace(/dafür|stattdessen/gi, "instead add")
    .replace(/badewanne/gi, "bathtub").replace(/dusche/gi, "shower")
    .replace(/fliesen/gi, "tiles").replace(/dunkel/gi, "dark")
    .replace(/modern/gi, "modern").replace(/weiß/gi, "white")
    .replace(/grau/gi, "grey").replace(/schwarz/gi, "black matte");

  return `${t}. ${PRESERVE}`;
}

// ── Materialien generieren ────────────────────────────────────────────────────
function generateMaterials(chatContext, style) {
  const ctx = (chatContext || "").toLowerCase();

  // Dynamisch basierend auf Beschreibung
  const items = [];

  if (ctx.match(/dusche|shower/)) items.push(`🚿 **Walk-In Dusche Komplett-Set** – Duschwanne + Glaswand 8mm ESG + Armatur. Ca. 800–2.500€. [Amazon →](https://www.amazon.de/s?k=walk+in+dusche+set+glaswand&tag=renopilot-21)`);
  if (ctx.match(/badewanne/)) items.push(`🛁 **Freistehende Badewanne** – Acryl, 170×75cm. Ca. 400–1.500€. [Amazon →](https://www.amazon.de/s?k=freistehende+badewanne+acryl&tag=renopilot-21)`);
  if (ctx.match(/fliesen|tiles/)) items.push(`🪨 **Großformat-Fliesen 60×120cm** – Feinsteinzeug, Betonoptik oder Marmor. Ca. 25–55€/m². [Amazon →](https://www.amazon.de/s?k=feinsteinzeug+fliesen+60x120+grau&tag=renopilot-21)`);
  if (ctx.match(/dunkel|anthrazit|dark|schwarz/)) items.push(`⬛ **Mattschwarz Armaturen** – Grohe Essence oder Hansgrohe. Ca. 200–600€. [Amazon →](https://www.amazon.de/s?k=grohe+armatur+mattschwarz&tag=renopilot-21)`);
  if (ctx.match(/holz|eiche|wood|oak/)) items.push(`🪵 **Waschtisch Eiche wandhängend** – Massiv, 80cm. Ca. 400–900€. [Amazon →](https://www.amazon.de/s?k=waschtisch+eiche+wandmontage&tag=renopilot-21)`);
  if (ctx.match(/licht|light|led/)) items.push(`💡 **LED-Spiegel IP44** – Badspiegel hinterbeleuchtet. Ca. 80–300€. [Amazon →](https://www.amazon.de/s?k=led+spiegel+bad+ip44&tag=renopilot-21)`);
  if (ctx.match(/mikrozement|beton/)) items.push(`🏛️ **Mikrozement Set 10m²** – Haftgrund + Mikrozement + Versiegelung. Ca. 200–400€. [Amazon →](https://www.amazon.de/s?k=mikrozement+set+komplett&tag=renopilot-21)`);

  // Fallback auf Style-Materialien wenn nichts passt
  if (items.length === 0) {
    const STYLE_MATERIALS = {
      "bad-modern": `🪨 **Feinsteinzeug Anthrazit 120×60cm** – Ca. 35–55€/m². [Amazon →](https://www.amazon.de/s?k=feinsteinzeug+anthrazit+120x60&tag=renopilot-21)\n🪵 **Waschtisch Teak wandhängend** – Ca. 600–1.200€. [Amazon →](https://www.amazon.de/s?k=waschtisch+teak+wandmontage&tag=renopilot-21)\n💡 **LED-Spiegel IP44 hinterbeleuchtet** – Ca. 150–400€. [Amazon →](https://www.amazon.de/s?k=led+spiegel+bad+emke&tag=renopilot-21)\n🚿 **Grohe Armatur Mattschwarz** – Ca. 200–450€. [Amazon →](https://www.amazon.de/s?k=grohe+armatur+mattschwarz&tag=renopilot-21)`,
      "bad-warm": `🟫 **Zellige Metro-Fliesen weiß 7,5×15cm** – Ca. 40–80€/m². [Amazon →](https://www.amazon.de/s?k=zellige+fliesen+weiß&tag=renopilot-21)\n🪵 **Eiche Waschtisch 80cm** – Ca. 400–900€. [Amazon →](https://www.amazon.de/s?k=waschtisch+eiche+massiv&tag=renopilot-21)\n✨ **Hansgrohe Armatur Gold gebürstet** – Ca. 250–500€. [Amazon →](https://www.amazon.de/s?k=hansgrohe+gold+gebürstet&tag=renopilot-21)`,
      "kueche-navy": `🔵 **Klebefolie Navy Blau** – Ca. 8–15€/m². [Amazon →](https://www.amazon.de/s?k=klebefolie+navy+blau+küche&tag=renopilot-21)\n✨ **Messing Griffe 128mm** – Ca. 50–120€. [Amazon →](https://www.amazon.de/s?k=küchen+griffe+messing&tag=renopilot-21)\n💡 **LED-Strip 2700K Küche** – Ca. 30–60€. [Amazon →](https://www.amazon.de/s?k=led+strip+küche+unterschrank&tag=renopilot-21)`,
      "wohn-gruen": `🌿 **Wandfarbe Dunkelgrün matt** – Alpina. Ca. 20–45€. [Amazon →](https://www.amazon.de/s?k=wandfarbe+dunkelgrün+matt&tag=renopilot-21)\n🪵 **Fluted Panel MDF** – Ca. 30–60€/m². [Amazon →](https://www.amazon.de/s?k=wandpaneele+mdf+fluted&tag=renopilot-21)\n💡 **LED-Strip 2700K Cove** – Ca. 25–50€. [Amazon →](https://www.amazon.de/s?k=led+strip+2700k+dimmbar&tag=renopilot-21)`,
    };
    return STYLE_MATERIALS[style] || STYLE_MATERIALS["bad-modern"];
  }

  return items.join("\n");
}
