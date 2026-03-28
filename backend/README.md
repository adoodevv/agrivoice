# AGRIVOICE Backend

FastAPI backend for the AGRIVOICE voice-powered marketplace.  
Farmers speak in Twi, Ga, Ewe, or Dagbani; the API transcribes, routes intent,
and replies in the same language — all via the GhanaNLP API.

---

## Requirements

- Python 3.11+
- A GhanaNLP API key (see below)

---

## Setup

```bash
# 1. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy the env template and add your key
cp .env.example .env               # or edit .env directly
```

Edit `.env`:

```
GHANANLP_API_KEY=your_real_key_here
```

---

## Getting a GhanaNLP API Key

1. Visit [translation.ghananlp.org](https://translation.ghananlp.org)
2. Sign up for a free developer account.
3. Navigate to **API Keys** in your dashboard and generate a new key.
4. Paste the key into `.env` as shown above.

Supported language codes: `tw` (Twi), `gaa` (Ga), `ee` (Ewe), `dag` (Dagbani), `fat` (Fante).

---

## Running the server

```bash
# From the backend/ directory, with .venv active:
uvicorn app.main:app --reload --port 8000
```

The API will be available at:

| URL | Purpose |
|-----|---------|
| `http://localhost:8000/` | Root ping |
| `http://localhost:8000/health` | Liveness check |
| `http://localhost:8000/docs` | Swagger UI (interactive) |
| `http://localhost:8000/redoc` | ReDoc documentation |

---

## API Endpoints

### POST /api/voice/process

Accepts a WAV or WebM audio file and returns transcription + spoken response.

**Form fields:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `audio` | file | yes | — | WAV or WebM recording |
| `language` | string | no | `tw` | BCP-47 language code |

**Example with curl:**

```bash
curl -X POST http://localhost:8000/api/voice/process \
  -F "audio=@sample.wav;type=audio/wav" \
  -F "language=tw"
```

**Example response:**

```json
{
  "transcribed_text": "yam kakra",
  "response_text": "Yam prices today (GHS per unit):\n  Accra: GHS 320 per bag\n  Kumasi: GHS 295 per bag\n  Tamale: GHS 270 per bag",
  "response_audio_base64": "<base64-encoded WAV>",
  "language": "tw"
}
```

---

### GET /api/market/prices

Returns current mock prices for yam, tomato, maize, cassava, and plantain
across Accra, Kumasi, and Tamale.

```bash
curl http://localhost:8000/api/market/prices
```

**Example response:**

```json
{
  "prices": {
    "yam":     { "accra": {"price": 320, "unit": "bag"}, "kumasi": {"price": 295, "unit": "bag"}, "tamale": {"price": 270, "unit": "bag"} },
    "maize":   { "accra": {"price": 340, "unit": "bag"}, "kumasi": {"price": 320, "unit": "bag"}, "tamale": {"price": 300, "unit": "bag"} },
    "tomato":  { "accra": {"price": 150, "unit": "crate"}, ... },
    "cassava": { ... },
    "plantain":{ ... }
  }
}
```

---

### GET /health

```bash
curl http://localhost:8000/health
# {"status": "ok", "service": "agrivoice-backend"}
```

---

## Project structure

```
backend/
  app/
    main.py                        # FastAPI app, CORS, router registration
    models/
      voice.py                     # Pydantic request/response models
    routes/
      voice.py                     # POST /api/voice/process
      market.py                    # GET /api/market/prices
    services/
      ghana_nlp_service.py         # GhanaNLP SDK wrapper (STT, TTS, translate)
      voice_service.py             # Intent router + mock market data
  requirements.txt
  .env                             # Not committed — holds GHANANLP_API_KEY
```
