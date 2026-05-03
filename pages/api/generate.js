export const config = {
  api: { bodyParser: { sizeLimit: "15mb" } },
};

const PROMPTS = {
  "bad-modern": "modern luxury bathroom, walk-in shower, dark slate tiles, LED mirror, matte black faucets, warm spa lighting, photorealistic interior design",
  "bad-warm": "bright scandinavian bathroom, white subway tiles, oak wood accents, gold faucets, indoor plants, warm 2700K lighting, photorealistic",
  "bad-mikro": "microcement bathroom, seamless concrete walls and floor, floating vanity, minimalist designer bathroom, warm indirect lighting, photorealistic",
  "kueche-navy": "modern kitchen, dark navy blue cabinets, brass handles, open oak shelves, pendant lights, marble countertop, photorealistic interior",
  "kueche-grau": "modern kitchen, grey satin cabinets, matte black handles, white subway tile backsplash, LED lighting, photorealistic interior",
  "kueche-gruen": "modern kitchen, sage green cabinets, wooden open shelves, black handles, indoor plants, bright light, scandinavian photorealistic",
  "wohn-gruen": "living room, dark forest green accent wall, oak floor, linen sofa, indirect LED cove lighting, plants, cozy modern photorealistic",
  "wohn-terra": "living room, terracotta accent wall, earth tones, rattan furniture, warm 2700K lighting, boho modern photorealistic interior",
  "schlaf-terra": "bedroom, terracotta accent wall, upholstered headboard, neutral linen bedding, warm pendant lights, cozy modern photorealistic",
  "schlaf-dunkel": "bedroom, dark navy ceiling, white walls, indirect warm LED lighting, upholstered headboard, luxury cozy photorealistic",
  "terrasse-wpc": "modern terrace, WPC wood decking, outdoor lounge sofa, pergola, string lights, potted plants, summer evening photorealistic",
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  var imageBase64 = req.body.imageBase64;
  var style = req.body.style;
  if (!imageBase64 || !style) {
    return res.status(400).json({ error: "Bild und Stil fehlen" });
  }

  var prompt = PROMPTS[style] || PROMPTS["bad-modern"];
  var imageUrl = "data:image/jpeg;base64," + imageBase64;

  try {
    var response = await fetch("https://fal.run/fal-ai/flux/dev/image-to-image", {
      method: "POST",
      headers: {
        "Authorization": "Key " + process.env.FAL_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
        image_url: imageUrl,
        strength: 0.75,
        num_inference_steps: 28,
        guidance_scale: 3.5,
      }),
    });

    var data = await response.json();

    if (data.images && data.images[0] && data.images[0].url) {
      return res.json({ imageUrl: data.images[0].url });
    }

    // Log what came back for debugging
    console.error("fal.ai response:", JSON.stringify(data));
    throw new Error(data.message || data.error || "Kein Bild erhalten");

  } catch (err) {
    console.error("generate error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
