import asyncio
import os
import tempfile

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.models.voice import VoiceResponse
from app.services.ghana_nlp_service import GhanaNLPService
from app.services.voice_service import VoiceService

router = APIRouter(prefix="/api/voice", tags=["voice"])

_ALLOWED_CONTENT_TYPES = {
    "audio/wav",
    "audio/x-wav",
    "audio/webm",
    "audio/ogg",
    "application/octet-stream",
}

_FALLBACK_LANGUAGE = "en"


async def _transcribe(nlp: GhanaNLPService, path: str, language: str) -> tuple[str, str]:
    """
    Attempt STT with the requested language.
    If that fails or returns empty text, retry with the English fallback.
    Returns (transcribed_text, language_used).
    """
    try:
        text: str = await asyncio.to_thread(nlp.speech_to_text, path, language)
        if text and text.strip():
            return text.strip(), language
    except Exception:
        pass

    if language == _FALLBACK_LANGUAGE:
        raise HTTPException(
            status_code=502,
            detail="Speech-to-text failed for both the requested language and the English fallback.",
        )

    # Retry with English
    try:
        text = await asyncio.to_thread(nlp.speech_to_text, path, _FALLBACK_LANGUAGE)
        if text and text.strip():
            return text.strip(), _FALLBACK_LANGUAGE
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Speech-to-text failed: {exc}",
        )

    raise HTTPException(
        status_code=422,
        detail="Could not transcribe audio. Please speak clearly and try again.",
    )


@router.post("/process", response_model=VoiceResponse)
async def process_voice(
    audio: UploadFile = File(..., description="WAV or WebM audio recording"),
    language: str = Form(
        default="tw",
        description="Preferred BCP-47 language code, e.g. tw, gaa, ee. Falls back to 'en'.",
    ),
):
    """
    Full async voice pipeline:
      1. Validate content-type of the upload.
      2. Persist audio to a temp file.
      3. Run GhanaNLP STT (requested language, fallback to English).
      4. Route transcribed text through VoiceService (intent match).
      5. Synthesise response text to speech with GhanaNLP TTS.
      6. Return transcribed text, response text, and base64 audio.
    """
    if audio.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported media type '{audio.content_type}'. "
                "Please upload a WAV or WebM audio file."
            ),
        )

    suffix = ".wav" if "wav" in (audio.content_type or "") else ".webm"
    tmp_path: str | None = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = tmp.name
            tmp.write(await audio.read())

        nlp = GhanaNLPService()
        transcribed_text, lang_used = await _transcribe(nlp, tmp_path, language)

        voice_svc = VoiceService()
        result = await voice_svc.process(transcribed_text, language=lang_used)

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)

    return VoiceResponse(**result)
