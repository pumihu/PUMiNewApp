from __future__ import annotations

import json

from app.core import llm_client
from app.core.config import settings
from app.modules.creative.schemas import (
    BriefRequest, BriefResponse,
    VisualizeRequest, VisualizeResponse, VisualDirection,
    StoryboardRequest, StoryboardResponse, StoryboardScene,
)
from app.modules.creative.prompt_builder import BRIEF_SYSTEM, VISUALIZE_SYSTEM, STORYBOARD_SYSTEM


def _parse_json(text: str) -> dict:
    """Strip markdown fences and parse JSON."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    return json.loads(text)


def build_brief(req: BriefRequest) -> BriefResponse:
    lang = req.locale if req.locale in ("en", "hu") else "en"
    text = llm_client.chat_completion(
        system=BRIEF_SYSTEM[lang],
        user=req.goal,
        model=settings.CREATIVE_MODEL,
        max_tokens=512,
    )
    data = _parse_json(text)
    return BriefResponse(
        title=data.get("title", ""),
        objective=data.get("objective", ""),
        audience=data.get("audience", ""),
        tone=data.get("tone", ""),
        key_messages=data.get("key_messages", []),
        constraints=data.get("constraints"),
    )


def visualize(req: VisualizeRequest) -> VisualizeResponse:
    lang = req.locale if req.locale in ("en", "hu") else "en"
    text = llm_client.chat_completion(
        system=VISUALIZE_SYSTEM[lang],
        user=req.brief,
        model=settings.CREATIVE_MODEL,
        max_tokens=768,
    )
    data = _parse_json(text)
    directions = [
        VisualDirection(
            name=d.get("name", ""),
            rationale=d.get("rationale", ""),
            image_prompt=d.get("image_prompt", ""),
        )
        for d in data.get("directions", [])
    ]
    return VisualizeResponse(directions=directions)


def build_storyboard(req: StoryboardRequest) -> StoryboardResponse:
    lang = req.locale if req.locale in ("en", "hu") else "en"
    text = llm_client.chat_completion(
        system=STORYBOARD_SYSTEM[lang],
        user=req.brief,
        model=settings.CREATIVE_MODEL,
        max_tokens=1024,
    )
    data = _parse_json(text)
    scenes = [
        StoryboardScene(
            scene_title=s.get("scene_title", ""),
            image_prompt=s.get("image_prompt", ""),
            voiceover=s.get("voiceover", ""),
            camera_direction=s.get("camera_direction", ""),
        )
        for s in data.get("scenes", [])
    ]
    return StoryboardResponse(scenes=scenes)
