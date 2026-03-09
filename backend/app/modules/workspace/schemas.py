from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class WorkspaceMode(str):
    BUILD = "build"
    LEARN = "learn"
    CREATIVE = "creative"


class WorkspaceCreate(BaseModel):
    title: str
    description: Optional[str] = None
    mode: str = "build"


class WorkspaceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    mode: Optional[str] = None


class Workspace(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str] = None
    mode: str
    created_at: datetime
    updated_at: datetime
