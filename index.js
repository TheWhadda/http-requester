const express = require("express");
const fetch = require("node-fetch");
const app = express();
app.use(express.json({ limit: "50mb" }));

app.post("/generate", async (req, res) => {
  const { reference, poster } = req.body;

  async function fetchBase64(url) {
    const response = await fetch(url);
    const buffer = await response.buffer();
    return buffer.toString("base64");
  }

  const [referenceB64, posterB64] = await Promise.all([
    fetchBase64(reference),
    fetchBase64(poster)
  ]);

  console.log("GEMINI_KEY:", process.env.GEMINI_KEY ? "EXISTS, length=" + process.env.GEMINI_KEY.length : "MISSING");

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${process.env.GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { inline_data: { mime_type: "image/png", data: referenceB64 } },
            { inline_data: { mime_type: "image/jpeg", data: posterB64 } },
            {
              text: `Вставь второе изображение (постер фильма) внутрь скругленного оранжевого прямоугольника
по центру первого изображения.
Постер должен аккуратно вписаться внутрь, можно немного выйти за границу рамки художественно.
Пустое пространство полностью заполнить креативно.
Сохрани стиль оригинального макета, лого WINK нельзя изменять.`
            }
          ]
        }],
        generation_config: {
          response_modalities: ["IMAGE"],
          imageConfig: { aspectRatio: "1:1" }
        }
      })
    }
  );

  const data = await geminiResponse.json();
  res.json(data);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
