from fastapi import APIRouter, Depends

from app.core.deps import get_current_user_id
from app.modules.tts.schemas import TTSRequest, TTSResponse
from app.modules.tts import service

router = APIRouter(prefix="/tts", tags=["tts"])


@router.post("/speak", response_model=TTSResponse)
def speak(body: TTSRequest, user_id: str = Depends(get_current_user_id)):
    return service.speak(body)
