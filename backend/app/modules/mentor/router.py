from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_current_user_id
from app.modules.mentor import service
from app.modules.mentor.schemas import MentorChatRequest, MentorChatResponse

router = APIRouter(prefix="/mentor", tags=["mentor"])


@router.post("/chat", response_model=MentorChatResponse)
def mentor_chat(body: MentorChatRequest, user_id: str = Depends(get_current_user_id)):
    try:
        return service.chat(body, user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
