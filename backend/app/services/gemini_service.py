"""
gemini_service.py
Wraps the Google GenAI (Gemini) SDK for farming advice.

Uses current Gemini API model IDs (2.0 Flash is deprecated for new keys).
See https://ai.google.dev/gemini-api/docs/models/gemini
"""

from __future__ import annotations

import asyncio
import logging
import os

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

# Primary model for new projects — gemini-2.0-* is deprecated / blocked for new users.
# Order: try stable 2.5 Flash first, then cheaper Lite, then rolling "latest" alias.
_DEFAULT_MODELS: tuple[str, ...] = (
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-flash-latest",
)

_MAX_RETRIES_429 = 3
_RETRY_BASE_DELAY_S = 2.0

SYSTEM_PROMPT = """\
You are **AgriVoice**, an expert AI agronomist assistant built specifically for
Ghanaian smallholder farmers.

CONTEXT
- The farmer speaks through a voice interface in a local Ghanaian language.
- Their speech is transcribed and **may or may not** have been translated to
  English before reaching you.  The input could be in Twi, Ga, Ewe, Dagbani,
  Hausa, Yoruba, or English.  YOU MUST understand and respond regardless of the
  input language.
- Common Twi farming terms you should know:
  nsuo = water/rain, bɛtɔ = will fall/buy, ɔbɔ = price, dɛn = what/which,
  da bɛn = when, mfuom = farm, maize = aburo, yam = bayerɛ, cassava = bankye,
  plantain = brɔdɛ, tomato = ntɔɔsi, cocoa = kookoo, fertiliser = ntraso,
  pest = mmoa bɔne, soil = asaase, harvest = otwa, planting = dua, sell = tɔn,
  buy = tɔ, store = sie, rain = nsuo, dry season = ɔpɛ bere, weather = ewiem tumi
- Your answer will be converted to speech, so keep it **concise, clear,
  and actionable** — 3-5 short sentences maximum.

RESPONSE LANGUAGE
- ALWAYS reply in **simple English** (it will be machine-translated back to the
  farmer's language and spoken aloud).

KNOWLEDGE AREAS
- Crop management (maize, yam, cassava, plantain, cocoa, tomatoes, rice, groundnuts)
- Soil health, composting, and fertiliser (NPK, urea, organic alternatives)
- Pest & disease identification and treatment (fall armyworm, stem borers, blight)
- Post-harvest handling, drying, and storage (hermetic bags, PICS bags, cribs)
- Planting calendars for southern Ghana (major Apr-Jul, minor Sep-Nov) and
  northern Ghana (single season May-Oct)
- Weather interpretation and climate-smart practices
- Government programmes (Planting for Food & Jobs, subsidies, extension services)
- Market prices for Accra, Kumasi, and Tamale
- Irrigation, water management, and drought resilience

RULES
1. Always give **practical, Ghana-specific** advice.
2. If you don't know or it needs professional diagnosis, recommend the farmer
   visit their nearest MOFA district office or extension officer.
3. **Never** give medical, legal, or financial investment advice.
4. Keep answers SHORT — the farmer is listening, not reading. 3-5 sentences max.
5. Use simple English with short sentences.
6. ALWAYS try to answer the farming question. Even if the input is in Twi or
   another language, do your best to interpret it and give useful advice.
7. Only redirect if the question is **completely** unrelated to agriculture.
"""


def _models_from_env() -> tuple[str, ...]:
    raw = os.getenv("GEMINI_MODELS", "").strip()
    if not raw:
        return _DEFAULT_MODELS
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    return tuple(parts) if parts else _DEFAULT_MODELS


def _is_quota_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return "429" in msg or "resource_exhausted" in msg or "quota" in msg


def _is_model_not_found(exc: Exception) -> bool:
    msg = str(exc).lower()
    if "404" in msg and ("not_found" in msg or "not available" in msg or "no longer available" in msg):
        return True
    return "not_found" in msg and "model" in msg


class GeminiService:
    """Gemini with multi-model fallback (404 / deprecation) and 429 retry."""

    def __init__(self) -> None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or api_key == "your_gemini_key_here":
            raise ValueError(
                "GEMINI_API_KEY is not set (or still the placeholder). "
                "Get a key at https://aistudio.google.com/apikey"
            )
        self._client = genai.Client(api_key=api_key)
        self._models = _models_from_env()

    def _generate(self, model: str, question: str) -> str:
        response = self._client.models.generate_content(
            model=model,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.4,
                max_output_tokens=512,
            ),
            contents=question,
        )
        return (response.text or "").strip()

    async def ask(self, question_en: str) -> str:
        last_exc: Exception | None = None

        for model in self._models:
            delay = _RETRY_BASE_DELAY_S
            for attempt in range(1, _MAX_RETRIES_429 + 1):
                try:
                    text = await asyncio.to_thread(self._generate, model, question_en)
                    if text:
                        return text
                except Exception as exc:
                    last_exc = exc
                    if _is_model_not_found(exc):
                        logger.warning(
                            "Gemini model %s unavailable (%s), trying next model",
                            model,
                            exc,
                        )
                        break  # next model
                    if _is_quota_error(exc):
                        logger.warning(
                            "Gemini %s 429/quota attempt %s/%s, retry in %.1fs: %s",
                            model,
                            attempt,
                            _MAX_RETRIES_429,
                            delay,
                            exc,
                        )
                        await asyncio.sleep(delay)
                        delay = min(delay * 2, 35)
                        continue
                    logger.error("Gemini %s error: %s", model, exc)
                    break  # next model

        logger.error("All Gemini models failed. Last error: %s", last_exc)
        return (
            "I could not reach the AI advisor right now. "
            "Please try again in a moment, or visit your nearest MOFA office for help."
        )
