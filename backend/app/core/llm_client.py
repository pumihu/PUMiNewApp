from __future__ import annotations

import os
from typing import Optional
import anthropic

from app.core.config import settings

_client: Optional[anthropic.Anthropic] = None


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        api_key = settings.ANTHROPIC_API_KEY or os.getenv("ANTHROPIC_API_KEY", "")
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY not set")
        _client = anthropic.Anthropic(api_key=api_key)
    return _client


def chat_completion(
    *,
    system: str,
    user: str,
    model: Optional[str] = None,
    max_tokens: int = 1024,
) -> str:
    """Single-turn synchronous completion. Returns assistant text."""
    client = get_client()
    resolved_model = model or settings.MENTOR_MODEL
    message = client.messages.create(
        model=resolved_model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return message.content[0].text


def chat_with_history(
    *,
    system: str,
    messages: list[dict],
    model: Optional[str] = None,
    max_tokens: int = 1024,
) -> str:
    """Multi-turn completion from a messages list. Returns assistant text."""
    client = get_client()
    resolved_model = model or settings.MENTOR_MODEL
    message = client.messages.create(
        model=resolved_model,
        max_tokens=max_tokens,
        system=system,
        messages=messages,
    )
    return message.content[0].text
