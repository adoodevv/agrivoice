"""
GhanaNLP ASR v1 supported language codes (translation-api.ghananlp.org asr/v1/transcribe).
English is not supported for speech-to-text; map legacy `en` to Twi.
"""

from __future__ import annotations

# Display order for API consumers (frontend, docs)
ASR_LANGUAGE_ITEMS: list[dict[str, str]] = [
    {"code": "tw", "label": "Twi"},
    {"code": "gaa", "label": "Ga"},
    {"code": "dag", "label": "Dagbani"},
    {"code": "yo", "label": "Yoruba"},
    {"code": "ee", "label": "Ewe"},
    {"code": "ki", "label": "Kikuyu"},
    {"code": "ha", "label": "Hausa"},
]

ASR_LANGUAGE_CODES: frozenset[str] = frozenset(item["code"] for item in ASR_LANGUAGE_ITEMS)

# When the user's language fails, try Twi first (broad Ghana coverage), then Ga.
_STT_FALLBACK_CHAIN: tuple[str, ...] = ("tw", "gaa")


def normalise_asr_language(lang: str | None, *, default: str = "tw") -> str:
    """
    Return a code accepted by GhanaNLP ASR v1.
    Unknown values and `en` (not supported by ASR) map to `default`.
    """
    if not lang:
        return default
    code = lang.strip().lower()
    if code == "en":
        return default
    if code in ASR_LANGUAGE_CODES:
        return code
    return default


def stt_fallback_languages(primary: str) -> list[str]:
    """Ordered list of other ASR codes to try after `primary` fails."""
    return [c for c in _STT_FALLBACK_CHAIN if c != primary]
