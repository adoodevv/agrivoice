import asyncio
import logging
import os
import tempfile

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.constants.asr_languages import ASR_LANGUAGE_ITEMS, normalise_asr_language, stt_fallback_languages
from app.models.voice import VoiceRequest, VoiceResponse
from app.services.ghana_nlp_service import GhanaNLPService
from app.services.voice_service import VoiceService

router = APIRouter(prefix="/api/voice", tags=["voice"])
logger = logging.getLogger(__name__)

_ALLOWED_CONTENT_TYPES = {
    "audio/wav",
    "audio/x-wav",
    "audio/webm",
    "audio/ogg",
    "audio/mp4",
    "audio/mpeg",
    "video/webm",  # some browsers tag MediaRecorder output this way
    "application/octet-stream",
}


def _normalise_upload_content_type(content_type: str | None) -> str | None:
    """Strip MIME parameters (e.g. audio/webm;codecs=opus -> audio/webm)."""
    if not content_type:
        return None
    return content_type.split(";", 1)[0].strip().lower()

_STT_ATTEMPTS_PRIMARY = 4
_STT_ATTEMPTS_FALLBACK = 3
_STT_INITIAL_DELAY_S = 0.3


async def _stt_with_retries(
    nlp: GhanaNLPService,
    path: str,
    lang: str,
    *,
    attempts: int = _STT_ATTEMPTS_PRIMARY,
) -> tuple[str | None, Exception | None]:
    """
    Call GhanaNLP STT up to `attempts` times with exponential backoff.
    Returns (transcript, None) on success, or (None, last_error) if every attempt errors.
    If all attempts return empty text without raising, returns (None, None).
    """
    delay = _STT_INITIAL_DELAY_S
    last_exc: Exception | None = None
    for i in range(attempts):
        if i > 0:
            await asyncio.sleep(delay)
            delay = min(delay * 1.8, 2.5)
        try:
            text: str = await asyncio.to_thread(nlp.speech_to_text, path, lang)
            if text and text.strip():
                return text.strip(), None
        except Exception as exc:
            last_exc = exc
            logger.warning(
                "GhanaNLP STT attempt %s/%s failed (lang=%s): %s",
                i + 1,
                attempts,
                lang,
                exc,
            )
    return None, last_exc


async def _transcribe(nlp: GhanaNLPService, path: str, language: str) -> tuple[str, str]:
    """
    Run GhanaNLP ASR v1 with the requested language code (must be one of ASR_LANGUAGE_CODES).
    Retries with exponential backoff, then tries Twi / Ga fallbacks if the primary yields nothing.
    Returns (transcribed_text, language_used) where language_used is the ASR code that succeeded.
    """
    primary = normalise_asr_language(language)

    text, err = await _stt_with_retries(nlp, path, primary, attempts=_STT_ATTEMPTS_PRIMARY)
    if text:
        return text, primary

    last_err = err
    for fb in stt_fallback_languages(primary):
        text_fb, err_fb = await _stt_with_retries(
            nlp, path, fb, attempts=_STT_ATTEMPTS_FALLBACK
        )
        if text_fb:
            return text_fb, fb
        if err_fb is not None:
            last_err = err_fb

    if last_err is not None:
        raise HTTPException(
            status_code=502,
            detail=(
                "Speech-to-text service failed after several tries. "
                f"Last error: {last_err}"
            ),
        )
    raise HTTPException(
        status_code=422,
        detail=(
            "Could not transcribe audio. Match the selected speak-language to what you say, "
            "speak clearly, hold the mic a little longer, and try again."
        ),
    )


@router.get("/languages")
async def list_asr_languages():
    """
    Languages accepted by `POST /api/voice/process` (Form field `language`) and GhanaNLP ASR v1.
    """
    return {"languages": ASR_LANGUAGE_ITEMS}


@router.post("/process", response_model=VoiceResponse)
async def process_voice(
    audio: UploadFile = File(..., description="WAV or WebM audio recording"),
    language: str = Form(
        default="tw",
        description="GhanaNLP ASR v1 code: tw, gaa, dag, yo, ee, ki, ha (see GET /api/voice/languages).",
    ),
):
    """
    Full async voice pipeline:
      1. Validate content-type of the upload.
      2. Persist audio to a temp file.
      3. Run GhanaNLP STT (requested ASR language; falls back to tw, then gaa if needed).
      4. Route transcribed text through VoiceService (intent match).
      5. Synthesise response text to speech with GhanaNLP TTS.
      6. Return transcribed text, response text, and base64 audio.
    """
    normalised = _normalise_upload_content_type(audio.content_type)
    if normalised not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported media type '{audio.content_type}'. "
                "Please upload a WAV or WebM audio file."
            ),
        )

    raw_ct = (audio.content_type or "").lower()
    if "wav" in raw_ct:
        suffix = ".wav"
    elif "mp4" in raw_ct or "mpeg" in raw_ct:
        suffix = ".mp4"
    else:
        suffix = ".webm"
    tmp_path: str | None = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = tmp.name
            tmp.write(await audio.read())

        nlp = GhanaNLPService()
        transcribed_text, lang_used = await _transcribe(nlp, tmp_path, language)

        voice_svc = VoiceService()
        tts_lang = normalise_asr_language(lang_used)
        result = await voice_svc.process(transcribed_text, language=tts_lang)

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)

    return VoiceResponse(**result)


@router.post("/text", response_model=VoiceResponse)
async def process_text(request: VoiceRequest):
    """
    Text-only pipeline — bypasses STT entirely.
    Accepts plain text, runs intent routing, and synthesises a spoken response.
    Useful for typed queries and form submissions.
    """
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=422, detail="The 'text' field is required and must not be empty.")

    voice_svc = VoiceService()
    tts_lang = normalise_asr_language(request.language)
    result = await voice_svc.process(request.text.strip(), language=tts_lang)
    return VoiceResponse(**result)
