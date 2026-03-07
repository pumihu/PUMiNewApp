from pydantic import BaseModel
from typing import Optional


class SessionRequest(BaseModel):
    access_token: str


class UserProfile(BaseModel):
    id: str
    email: Optional[str] = None
    tier: str = "FREE"


class SessionResponse(BaseModel):
    user: UserProfile
    token: str
