import base64
import os
from typing import Any

from ghana_nlp import GhanaNLP


def _is_error(result: Any) -> bool:
    """Return True when the SDK returned one of its error dicts."""
    return isinstance(result, dict) and "type" in result


class GhanaNLPService:
    """Thin wrapper around the ghana-nlp SDK for AGRIVOICE.

    The SDK's actual public methods are stt / tts / translate.
    Every method can return either a success value or an error dict shaped
    {"type": "<category>", "message": "<detail>"}.  We surface those as
    plain Python exceptions so callers only have one error path to handle.
    """

    def __init__(self) -> None:
        api_key = os.getenv("GHANANLP_API_KEY")
        if not api_key:
            raise ValueError("GHANANLP_API_KEY is not set in the environment.")
        self._client = GhanaNLP(api_key=api_key)

    # ------------------------------------------------------------------
    # Speech-to-text
    # ------------------------------------------------------------------

    def speech_to_text(self, audio_file_path: str, language: str = "tw") -> str:
        """
        Transcribe a WAV audio file to text.

        The underlying stt() returns response.json(), which can be:
          - a plain string  (the transcription)
          - a dict with a text-like key  (e.g. {"transcript": "..."})
          - an error dict  ({"type": "...", "message": "..."})

        Raises RuntimeError on API errors.
        """
        result = self._client.stt(audio_file_path, language=language)

        if _is_error(result):
            raise RuntimeError(f"GhanaNLP STT error — {result['type']}: {result['message']}")

        if isinstance(result, str):
            return result

        # Dict success response — extract from known keys
        if isinstance(result, dict):
            for key in ("transcript", "text", "result", "output"):
                if key in result:
                    return str(result[key])
            # Unknown shape — stringify the whole dict as a last resort
            return str(result)

        return str(result)

    # ------------------------------------------------------------------
    # Text-to-speech
    # ------------------------------------------------------------------

    def text_to_speech(self, text: str, lang: str = "tw") -> str:
        """
        Synthesise speech from text.

        The underlying tts() returns raw bytes on HTTP 200, or an error dict
        on any other status code / exception.

        Returns a base64-encoded WAV string so it can be embedded in JSON.
        Raises RuntimeError on API errors.
        """
        result = self._client.tts(text, lang)

        if _is_error(result):
            raise RuntimeError(f"GhanaNLP TTS error — {result['type']}: {result['message']}")

        if isinstance(result, (bytes, bytearray)):
            return base64.b64encode(result).decode("utf-8")

        # Should not normally reach here, but guard anyway
        raise RuntimeError(f"GhanaNLP TTS returned unexpected type: {type(result)}")

    # ------------------------------------------------------------------
    # Translation
    # ------------------------------------------------------------------

    def translate(self, text: str, language_pair: str = "en-tw") -> str:
        """
        Translate text between a supported language pair.

        Raises RuntimeError on API errors.
        """
        result = self._client.translate(text, language_pair=language_pair)

        if _is_error(result):
            raise RuntimeError(
                f"GhanaNLP translate error — {result['type']}: {result['message']}"
            )

        if isinstance(result, str):
            return result

        if isinstance(result, dict):
            for key in ("translation", "out", "text", "result"):
                if key in result:
                    return str(result[key])
            return str(result)

        return str(result)
