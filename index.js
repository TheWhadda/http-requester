const express = require("express");
const fetch = require("node-fetch");
const app = express();
app.use(express.json({ limit: "50mb" }));

app.post("/generate", async (req, res) => {
  const { reference, poster, text, apiKey } = req.body;

  if (!reference || !poster || !apiKey || !text) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    async function fetchBase64(url) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
      const buffer = await response.buffer();
      return buffer.toString("base64");
    }

    const [referenceB64, posterB64] = await Promise.all([
      fetchBase64(reference),
      fetchBase64(poster)
    ]);

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { inline_data: { mime_type: "image/png", data: referenceB64 } },
              { inline_data: { mime_type: "image/jpeg", data: posterB64 } },
              { text: text }
            ]
          }],
          generation_config: {
            response_modalities: ["TEXT", "IMAGE"],
            imageConfig: { aspectRatio: "1:1" }
          }
        })
      }
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("Gemini error:", JSON.stringify(data, null, 2));
      return res.status(geminiResponse.status).json(data);
    }

    res.json(data);
  } catch (err) {
    console.error("Server error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
