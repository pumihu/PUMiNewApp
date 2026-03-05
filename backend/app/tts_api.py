"""
TTS API — Text-to-Speech for PUMi v2

Canonical voice resolution and ElevenLabs integration.
The resolve_tts_voice() helper is importable by other modules
(e.g., focusroom_api) to avoid duplicating locale→voice logic.

Endpoints:
  POST /tts        — convert text to audio (base64 mp3)
"""
from __future__ import annotations

import base64
import os
from typing import Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter(prefix="/tts", tags=["tts"])

# ---------------------------------------------------------------------------
# Voice resolution — locale → ElevenLabs voice ID
# Precedence: env var override > hardcoded fallback
# ---------------------------------------------------------------------------

ELEVENLABS_API_KEY = (os.getenv("ELEVENLABS_API_KEY") or "").strip()

# Hardcoded fallbacks — update via Railway env vars to change without deploy
_VOICE_FALLBACKS: dict[str, str] = {
    "hu": "3DRcczmb3qwp5aVD9M9E",  # custom HU voice
    "en": "21m00Tcm4TlvDq8ikWAM",  # Rachel — natural EN
}
_VOICE_ENV_KEYS: dict[str, str] = {
    "hu": "ELEVENLABS_VOICE_ID_HU",
    "en": "ELEVENLABS_VOICE_ID_EN",
}


def resolve_tts_voice(locale: str) -> str:
    """
    Deterministically map locale → ElevenLabs voice ID.
    Precedence: env var > hardcoded fallback.
    Logs WARNING when falling back so it's always visible in Railway logs.
    """
    locale_lower = (locale or "hu").strip().lower()
    env_key = _VOICE_ENV_KEYS.get(locale_lower)
    if env_key:
        env_val = os.getenv(env_key, "").strip()
        if env_val:
            return env_val
        fallback = _VOICE_FALLBACKS.get(locale_lower, _VOICE_FALLBACKS["hu"])
        print(
            f"[TTS] WARNING: {env_key} not set — using hardcoded fallback "
            f"voice={fallback} for locale={locale_lower}"
        )
        return fallback
    fallback = _VOICE_FALLBACKS["hu"]
    print(
        f"[TTS] WARNING: unknown locale='{locale_lower}' — falling back to HU voice={fallback}"
    )
    return fallback


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

try:
    from .guard import get_user_id
except Exception:
    async def get_user_id(request: Request) -> str:  # type: ignore[misc]
        return "anonymous"


# ---------------------------------------------------------------------------
# Request model
# ---------------------------------------------------------------------------

class TtsReq(BaseModel):
    text: str
    locale: str = "hu"
    voice_id: Optional[str] = None  # explicit voice override (skips resolution)


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("")
async def generate_tts(req: TtsReq, request: Request):
    """
    Convert text to audio via ElevenLabs TTS.
    Returns base64-encoded audio (audio/mpeg) compatible with existing
    frontend usage in focusRoomApi.tts().

    Returns: {ok, audio_base64, content_type} | {ok:false, error}
    """
    if not ELEVENLABS_API_KEY:
        return {"ok": False, "error": "TTS not configured"}

    try:
        import httpx

        voice = req.voice_id or resolve_tts_voice(req.locale)
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice}"

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                url,
                headers={
                    "xi-api-key": ELEVENLABS_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "text": req.text[:2000],
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75,
                    },
                },
            )

        if resp.status_code != 200:
            return {"ok": False, "error": f"ElevenLabs API error: {resp.status_code}"}

        audio_b64 = base64.b64encode(resp.content).decode("utf-8")
        return {
            "ok": True,
            "audio_base64": audio_b64,
            "content_type": "audio/mpeg",
        }

    except Exception as e:
        print(f"[tts] TTS failed: {e}")
        return {"ok": False, "error": str(e)}
