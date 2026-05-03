export const config = {
  api: { bodyParser: { sizeLimit: "15mb" } },
};

const BASE_PROMPTS = {
  "bad-modern": "modern luxury bathroom, walk-in shower, dark slate tiles, LED mirror, matte black faucets, warm spa lighting",
  "bad-warm": "bright scandinavian bathroom, white subway tiles, oak wood accents, gold faucets, indoor plants, warm 2700K lighting",
  "bad-mikro": "microcement bathroom, seamless concrete walls and floor, floating vanity, minimalist designer bathroom",
  "kueche-navy": "modern kitchen, dark navy blue cabinets, brass handles, open oak shelves, pendant lights, marble countertop",
  "kueche-grau": "modern kitchen, grey satin cabinets, matte black handles, white subway tile backsplash, LED lighting",
  "kueche-gruen": "modern kitchen, sage green cabinets, wooden open shelves, black handles, indoor plants, bright light",
  "wohn-gruen": "living room, dark forest green accent wall, oak floor, linen sofa, indirect LED cove lighting, plants",
  "wohn-terra": "living room, terracotta accent wall, earth tones, rattan furniture, warm 2700K lighting",
  "schlaf-terra": "bedroom, terracotta accent wall, upholstered headboard, neutral linen bedding, warm pendant lights",
  "schlaf-dunkel": "bedroom, dark navy ceiling, white walls, indirect warm LED lighting, upholstered headboard",
  "terrasse-wpc": "modern terrace, WPC wood decking, outdoor lounge sofa, pergola, string lights, potted plants",
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

  // If user described wishes in chat, use Claude to build a better prompt
  var finalPrompt = basePrompt + ", photorealistic interior design photography, 4k";

  if (chatContext && process.env.ANTHROPIC_API_KEY) {
    try {
      var promptRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-opus-4-6",
          max_tokens: 200,
          messages: [{
            role: "user",
            content: "Erstelle einen englischen Bild-Prompt (max 80 Wörter) für einen KI-Bildgenerator basierend auf: Basis-Stil: '" + basePrompt + "'. Nutzerwünsche: '" + chatContext + "'. Nur den Prompt ausgeben, kein anderer Text.",
          }],
        }),
      });
      var promptData = await promptRes.json();
      if (promptData.content && promptData.content[0]) {
        finalPrompt = promptData.content[0].text + ", photorealistic interior design photography, 4k";
      }
    } catch(e) {
      console.log("Prompt generation failed, using base:", e.message);
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
        strength: 0.75,
        num_inference_steps: 28,
        guidance_scale: 3.5,
      }),
    });

    var data = await response.json();
    if (data.images && data.images[0] && data.images[0].url) {
      return res.json({ imageUrl: data.images[0].url, promptUsed: finalPrompt });
    }
    throw new Error(data.message || data.error || "Kein Bild erhalten");
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
