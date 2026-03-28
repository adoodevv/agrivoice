from typing import Optional
from pydantic import BaseModel


class VoiceRequest(BaseModel):
    """
    Optional text-only fallback when the caller cannot send audio.
    The language field controls which GhanaNLP language is used.
    """

    text: Optional[str] = None
    language: str = "tw"


class VoiceResponse(BaseModel):
    """
    Unified response shape returned by every voice-processing endpoint.
    audio_base64 may be None when TTS synthesis is skipped or unavailable.
    """

    transcribed_text: str
    response_text: str
    response_audio_base64: Optional[str] = None
    language: str = "tw"
