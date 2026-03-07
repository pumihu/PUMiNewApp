from __future__ import annotations

import base64
import os
import requests

from app.core.config import settings
from app.modules.tts.schemas import TTSRequest, TTSResponse

# ElevenLabs voice IDs per locale
LOCALE_VOICES = {
    "en": settings.ELEVENLABS_DEFAULT_VOICE_ID,
    "hu": "3DRcczmb3qwp5aVD9M9E",
}

ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"


def speak(req: TTSRequest) -> TTSResponse:
    api_key = settings.ELEVENLABS_API_KEY or os.getenv("ELEVENLABS_API_KEY", "")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY not set")

    voice_id = req.voice_id or LOCALE_VOICES.get(req.locale, settings.ELEVENLABS_DEFAULT_VOICE_ID)
    url = ELEVENLABS_TTS_URL.format(voice_id=voice_id)

    resp = requests.post(
        url,
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        json={
            "text": req.text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
        },
        timeout=30,
    )
    resp.raise_for_status()
    audio_b64 = base64.b64encode(resp.content).decode("utf-8")
    return TTSResponse(audio_base64=audio_b64)
