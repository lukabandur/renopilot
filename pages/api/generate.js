export const config = {
  api: { bodyParser: { sizeLimit: "15mb" } },
};

const BASE_PROMPTS = {
  "bad-modern": "award winning luxury bathroom renovation, frameless walk-in rain shower, large format 120x60cm dark charcoal porcelain tiles, floating teak wood vanity, backlit LED mirror, matte black Grohe faucets, hidden ceiling LED strips warm 2700K, polished concrete floor, architectural magazine editorial",
  "bad-warm": "beautiful scandinavian bathroom renovation, white handmade zellige subway tiles, warm natural oak wood vanity, brushed gold Hansgrohe faucets, monstera plants, warm 2200K candlelight atmosphere, herringbone marble floor, architectural magazine editorial",
  "bad-mikro": "ultra modern microcement bathroom, seamless tadelakt concrete finish on all walls and floor, custom floating walnut vanity, minimal matte black tapware, hidden indirect LED lighting, architectural magazine editorial",
  "kueche-navy": "stunning modern kitchen renovation, deep navy blue shaker cabinets, unlacquered brass hardware, open floating white oak shelves, three black Edison pendant lights, calacatta marble waterfall island, architectural magazine editorial",
  "kueche-grau": "sleek contemporary kitchen, silk grey lacquered flat front cabinets RAL7044, matte black Quooker tap, large format white ceramic backsplash, seamless Corian countertop, architectural magazine editorial",
  "kueche-gruen": "warm inviting kitchen renovation, sage green shaker cabinets, aged brass bin pulls, live edge walnut open shelves, white subway tile backsplash, butcher block countertop, architectural magazine editorial",
  "wohn-gruen": "dramatic living room renovation, deep forest green limewash accent wall, wide plank white oak herringbone floor, curved cream boucle sofa, brass arc floor lamp, built-in bookcase with hidden LED strips, architectural magazine editorial",
  "wohn-terra": "earthy boho modern living room, burnt terracotta clay limewash wall, natural jute area rug, curved rattan armchairs, low oak coffee table, warm 2200K ambient lighting, architectural magazine editorial",
  "schlaf-terra": "serene master bedroom renovation, warm terracotta venetian plaster accent wall, king size upholstered bouclé headboard, layered linen bedding, aged brass wall sconces, vertical oak wood slat panels, architectural magazine editorial",
  "schlaf-dunkel": "moody luxury bedroom, deep midnight navy ceiling, white limewash walls, velvet upholstered platform bed, brass bedside pendants, indirect cove LED lighting 2700K, architectural magazine editorial",
  "terrasse-wpc": "beautiful modern terrace renovation, premium teak WPC decking, modular outdoor sofa with Sunbrella cushions, powder coated steel pergola, café Edison string lights, large terracotta planters with olive trees, architectural magazine editorial",
};

const MATERIAL_EXPLANATIONS = {
  "bad-modern": "modernes Spa-Bad mit dunklen Charcoal-Fliesen (120x60cm), schwebendem Teakholz-Waschtisch, mattschwarzem Grohe-Armaturenset und indirekten LED-Streifen (2700K warm)",
  "bad-warm": "Scandinavian-Bad mit handgemachten Zellige-Kacheln, Eichenholz-Waschtisch, goldfarbenen Hansgrohe-Armaturen und Pflanzen",
  "bad-mikro": "Mikrozement-Bad mit fugenlosem Betonfinish, schwebenden Waschtisch aus Nussholz und versteckter LED-Beleuchtung",
  "kueche-navy": "Navy-Küche mit Shaker-Fronten, Calacatta-Marmor Wasserfall-Insel, unlackiertem Messing und offenen Eichenholz-Regalen",
  "kueche-grau": "moderne Küche mit seidenglatten Fronten (RAL7044), Corian-Arbeitsplatte und mattschwarzem Quooker-Hahn",
  "kueche-gruen": "warme Küche mit Salbeigrün-Fronten, Butcher-Block-Arbeitsplatte, Messinggriffen und offenen Walnuss-Regalen",
  "wohn-gruen": "Wohnzimmer mit dunkelgrüner Limewash-Wand, weißem Eiche-Fischgrät-Boden, geschwungenem Bouclé-Sofa und eingebautem Bücherregal",
  "wohn-terra": "Wohnzimmer mit Terrakotta-Limewash-Wand, Jute-Teppich, geschwungenen Rattan-Sesseln und warmem Ambiente-Licht",
  "schlaf-terra": "Schlafzimmer mit Terrakotta Venetian-Plaster-Wand, gepolstertem Bouclé-Kopfteil, Leinenbettwäsche und vertikalen Eichenholz-Paneelen",
  "schlaf-dunkel": "Schlafzimmer mit dunkelblauer Decke, Limewash-Wänden, Samtbett, Messing-Pendelleuchten und indirektem Cove-Licht",
  "terrasse-wpc": "Terrasse mit Premium Teak-WPC-Dielen, Modular-Lounge mit Sunbrella-Kissen, Stahl-Pergola und Olivenbäumen in Terrakotta-Töpfen",
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  var imageBase64 = req.body.imageBase64;
  var style = req.body.style;
  var chatContext = req.body.chatContext || null;

  if (!imageBase64 || !style) {
    return res.status(400).json({ error: "Bild und Stil fehlen" });
  }

  var basePrompt = BASE_PROMPTS[style] || BASE_PROMPTS["bad-modern"];
  var finalPrompt = basePrompt;
  var materialText = MATERIAL_EXPLANATIONS[style] || "";

  // Enhance prompt + generate material explanation with Claude
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      var userContext = chatContext ? "Nutzerwünsche: " + chatContext + ". " : "";
      var claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-opus-4-6",
          max_tokens: 600,
          messages: [{
            role: "user",
            content: userContext + "Basis-Stil: " + basePrompt + "\n\nGib mir zwei Dinge:\n1. PROMPT: Einen verbesserten englischen Bild-Prompt (max 80 Wörter) für Flux img2img der die Nutzerwünsche einbaut. Endet mit 'architectural magazine editorial, photorealistic, 8k'.\n2. MATERIALIEN: Eine freundliche deutsche Erklärung (5-8 Punkte mit Emoji) was im Bild zu sehen ist, wie die Materialien heißen, was sie kosten und wo man sie kauft (OBI/Bauhaus/Amazon/IKEA). Für absolute Anfänger erklärt.\n\nFormat:\nPROMPT: [nur der prompt]\nMATERIALIEN: [die erklärung]",
          }],
        }),
      });
      var claudeData = await claudeRes.json();
      if (claudeData.content && claudeData.content[0]) {
        var text = claudeData.content[0].text;
        var promptMatch = text.match(/PROMPT:\s*(.+?)(?:\n|MATERIALIEN)/s);
        var materialsMatch = text.match(/MATERIALIEN:\s*([\s\S]+)/);
        if (promptMatch) finalPrompt = promptMatch[1].trim();
        if (materialsMatch) materialText = materialsMatch[1].trim();
      }
    } catch(e) {
      console.log("Claude enhancement failed:", e.message);
    }
  }

  try {
    var response = await fetch("https://fal.run/fal-ai/flux/dev/image-to-image", {
      method: "POST",
      headers: {
        "Authorization": "Key " + process.env.FAL_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        image_url: "data:image/jpeg;base64," + imageBase64,
        strength: 0.65,
        num_inference_steps: 35,
        guidance_scale: 4.0,
      }),
    });

    var data = await response.json();
    if (data.images && data.images[0] && data.images[0].url) {
      return res.json({
        imageUrl: data.images[0].url,
        materials: materialText,
        promptUsed: finalPrompt,
      });
    }
    throw new Error(data.message || data.error || "Kein Bild erhalten");
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
