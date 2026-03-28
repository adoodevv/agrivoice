"""
voice_service.py
Core voice-processing pipeline:
  1. Accept transcribed text + language
  2. Route to the correct intent handler
  3. Build a plain-English response
  4. Synthesise the response to speech via GhanaNLP TTS (async-wrapped)
"""

import asyncio
from typing import Optional

from app.services.ghana_nlp_service import GhanaNLPService

# ---------------------------------------------------------------------------
# Market price data — keyed by crop then market city
# Unit is the denominator for the given price (GHS)
# ---------------------------------------------------------------------------

MARKET_PRICES: dict[str, dict[str, dict]] = {
    "yam": {
        "accra":  {"price": 320, "unit": "bag"},
        "kumasi": {"price": 295, "unit": "bag"},
        "tamale": {"price": 270, "unit": "bag"},
    },
    "tomato": {
        "accra":  {"price": 150, "unit": "crate"},
        "kumasi": {"price": 138, "unit": "crate"},
        "tamale": {"price": 125, "unit": "crate"},
    },
    "maize": {
        "accra":  {"price": 340, "unit": "bag"},
        "kumasi": {"price": 320, "unit": "bag"},
        "tamale": {"price": 300, "unit": "bag"},
    },
    "cassava": {
        "accra":  {"price": 85, "unit": "bag"},
        "kumasi": {"price": 75, "unit": "bag"},
        "tamale": {"price": 65, "unit": "bag"},
    },
    "plantain": {
        "accra":  {"price": 55, "unit": "bunch"},
        "kumasi": {"price": 45, "unit": "bunch"},
        "tamale": {"price": 40, "unit": "bunch"},
    },
}

# ---------------------------------------------------------------------------
# Advisory content
# ---------------------------------------------------------------------------

_ADVISORIES: dict[str, str] = {
    "storage": (
        "To reduce post-harvest losses: store grains in hermetic bags or metal silos "
        "in a cool, dry place. Keep maize moisture below 13 percent before bagging. "
        "Inspect every two weeks for pests and mould."
    ),
    "subsidy": (
        "Under the Planting for Food and Jobs programme, registered farmers can access "
        "subsidised fertiliser and improved seeds at certified agro-input dealers. "
        "Visit your district agriculture office or dial 233-MOFA to register."
    ),
    "weather": (
        "The current forecast shows partly cloudy skies with a chance of afternoon rain "
        "across southern Ghana. Northern regions expect dry harmattan conditions. "
        "Major season planting windows open from April in the south and June in the north."
    ),
    "planting": (
        "Major season for southern Ghana runs April to July; minor season is September to November. "
        "For northern Ghana, the single rainy season runs May to October. "
        "Always test your soil before applying fertiliser."
    ),
    "pest": (
        "Common threats this season include fall armyworm on maize and tomato leaf miner. "
        "Apply recommended pesticides early in the morning or evening. "
        "Contact your local extension officer for free scouting support."
    ),
    "fertiliser": (
        "For maize, apply NPK 15-15-15 at planting and top-dress with sulphate of ammonia "
        "at six weeks. For yam and cassava, compost or well-rotted manure improves yields "
        "without the risk of over-application."
    ),
}

# ---------------------------------------------------------------------------
# Keyword sets per intent
# ---------------------------------------------------------------------------

_CROP_NAMES = set(MARKET_PRICES.keys())
_CITY_NAMES = {"accra", "kumasi", "tamale"}

_PRICE_KEYWORDS    = _CROP_NAMES | {"price", "cost", "market", "how much", "rate", "ghs", "selling", "buying"}
# Listing is detected by explicit phrases to avoid false-positive matches
# on words like "sell" that appear in price questions too.
_LISTING_PHRASES   = {"want to sell", "sell my", "i want sell", "list my", "advertise my", "post my"}
_LISTING_KEYWORDS  = {"list", "listing", "advertise", "register"}  # single-token fallbacks
_STORAGE_KEYWORDS  = {"store", "storage", "keep", "preserve", "spoil", "warehouse", "silo", "loss"}
_SUBSIDY_KEYWORDS  = {"subsidy", "subsidies", "government", "pfj", "planting for food", "free seed", "support", "input"}
_WEATHER_KEYWORDS  = {"weather", "rain", "forecast", "sun", "dry", "flood", "season", "harmattan", "climate"}
_PLANTING_KEYWORDS = {"plant", "planting", "sow", "harvest", "when to", "season", "nursery", "germinate"}
_PEST_KEYWORDS     = {"pest", "insect", "disease", "fungus", "worm", "spray", "armyworm", "miner", "blight"}
_FERT_KEYWORDS     = {"fertilizer", "fertiliser", "fertilise", "fertilize", "manure", "npk", "compost", "nutrient"}


# ---------------------------------------------------------------------------
# Intent handlers
# ---------------------------------------------------------------------------

def _handle_price(lower: str) -> str:
    """Return price information for a specific crop, optionally filtered by city."""
    matched_crop: Optional[str] = None
    for crop in _CROP_NAMES:
        if crop in lower:
            matched_crop = crop
            break

    if matched_crop is None:
        crop_list = ", ".join(_CROP_NAMES)
        return (
            f"I have current prices for: {crop_list}. "
            "Which crop are you asking about?"
        )

    cities = MARKET_PRICES[matched_crop]

    # Check whether the farmer specified a city
    for city in _CITY_NAMES:
        if city in lower:
            entry = cities[city]
            return (
                f"{matched_crop.capitalize()} is selling at "
                f"GHS {entry['price']} per {entry['unit']} in {city.capitalize()} today."
            )

    # No specific city — return all three
    lines = [f"{matched_crop.capitalize()} prices today (GHS per unit):"]
    for city, entry in cities.items():
        lines.append(f"  {city.capitalize()}: GHS {entry['price']} per {entry['unit']}")
    return "\n".join(lines)


def _handle_listing(lower: str) -> str:
    """Mock confirmation for a crop listing request."""
    for crop in _CROP_NAMES:
        if crop in lower:
            return (
                f"Your {crop} listing has been noted. "
                "A buyer in your area will be contacted. "
                "You will receive a confirmation SMS shortly."
            )
    return (
        "To list your produce, tell me the crop name and quantity. "
        "For example: I want to sell 10 bags of maize."
    )


def _route_intent(lower: str) -> str:
    tokens = set(lower.split())

    # Specific intents are checked before price so that a crop name
    # mentioned in a non-price question (e.g. "store my cassava") does
    # not accidentally trigger the price handler.
    if any(phrase in lower for phrase in _LISTING_PHRASES) or tokens & _LISTING_KEYWORDS:
        return _handle_listing(lower)
    if tokens & _STORAGE_KEYWORDS:
        return _ADVISORIES["storage"]
    if tokens & _SUBSIDY_KEYWORDS:
        return _ADVISORIES["subsidy"]
    if tokens & _PEST_KEYWORDS:
        return _ADVISORIES["pest"]
    if tokens & _FERT_KEYWORDS:
        return _ADVISORIES["fertiliser"]
    if tokens & _WEATHER_KEYWORDS:
        return _ADVISORIES["weather"]
    if tokens & _PLANTING_KEYWORDS:
        return _ADVISORIES["planting"]
    if tokens & _PRICE_KEYWORDS:
        return _handle_price(lower)

    return (
        "I am AGRIVOICE, your farming assistant. "
        "You can ask me about crop prices in Accra, Kumasi or Tamale, "
        "how to list your produce, storage tips, subsidies, weather, "
        "planting seasons, pests, or fertiliser advice."
    )


# ---------------------------------------------------------------------------
# VoiceService
# ---------------------------------------------------------------------------

class VoiceService:
    """Orchestrates intent matching and TTS for a transcribed farmer query."""

    def __init__(self):
        self._nlp = GhanaNLPService()

    async def process(
        self,
        transcribed_text: str,
        language: str = "tw",
    ) -> dict:
        """
        Run intent routing then synthesise a spoken response.

        Returns a dict with keys:
            transcribed_text, response_text, response_audio_base64, language
        """
        response_text = _route_intent(transcribed_text.lower())

        # TTS is a blocking HTTP call — run it in a thread so the event loop
        # stays free for other requests.
        try:
            audio_base64: Optional[str] = await asyncio.to_thread(
                self._nlp.text_to_speech, response_text, language
            )
        except Exception:
            audio_base64 = None

        return {
            "transcribed_text": transcribed_text,
            "response_text": response_text,
            "response_audio_base64": audio_base64,
            "language": language,
        }
