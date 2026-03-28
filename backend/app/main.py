from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routes.market import router as market_router
from app.routes.voice import router as voice_router

load_dotenv()

_DESCRIPTION = """
AGRIVOICE connects Ghanaian farmers to buyers through a voice-first interface
powered by local-language AI (Twi, Ga, Ewe, Dagbani, and more via GhanaNLP).

## Endpoints

### Voice
- **POST /api/voice/process** — Upload a WAV/WebM recording; receive transcription,
  intent-matched response text, and synthesised audio (base64).

### Market
- **GET /api/market/prices** — Current mock prices for yam, tomato, maize,
  cassava, and plantain across Accra, Kumasi, and Tamale.

### Utility
- **GET /health** — Service liveness check.
"""

_TAGS_METADATA = [
    {
        "name": "voice",
        "description": "Speech-to-text, intent routing, and text-to-speech pipeline.",
    },
    {
        "name": "market",
        "description": "Crop price data by city (mock — replace with live feed).",
    },
    {
        "name": "utility",
        "description": "Health and diagnostic endpoints.",
    },
]

app = FastAPI(
    title="AGRIVOICE API – Voice Marketplace for Ghanaian Farmers",
    description=_DESCRIPTION,
    version="1.0.0",
    openapi_tags=_TAGS_METADATA,
    license_info={"name": "MIT"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(voice_router)
app.include_router(market_router)


@app.get("/", include_in_schema=False)
def root():
    return {"message": "AGRIVOICE Backend running", "version": "1.0.0"}


@app.get("/health", tags=["utility"], summary="Service liveness check")
def health():
    """Returns 200 when the service is up. No external dependencies are probed."""
    return {"status": "ok", "service": "agrivoice-backend"}
