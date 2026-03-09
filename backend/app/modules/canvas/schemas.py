from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


BLOCK_TYPES = [
    "note",
    "task_list",
    "link",
    "source",
    "pdf_reference",
    "summary",
    "idea",
    "ai_sticky",
    "creative_brief",
    "image_asset",
    "image",
    "gif",
    "sticker",
    "moodboard",
    "reference_board",
    "storyboard",
    "lesson",
    "quiz",
    "flashcard",
    "goal",
    "roadmap",
    "critique",
    "brief",
    "image_generation",
    "copy",
    "board_section",
]


class CanvasBlockCreate(BaseModel):
    workspace_id: str
    type: str
    title: Optional[str] = None
    content_json: Optional[Any] = None
    position: int = 0


class CanvasBlockPatch(BaseModel):
    title: Optional[str] = None
    content_json: Optional[Any] = None
    position: Optional[int] = None


class CanvasBlock(BaseModel):
    id: str
    workspace_id: str
    type: str
    title: Optional[str] = None
    content_json: Optional[Any] = None
    position: int
    created_at: datetime
    updated_at: datetime
