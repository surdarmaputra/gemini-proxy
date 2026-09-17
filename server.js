import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "2mb" }));

// --- Config from env ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SECRET_TOKEN   = process.env.SECRET_TOKEN;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN; // e.g. "https://claude.ai"
const PORT           = process.env.PORT || 3000;

if (!GEMINI_API_KEY) { console.error("Missing GEMINI_API_KEY"); process.exit(1); }
if (!SECRET_TOKEN)   { console.error("Missing SECRET_TOKEN");   process.exit(1); }
if (!ALLOWED_ORIGIN) { console.error("Missing ALLOWED_ORIGIN"); process.exit(1); }

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent";

// --- CORS ---
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin === ALLOWED_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Token");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// --- Auth middleware ---
function auth(req, res, next) {
  const origin = req.headers.origin;
  const token  = req.headers["x-token"];

  if (origin !== ALLOWED_ORIGIN) {
    return res.status(403).json({ error: "Origin not allowed" });
  }
  if (token !== SECRET_TOKEN) {
    return res.status(403).json({ error: "Invalid token" });
  }
  next();
}

// --- Health check (no auth) ---
app.get("/health", (_req, res) => res.json({ ok: true }));

// --- Image generation ---
app.post("/generate", auth, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({ error: "prompt is required" });
  }
  if (prompt.length > 1000) {
    return res.status(400).json({ error: "prompt too long (max 1000 chars)" });
  }

  try {
    const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt.trim() }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
      })
    });

    const data = await geminiRes.json();

    if (data.error) {
      return res.status(502).json({ error: data.error.message });
    }

    const parts = data.candidates?.[0]?.content?.parts || [];
    const imgPart = parts.find(p => p.inlineData);
    if (!imgPart) {
      return res.status(502).json({ error: "No image in Gemini response" });
    }

    res.json({
      mimeType: imgPart.inlineData.mimeType,
      data: imgPart.inlineData.data   // base64
    });
  } catch (e) {
    res.status(502).json({ error: `Upstream error: ${e.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`gemini-proxy running on port ${PORT}`);
  console.log(`allowed origin: ${ALLOWED_ORIGIN}`);
});
