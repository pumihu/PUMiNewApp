from fastapi import APIRouter, Depends

from app.core.deps import get_current_user_id
from app.modules.creative.schemas import (
    BriefRequest, BriefResponse,
    VisualizeRequest, VisualizeResponse,
    StoryboardRequest, StoryboardResponse,
)
from app.modules.creative import service

router = APIRouter(prefix="/creative", tags=["creative"])


@router.post("/brief", response_model=BriefResponse)
def build_brief(body: BriefRequest, user_id: str = Depends(get_current_user_id)):
    return service.build_brief(body)


@router.post("/visualize", response_model=VisualizeResponse)
def visualize(body: VisualizeRequest, user_id: str = Depends(get_current_user_id)):
    return service.visualize(body)


@router.post("/storyboard", response_model=StoryboardResponse)
def build_storyboard(body: StoryboardRequest, user_id: str = Depends(get_current_user_id)):
    return service.build_storyboard(body)
