from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel

from app.modules.canvas.schemas import CanvasBlock


class DocumentUpload(BaseModel):
    workspace_id: str
    name: str
    source_type: str = "text"
    content_text: str
    locale: Literal["en", "hu"] = "en"


class DocumentSummarizeRequest(BaseModel):
    document_id: Optional[str] = None
    workspace_id: Optional[str] = None
    name: Optional[str] = None
    source_type: str = "text"
    content_text: Optional[str] = None
    locale: Literal["en", "hu"] = "en"


class SourceDocument(BaseModel):
    id: str
    workspace_id: str
    name: str
    source_type: str
    content_text: Optional[str] = None
    summary: Optional[str] = None
    created_at: datetime


class DocumentSummaryBundle(BaseModel):
    document: SourceDocument
    source_block: CanvasBlock
    summary_block: CanvasBlock
    key_points: List[str]
    suggested_next_actions: List[str] = []
