export const config = {
api: { bodyParser: { sizeLimit: “15mb” } },
};

const PROMPTS = {
“bad-modern”: “modern luxury bathroom, walk-in shower, dark tiles, LED mirror, matte black faucets, spa lighting, photorealistic 4k interior photo”,
“bad-warm”: “bright scandinavian bathroom, white subway tiles, oak wood accents, gold faucets, plants, warm lighting, photorealistic 4k”,
“bad-mikro”: “microcement bathroom, seamless concrete walls, floating vanity, minimalist, warm indirect lighting, photorealistic 4k”,
“kueche-navy”: “modern kitchen, dark navy cabinets, brass handles, open oak shelves, pendant lights, marble countertop, photorealistic 4k”,
“kueche-grau”: “modern kitchen, grey satin cabinets, matte black handles, white subway tiles, LED lighting, photorealistic 4k”,
“kueche-gruen”: “modern kitchen, sage green cabinets, wooden shelves, black handles, plants, bright light, photorealistic 4k”,
“wohn-gruen”: “living room, dark forest green accent wall, oak floor, linen sofa, indirect LED lighting, plants, photorealistic 4k”,
“wohn-terra”: “living room, terracotta accent wall, earth tones, rattan furniture, warm lighting, photorealistic 4k”,
“schlaf-terra”: “bedroom, terracotta accent wall, upholstered headboard, linen bedding, warm pendant lights, photorealistic 4k”,
“schlaf-dunkel”: “bedroom, dark navy ceiling, white walls, indirect LED lighting, upholstered headboard, photorealistic 4k”,
“terrasse-wpc”: “modern terrace, WPC wood decking, outdoor lounge, pergola, string lights, plants, photorealistic 4k”,
};

export default async function handler(req, res) {
if (req.method !== “POST”) return res.status(405).end();

const { imageBase64, style } = req.body;
if (!imageBase64 || !style) {
return res.status(400).json({ error: “Bild und Stil fehlen” });
}

const prompt = PROMPTS[style] || PROMPTS[“bad-modern”];

try {
const response = await fetch(“https://fal.run/fal-ai/fast-sdxl”, {
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
image_size: “landscape_4_3”,
}),
});

```
const data = await response.json();

if (data.images && data.images[0] && data.images[0].url) {
  return res.json({ imageUrl: data.images[0].url });
}

throw new Error(JSON.stringify(data));
```

} catch (err) {
console.error(err);
res.status(500).json({ error: err.message });
}
}
