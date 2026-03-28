"""
voice_service.py
Core voice-processing pipeline:
  1. Accept transcribed text (in any GhanaNLP-supported language) + language code
  2. Translate to English via GhanaNLP
  3. Route intent:
     - price / listing  -->  local keyword handlers (instant, no AI needed)
     - everything else  -->  Gemini AI farming advisor
  4. Synthesise the response to speech via GhanaNLP TTS
"""

import asyncio
import logging
from typing import Optional

from app.services.ghana_nlp_service import GhanaNLPService
from app.services.gemini_service import GeminiService

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Market price data  (Ghana export commodities + key staples, GHS)
# ---------------------------------------------------------------------------

MARKET_PRICES: dict[str, dict[str, dict]] = {
    "cocoa": {
        "accra":  {"price": 1750, "unit": "bag (64 kg)"},
        "kumasi": {"price": 1720, "unit": "bag (64 kg)"},
        "tamale": {"price": 1680, "unit": "bag (64 kg)"},
    },
    "shea butter": {
        "accra":  {"price": 420, "unit": "bowl (10 kg)"},
        "kumasi": {"price": 390, "unit": "bowl (10 kg)"},
        "tamale": {"price": 340, "unit": "bowl (10 kg)"},
    },
    "cashew": {
        "accra":  {"price": 1100, "unit": "bag (80 kg)"},
        "kumasi": {"price": 1050, "unit": "bag (80 kg)"},
        "tamale": {"price": 980,  "unit": "bag (80 kg)"},
    },
    "palm oil": {
        "accra":  {"price": 220, "unit": "gallon"},
        "kumasi": {"price": 195, "unit": "gallon"},
        "tamale": {"price": 210, "unit": "gallon"},
    },
    "maize": {
        "accra":  {"price": 340, "unit": "bag (100 kg)"},
        "kumasi": {"price": 320, "unit": "bag (100 kg)"},
        "tamale": {"price": 290, "unit": "bag (100 kg)"},
    },
    "yam": {
        "accra":  {"price": 320, "unit": "bag"},
        "kumasi": {"price": 295, "unit": "bag"},
        "tamale": {"price": 270, "unit": "bag"},
    },
    "cassava": {
        "accra":  {"price": 85,  "unit": "bag"},
        "kumasi": {"price": 75,  "unit": "bag"},
        "tamale": {"price": 65,  "unit": "bag"},
    },
    "groundnut": {
        "accra":  {"price": 480, "unit": "bag (80 kg)"},
        "kumasi": {"price": 450, "unit": "bag (80 kg)"},
        "tamale": {"price": 410, "unit": "bag (80 kg)"},
    },
    "plantain": {
        "accra":  {"price": 55,  "unit": "bunch"},
        "kumasi": {"price": 45,  "unit": "bunch"},
        "tamale": {"price": 40,  "unit": "bunch"},
    },
    "rice": {
        "accra":  {"price": 380, "unit": "bag (50 kg)"},
        "kumasi": {"price": 360, "unit": "bag (50 kg)"},
        "tamale": {"price": 330, "unit": "bag (50 kg)"},
    },
}

# ---------------------------------------------------------------------------
# Keyword sets
# ---------------------------------------------------------------------------

_CROP_NAMES_SINGLE = {k for k in MARKET_PRICES if " " not in k}
_CROP_NAMES_MULTI  = {k for k in MARKET_PRICES if " " in k}
_ALL_CROP_WORDS    = {w for name in MARKET_PRICES for w in name.split()}
_CITY_NAMES = {"accra", "kumasi", "tamale"}

_CROP_ALIASES: dict[str, str] = {
    "cacao": "cocoa", "kookoo": "cocoa", "chocolate": "cocoa",
    "shea": "shea butter", "sheanut": "shea butter", "nkuto": "shea butter",
    "cashewnut": "cashew", "cashew nut": "cashew", "cashew nuts": "cashew",
    "palmoil": "palm oil", "palm": "palm oil", "abe": "palm oil",
    "corn": "maize", "aburo": "maize",
    "bayere": "yam", "bayerɛ": "yam",
    "bankye": "cassava",
    "nkatie": "groundnut", "peanut": "groundnut", "peanuts": "groundnut", "groundnuts": "groundnut",
    "brodee": "plantain", "brɔdɛ": "plantain", "plantains": "plantain",
    "emo": "rice",
}

_PRICE_SINGLE_KW   = {"price", "cost", "market", "rate", "ghs", "selling",
                       "buying", "worth", "value", "charge", "expensive", "cheap"}
_PRICE_PHRASES     = {"how much", "what price", "price of", "cost of",
                      "going for", "selling at", "selling for", "current price",
                      "market price", "today price", "ɔbɔ sɛn", "ne boɔ"}
_LISTING_PHRASES   = {"want to sell", "sell my", "i want sell", "list my",
                      "advertise my", "post my", "looking to sell"}
_LISTING_KEYWORDS  = {"list", "listing", "advertise", "register"}

# ---------------------------------------------------------------------------
# Crop resolution
# ---------------------------------------------------------------------------

def _resolve_crop(lower: str) -> Optional[str]:
    """Find a crop name in the text, checking multi-word names, aliases, then single-word names."""
    for alias, canonical in _CROP_ALIASES.items():
        if alias in lower:
            return canonical
    for name in _CROP_NAMES_MULTI:
        if name in lower:
            return name
    for name in _CROP_NAMES_SINGLE:
        if name in lower:
            return name
    return None


def _is_price_intent(lower: str, tokens: set[str]) -> bool:
    """Return True when the user is asking about prices/market info."""
    if any(phrase in lower for phrase in _PRICE_PHRASES):
        return True
    if tokens & _PRICE_SINGLE_KW:
        return True
    if tokens & _ALL_CROP_WORDS:
        return True
    return False

# ---------------------------------------------------------------------------
# Instant (non-AI) handlers
# ---------------------------------------------------------------------------

def _handle_price(lower: str) -> str:
    matched_crop = _resolve_crop(lower)

    if matched_crop is None:
        crop_list = ", ".join(sorted(MARKET_PRICES.keys()))
        return f"I have current prices for: {crop_list}. Which crop are you asking about?"

    cities = MARKET_PRICES[matched_crop]
    for city in _CITY_NAMES:
        if city in lower:
            entry = cities[city]
            return (
                f"{matched_crop.title()} is selling at "
                f"GHS {entry['price']} per {entry['unit']} in {city.capitalize()} today."
            )

    lines = [f"{matched_crop.title()} prices today:"]
    for city, entry in cities.items():
        lines.append(f"  {city.capitalize()}: GHS {entry['price']} per {entry['unit']}")
    return "\n".join(lines)


def _handle_listing(lower: str) -> str:
    matched_crop = _resolve_crop(lower)
    if matched_crop:
        return (
            f"Your {matched_crop} listing has been noted. "
            "A buyer in your area will be contacted. "
            "You will receive a confirmation SMS shortly."
        )
    crop_list = ", ".join(sorted(MARKET_PRICES.keys()))
    return (
        f"To list your produce, tell me the crop name and quantity. "
        f"I support: {crop_list}. "
        "For example: I want to sell 10 bags of maize."
    )


# ---------------------------------------------------------------------------
# Intent router
# ---------------------------------------------------------------------------

def _try_instant_intent(english_text: str) -> Optional[str]:
    """
    Check for price / listing intents that don't need AI.
    Returns the response string, or None if this should go to Gemini.
    """
    lower = english_text.lower()
    tokens = set(lower.split())

    if any(phrase in lower for phrase in _LISTING_PHRASES) or tokens & _LISTING_KEYWORDS:
        return _handle_listing(lower)
    if _is_price_intent(lower, tokens):
        return _handle_price(lower)

    return None


# ---------------------------------------------------------------------------
# Language-pair helper
# ---------------------------------------------------------------------------

_GHANANLP_TRANSLATION_PAIRS = {
    "tw": ("tw-en", "en-tw"),
    "gaa": ("gaa-en", "en-gaa"),
    "ee": ("ee-en", "en-ee"),
    "dag": ("dag-en", "en-dag"),
    "yo": ("yo-en", "en-yo"),
    "ha": ("ha-en", "en-ha"),
    "ki": ("ki-en", "en-ki"),
}


def _to_english_pair(lang: str) -> str | None:
    pair = _GHANANLP_TRANSLATION_PAIRS.get(lang)
    return pair[0] if pair else None


def _from_english_pair(lang: str) -> str | None:
    pair = _GHANANLP_TRANSLATION_PAIRS.get(lang)
    return pair[1] if pair else None


# ---------------------------------------------------------------------------
# VoiceService
# ---------------------------------------------------------------------------

class VoiceService:
    """Orchestrates translation, intent matching, Gemini AI, and TTS."""

    def __init__(self) -> None:
        self._nlp = GhanaNLPService()
        self._gemini: GeminiService | None = None

    def _get_gemini(self) -> GeminiService:
        if self._gemini is None:
            self._gemini = GeminiService()
        return self._gemini

    async def _translate_to_english(self, text: str, lang: str) -> str:
        """Translate local-language text to English with retries."""
        pair = _to_english_pair(lang)
        if not pair:
            logger.info("No translation pair for lang=%s, passing text as-is", lang)
            return text

        last_exc: Exception | None = None
        for attempt in range(1, 4):
            try:
                translated = await asyncio.to_thread(self._nlp.translate, text, pair)
                if translated and translated.strip():
                    clean = translated.strip()
                    logger.info(
                        "Translated [%s] attempt %d: %r -> %r",
                        pair, attempt, text[:80], clean[:80],
                    )
                    return clean
                logger.warning("Translation [%s] attempt %d returned empty", pair, attempt)
            except Exception as exc:
                last_exc = exc
                logger.warning("Translation [%s] attempt %d failed: %s", pair, attempt, exc)
                if attempt < 3:
                    await asyncio.sleep(0.5 * attempt)

        logger.error(
            "All translation attempts failed for [%s]. Last error: %s. Using original text.",
            pair, last_exc,
        )
        return text

    async def _translate_from_english(self, text: str, lang: str) -> str:
        """Translate English response back to the farmer's language with retries."""
        pair = _from_english_pair(lang)
        if not pair:
            return text

        last_exc: Exception | None = None
        for attempt in range(1, 4):
            try:
                translated = await asyncio.to_thread(self._nlp.translate, text, pair)
                if translated and translated.strip():
                    clean = translated.strip()
                    logger.info(
                        "Translated back [%s] attempt %d: %r -> %r",
                        pair, attempt, text[:80], clean[:80],
                    )
                    return clean
                logger.warning("Translation back [%s] attempt %d returned empty", pair, attempt)
            except Exception as exc:
                last_exc = exc
                logger.warning("Translation back [%s] attempt %d failed: %s", pair, attempt, exc)
                if attempt < 3:
                    await asyncio.sleep(0.5 * attempt)

        logger.error(
            "All back-translation attempts failed for [%s]. Last error: %s. Returning English.",
            pair, last_exc,
        )
        return text

    async def process(
        self,
        transcribed_text: str,
        language: str = "tw",
    ) -> dict:
        """
        Full pipeline:
          1. Translate transcribed text to English
          2. Try instant intent (price/listing)
          3. If no instant match -> ask Gemini for farming advice
          4. TTS the response in the farmer's language
        """
        english_text = await self._translate_to_english(transcribed_text, language)
        translation_worked = english_text != transcribed_text

        logger.info(
            "Pipeline: lang=%s | original=%r | english=%r | translated=%s",
            language, transcribed_text, english_text, translation_worked,
        )

        instant = _try_instant_intent(english_text)
        if instant is not None:
            response_en = instant
        else:
            gemini_input = english_text
            if not translation_worked and language != "en":
                gemini_input = (
                    f"[The farmer spoke in {language}. "
                    f"Their transcribed speech is: \"{transcribed_text}\". "
                    f"Please interpret this and give farming advice in English.]"
                )
            try:
                gemini = self._get_gemini()
                response_en = await gemini.ask(gemini_input)
            except Exception as exc:
                logger.error("Gemini call failed: %s", exc)
                response_en = (
                    "I could not reach the AI advisor right now. "
                    "Please try again shortly, or visit your nearest MOFA office for help."
                )

        # Translate the English response back to the farmer's language
        response_local = await self._translate_from_english(response_en, language)

        logger.info(
            "Response: en=%r | local(%s)=%r",
            response_en[:80], language, response_local[:80],
        )

        # TTS in the farmer's language using the translated text
        try:
            audio_base64: Optional[str] = await asyncio.to_thread(
                self._nlp.text_to_speech, response_local, language
            )
        except Exception:
            audio_base64 = None

        return {
            "transcribed_text": transcribed_text,
            "response_text": response_local,
            "response_audio_base64": audio_base64,
            "language": language,
        }
