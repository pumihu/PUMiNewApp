from __future__ import annotations

import json
import base64
from typing import Optional

from app.modules.auth.schemas import UserProfile


def decode_supabase_token(token: str) -> dict:
    """Decode Supabase JWT payload (no signature verification — Supabase handles that)."""
    try:
        parts = token.split(".")
        payload_b64 = parts[1] + "=" * (4 - len(parts[1]) % 4)
        return json.loads(base64.urlsafe_b64decode(payload_b64))
    except Exception as exc:
        raise ValueError(f"Cannot decode token: {exc}")


def user_from_token(token: str) -> UserProfile:
    payload = decode_supabase_token(token)
    user_id = payload.get("sub", "")
    email = payload.get("email") or None
    return UserProfile(id=user_id, email=email, tier="FREE")
