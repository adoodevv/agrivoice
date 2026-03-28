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
# Market price data
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
# Keyword sets
# ---------------------------------------------------------------------------

_CROP_NAMES = set(MARKET_PRICES.keys())
_CITY_NAMES = {"accra", "kumasi", "tamale"}

_PRICE_KEYWORDS   = _CROP_NAMES | {"price", "cost", "market", "how much", "rate", "ghs", "selling", "buying"}
_LISTING_PHRASES  = {"want to sell", "sell my", "i want sell", "list my", "advertise my", "post my"}
_LISTING_KEYWORDS = {"list", "listing", "advertise", "register"}

# ---------------------------------------------------------------------------
# Instant (non-AI) handlers
# ---------------------------------------------------------------------------

def _handle_price(lower: str) -> str:
    matched_crop: Optional[str] = None
    for crop in _CROP_NAMES:
        if crop in lower:
            matched_crop = crop
            break

    if matched_crop is None:
        crop_list = ", ".join(_CROP_NAMES)
        return f"I have current prices for: {crop_list}. Which crop are you asking about?"

    cities = MARKET_PRICES[matched_crop]
    for city in _CITY_NAMES:
        if city in lower:
            entry = cities[city]
            return (
                f"{matched_crop.capitalize()} is selling at "
                f"GHS {entry['price']} per {entry['unit']} in {city.capitalize()} today."
            )

    lines = [f"{matched_crop.capitalize()} prices today (GHS per unit):"]
    for city, entry in cities.items():
        lines.append(f"  {city.capitalize()}: GHS {entry['price']} per {entry['unit']}")
    return "\n".join(lines)


def _handle_listing(lower: str) -> str:
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


# ---------------------------------------------------------------------------
# Intent router — returns (response_text, used_gemini: bool)
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
    if tokens & _PRICE_KEYWORDS:
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
