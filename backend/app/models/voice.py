from typing import Optional
from pydantic import BaseModel


class VoiceRequest(BaseModel):
    """
    Text-only pipeline (no STT). `language` is the GhanaNLP TTS voice code:
    use an ASR-supported code (tw, gaa, dag, yo, ee, ki, ha); unknown/en maps to tw.
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
