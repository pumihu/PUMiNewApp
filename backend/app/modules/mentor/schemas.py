from pydantic import BaseModel
from typing import List, Optional, Literal


class MentorChatRequest(BaseModel):
    workspace_id: str
    message: str
    locale: Literal["en", "hu"] = "en"
    selected_block_ids: List[str] = []
    mode: Literal["build", "learn", "creative"] = "build"


class SuggestedAction(BaseModel):
    label: str
    action: str
    payload: Optional[dict] = None


class MentorGeneratedBlock(BaseModel):
    block_type: str
    title: Optional[str] = None
    content_json: Optional[dict] = None
    reason: Optional[str] = None


class MentorChatResponse(BaseModel):
    text: str
    suggested_actions: List[SuggestedAction] = []
    generated_blocks: List[MentorGeneratedBlock] = []
    tool_results: List[dict] = []
    language: str
