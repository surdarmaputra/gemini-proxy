# gemini-proxy

Lightweight CORS proxy for Gemini image generation. Bridges any AI agent that can't reach Gemini directly (e.g. sandboxed Claude artifacts) to the Gemini API.

## Quickstart

### 1. Get a Gemini API key

[Google AI Studio](https://aistudio.google.com/app/apikey) → Create API key.

### 2. Generate a secret token

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Keep this — you'll set it as `SECRET_TOKEN` and pass it as the `X-Token` header from your agent.

### 3. Pick a deployment target and follow the section below

---

## Deploy Options

### Local (Node.js)

Requirements: Node 18+

```bash
git clone https://github.com/surdarmaputra/gemini-proxy
cd gemini-proxy
cp .env.example .env
# edit .env with your values
npm install
npm start
# → http://localhost:3000
```

`.env`:
```
GEMINI_API_KEY=your_key
SECRET_TOKEN=your_secret
ALLOWED_ORIGIN=https://claude.ai
PORT=3000
```

---

### Docker (any VPS, cloud VM, or local)

Requirements: Docker

```bash
docker build -t gemini-proxy .
docker run -d -p 3000:3000 \
  -e GEMINI_API_KEY=your_key \
  -e SECRET_TOKEN=your_secret \
  -e ALLOWED_ORIGIN=https://claude.ai \
  gemini-proxy
```

Verify:
```bash
curl http://localhost:3000/health
# {"ok":true}
```

---

### Railway

1. Push this repo to GitHub
2. [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
3. Settings → Variables → add:
   - `GEMINI_API_KEY`
   - `SECRET_TOKEN`
   - `ALLOWED_ORIGIN`
4. Railway auto-detects Node and deploys. Copy the generated HTTPS URL.

---

### Fly.io

Requirements: [flyctl](https://fly.io/docs/hands-on/install-flyctl/)

```bash
fly launch          # follow prompts, pick a region
fly secrets set \
  GEMINI_API_KEY=your_key \
  SECRET_TOKEN=your_secret \
  ALLOWED_ORIGIN=https://claude.ai
fly deploy
fly status          # shows your app URL
```

---

### Render

1. [render.com](https://render.com) → New → Web Service → connect GitHub repo
2. Set:
   - **Build command**: `npm install`
   - **Start command**: `npm start`
3. Environment → add `GEMINI_API_KEY`, `SECRET_TOKEN`, `ALLOWED_ORIGIN`
4. Deploy → copy the `https://*.onrender.com` URL

---

### Vercel

Add `vercel.json` to the repo root:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/server.js" }] }
```

```bash
npm i -g vercel
vercel deploy
# set env vars when prompted, or via Vercel dashboard
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `SECRET_TOKEN` | ✅ (for `/generate`) | Random secret; must match `X-Token` header sent by agent |
| `ALLOWED_ORIGIN` | ✅ (for `/generate`) | Exact origin to allow CORS from, e.g. `https://claude.ai` |
| `PORT` | — | Port to listen on (default: `3000`) |

---

## API

### `POST /generate`

```
Headers:
  Content-Type: application/json
  X-Token: <SECRET_TOKEN>

Body:
  { "prompt": "a red fox in the snow" }

Response 200:
  { "mimeType": "image/png", "data": "<base64>" }

Response 4xx/5xx:
  { "error": "message" }
```

### `POST /api/generate-image` (free tier)

No auth, no CORS checks. Uses `gemini-2.5-flash-image` — works with **free tier Gemini API keys**.

```
Body:
  { "prompt": "a red fox in the snow" }

Response 200:
  Raw Gemini candidate response containing inline base64 image data.
```

### `GET /health`

No auth. Returns `{ "ok": true }`.

---

## Client Test Script

```bash
node client.js
```

Calls `/api/generate-image` and saves the generated image as `generated_<timestamp>.png`.

---

## Usage from an Agent / Artifact

```js
const res = await fetch("https://your-proxy-url/generate", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Token": "your_secret_token"
  },
  body: JSON.stringify({ prompt: "a cat in space" })
});
const { mimeType, data } = await res.json();
const imgSrc = `data:${mimeType};base64,${data}`;
```

---

## Security

- **Origin check** — rejects requests from any origin other than `ALLOWED_ORIGIN`
- **Secret token** — `X-Token` header validated on every `POST /generate`
- **Input validation** — prompt must be a non-empty string, max 1000 chars
