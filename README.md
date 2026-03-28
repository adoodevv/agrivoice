# AGRIVOICE

**Voice-powered marketplace for Ghanaian farmers.**
Speak in Twi, Ga, or English to check crop prices, list your produce, and get farming advice — powered by [GhanaNLP](https://translation.ghananlp.org).

---

## Tech Stack

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Frontend  | Next.js 15 · TypeScript · Tailwind CSS 4      |
| Backend   | FastAPI (Python 3.11+) · Pydantic · Uvicorn   |
| Voice AI  | GhanaNLP ASR · TTS · Translation              |
| Theme     | Warm cream + dark forest green, mobile-first  |

---

## Quick Start

### 1 — Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Add your GhanaNLP API key (get one at https://translation.ghananlp.org)
echo "GHANANLP_API_KEY=your_key_here" > .env

# Start the server
uvicorn app.main:app --reload --port 8000
```

API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2 — Frontend

```bash
cd frontend

# Install dependencies
npm install

# Environment (already committed; edit if your backend runs on a different port)
# NEXT_PUBLIC_BACKEND_URL=http://localhost:8000   <-- frontend/.env.local

# Start the dev server
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

---

## Demo Flow

1. **Open the app** at `localhost:3000`.
2. On the **Home** page, tap the large dark-green mic button.
3. Speak a farming query in **Twi** ("Yɛnka asem no"):
   - _"Yam ne dɛn na wɔtɔn no Kumasi?"_ — market price query
   - _"Mepɛ sɛ mɛtɔn me nkruma"_ — listing produce
   - _"Mɛyɛ dɛn fa me bɔbɛ ho?"_ — storage advice
4. AGRIVOICE transcribes your speech via GhanaNLP STT, routes the intent, and speaks the answer back via GhanaNLP TTS.
5. Explore **Prices** (live mock data) · **Sell** (form or voice) · **Advice** (text or voice).

---

## API Endpoints

| Method | Path                   | Description                          |
|--------|------------------------|--------------------------------------|
| GET    | `/`                    | Health / version banner              |
| GET    | `/health`              | Service health check                 |
| POST   | `/api/voice/process`   | Upload audio → transcribe + respond  |
| POST   | `/api/voice/text`      | Plain text query → respond           |
| GET    | `/api/market/prices`   | Mock crop prices (Accra/Kumasi/Tamale)|

### Example — voice upload

```bash
curl -s -X POST http://localhost:8000/api/voice/process \
  -F "audio=@sample.webm;type=audio/webm" \
  -F "language=tw" | python -m json.tool
```

### Example — text query

```bash
curl -s -X POST http://localhost:8000/api/voice/text \
  -H "Content-Type: application/json" \
  -d '{"text":"price of yam in accra","language":"en"}' | python -m json.tool
```

---

## GhanaNLP Special Category

> This project was built for the **Cursor × GhanaNLP Hackathon** and applies for the
> **Special Category: Moving Ghana Forward — Agriculture & Business Growth**.

GhanaNLP provides speech-to-text (STT), text-to-speech (TTS), and translation for
Ghanaian languages including Twi (Asante), Ga, Ewe, Fante, Hausa, and Dagbani.
Get your free API key at [translation.ghananlp.org](https://translation.ghananlp.org).

---

## Project Structure

```
agrivoice/
├── backend/
│   ├── app/
│   │   ├── main.py                   # FastAPI app, CORS, Swagger
│   │   ├── models/voice.py           # Pydantic request/response models
│   │   ├── routes/
│   │   │   ├── voice.py              # /api/voice/*  endpoints
│   │   │   └── market.py             # /api/market/* endpoints
│   │   └── services/
│   │       ├── ghana_nlp_service.py  # GhanaNLP SDK wrapper
│   │       └── voice_service.py      # Intent router + mock data
│   ├── requirements.txt
│   ├── .env                          # GHANANLP_API_KEY (not committed)
│   └── README.md
└── frontend/
    ├── app/
    │   ├── components/
    │   │   ├── AppShell.tsx          # Top nav + language toggle + footer
    │   │   ├── BottomNav.tsx         # Mobile tab bar
    │   │   └── VoiceRecorder.tsx     # Core mic + STT/TTS UI component
    │   ├── context/
    │   │   └── LanguageContext.tsx   # Bilingual (Twi/English) UI strings
    │   ├── market/page.tsx           # Crop price listings
    │   ├── list/page.tsx             # List produce (voice + form)
    │   ├── advice/page.tsx           # Farming advice (voice + text)
    │   ├── globals.css               # Tailwind 4 tokens + animations
    │   └── layout.tsx                # Root layout + PWA manifest
    ├── public/manifest.json          # PWA manifest
    └── .env.local                    # NEXT_PUBLIC_BACKEND_URL
```

---

## Supported Languages

| Code | Language        |
|------|-----------------|
| `tw` | Twi (Asante)    |
| `en` | English         |
| `ga` | Ga *(planned)*  |
| `ee` | Ewe *(planned)* |

---

*Built for the Cursor × GhanaNLP Hackathon — Moving Ghana Forward.*
