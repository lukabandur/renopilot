export const config = {
api: { bodyParser: { sizeLimit: “15mb” } },
};

const PROMPTS = {
“bad-modern”:    “modern luxury bathroom renovation, walk-in shower with frameless glass, large format dark slate tiles, LED backlit mirror, matte black faucets, floating vanity, warm spa lighting, professional interior photography, photorealistic, 4k”,
“bad-warm”:      “bright scandinavian bathroom renovation, white subway tiles, natural oak wooden accents, brushed gold faucets, indoor plants, warm 2700K lighting, clean and cozy, professional interior photography, photorealistic, 4k”,
“bad-mikro”:     “microcement bathroom renovation, seamless concrete walls and floor, floating wooden vanity, minimalist designer bathroom, indirect warm lighting, luxury spa feel, professional interior photography, photorealistic, 4k”,
“kueche-navy”:   “modern kitchen renovation, dark navy blue cabinet doors, brass handles, open oak shelves, three pendant lights, white marble countertop, subway tile backsplash, professional interior photography, photorealistic, 4k”,
“kueche-grau”:   “modern kitchen renovation, grey satin cabinets RAL7044, matte black handles, white subway tile backsplash, under-cabinet LED lighting, clean minimalist, professional interior photography, photorealistic, 4k”,
“kueche-gruen”:  “modern kitchen renovation, sage green cabinet doors, open wooden shelves, black handles, indoor plants, bright natural light, scandinavian style, professional interior photography, photorealistic, 4k”,
“wohn-gruen”:    “living room renovation, dark forest green accent wall, warm oak wooden floor, beige linen sofa, indirect LED cove lighting, large indoor plants, cozy modern 2025, professional interior photography, photorealistic, 4k”,
“wohn-terra”:    “living room renovation, terracotta accent wall, earth tones, rattan furniture, warm 2700K lighting, boho modern interior, professional interior photography, photorealistic, 4k”,
“schlaf-terra”:  “bedroom renovation, terracotta accent wall behind bed, upholstered headboard, neutral linen bedding, warm pendant lights, cozy modern 2025, professional interior photography, photorealistic, 4k”,
“schlaf-dunkel”: “bedroom renovation, dark navy ceiling, white walls, indirect warm LED lighting, upholstered headboard, dramatic cozy luxury, professional interior photography, photorealistic, 4k”,
“terrasse-wpc”:  “modern terrace renovation, WPC wood decking, outdoor lounge sofa with cushions, pergola, string lights, potted plants, summer evening ambiance, professional photography, photorealistic, 4k”,
};

export default async function handler(req, res) {
if (req.method !== “POST”) return res.status(405).end();

const { imageBase64, style } = req.body;
if (!imageBase64 || !style) {
return res.status(400).json({ error: “Bild und Stil fehlen” });
}

if (!process.env.FAL_KEY || process.env.FAL_KEY.includes(“HIER”)) {
return res.status(500).json({ error: “Bitte FAL_KEY in .env.local eintragen!” });
}

const prompt = PROMPTS[style] || PROMPTS[“bad-modern”];

try {
// Submit job to fal.ai
const submitRes = await fetch(“https://queue.fal.run/fal-ai/stable-diffusion-v3-medium/requests”, {
method: “POST”,
headers: {
“Authorization”: “Key “ + process.env.FAL_KEY,
“Content-Type”: “application/json”,
},
body: JSON.stringify({
prompt: prompt,
image_url: “data:image/jpeg;base64,” + imageBase64,
strength: 0.65,
num_inference_steps: 28,
guidance_scale: 7,
image_size: “landscape_4_3”,
}),
});

```
const submitData = await submitRes.json();

if (!submitData.request_id) {
  // Try direct endpoint instead
  const directRes = await fetch("https://fal.run/fal-ai/fast-sdxl", {
    method: "POST",
    headers: {
      "Authorization": "Key " + process.env.FAL_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: prompt,
      image_url: "data:image/jpeg;base64," + imageBase64,
      strength: 0.65,
      num_inference_steps: 28,
      image_size: "landscape_4_3",
    }),
  });
  const directData = await directRes.json();
  if (directData.images?.[0]?.url) {
    return res.json({ imageUrl: directData.images[0].url });
  }
  throw new Error(JSON.stringify(directData));
}

// Poll for result
const requestId = submitData.request_id;
let result = null;
for (let i = 0; i < 60; i++) {
  await new Promise(r => setTimeout(r, 2000));
  const pollRes = await fetch(
    "https://queue.fal.run/fal-ai/stable-diffusion-v3-medium/requests/" + requestId,
    { headers: { "Authorization": "Key " + process.env.FAL_KEY } }
  );
  const pollData = await pollRes.json();
  if (pollData.status === "COMPLETED" && pollData.output?.images?.[0]?.url) {
    result = pollData.output.images[0].url;
    break;
  }
  if (pollData.status === "FAILED") {
    throw new Error("Bild-Generierung fehlgeschlagen");
  }
}

if (!result) throw new Error("Timeout – bitte nochmal versuchen");
res.json({ imageUrl: result });
```

} catch (err) {
console.error(err);
res.status(500).json({ error: err.message });
}
}
