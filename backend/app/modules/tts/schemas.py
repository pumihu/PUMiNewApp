from pydantic import BaseModel
from typing import Optional


class TTSRequest(BaseModel):
    text: str
    locale: str = "en"
    voice_id: Optional[str] = None


class TTSResponse(BaseModel):
    audio_base64: str
    content_type: str = "audio/mpeg"
