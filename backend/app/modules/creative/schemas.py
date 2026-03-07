from pydantic import BaseModel
from typing import List, Optional


class BriefRequest(BaseModel):
    workspace_id: str
    goal: str
    locale: str = "en"


class BriefResponse(BaseModel):
    title: str
    objective: str
    audience: str
    tone: str
    key_messages: List[str]
    constraints: Optional[str] = None


class VisualizeRequest(BaseModel):
    workspace_id: str
    brief: str
    locale: str = "en"


class VisualDirection(BaseModel):
    name: str
    rationale: str
    image_prompt: str


class VisualizeResponse(BaseModel):
    directions: List[VisualDirection]


class StoryboardRequest(BaseModel):
    workspace_id: str
    brief: str
    locale: str = "en"


class StoryboardScene(BaseModel):
    scene_title: str
    image_prompt: str
    voiceover: str
    camera_direction: str


class StoryboardResponse(BaseModel):
    scenes: List[StoryboardScene]
