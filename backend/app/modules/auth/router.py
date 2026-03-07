from fastapi import APIRouter, Depends

from app.core.deps import get_current_user_id
from app.modules.auth.schemas import SessionRequest, SessionResponse, UserProfile
from app.modules.auth.service import user_from_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/session", response_model=SessionResponse)
def create_session(body: SessionRequest):
    """Exchange a Supabase access_token for a verified user profile."""
    user = user_from_token(body.access_token)
    return SessionResponse(user=user, token=body.access_token)


@router.get("/me", response_model=UserProfile)
def get_me(user_id: str = Depends(get_current_user_id)):
    """Return the authenticated user's basic profile."""
    return UserProfile(id=user_id)
