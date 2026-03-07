from __future__ import annotations

import base64
import json
import os
import uuid
from typing import Optional

from fastapi import Header, HTTPException, status


def _decode_jwt_payload(token: str) -> dict:
    """Decode JWT payload without verification (verification is handled upstream)."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid JWT structure")

        payload_b64 = parts[1] + "=" * (4 - len(parts[1]) % 4)
        payload_bytes = base64.urlsafe_b64decode(payload_b64)
        return json.loads(payload_bytes)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def _is_valid_uuid(value: str) -> bool:
    try:
        uuid.UUID(str(value))
        return True
    except Exception:
        return False


async def get_current_user_id(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
) -> str:
    """
    Resolve authenticated user id.

    Supported modes:
    1) Direct Supabase JWT in Authorization header (sub claim).
    2) Trusted proxy mode: Authorization Bearer RAILWAY_TOKEN + X-User-ID header.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Empty token")

    railway_token = (os.getenv("RAILWAY_TOKEN") or "").strip()
    if railway_token and token == railway_token:
        if not x_user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="RAILWAY_TOKEN requires X-User-ID header",
            )
        if not _is_valid_uuid(x_user_id):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid user_id format",
            )
        return x_user_id

    payload = _decode_jwt_payload(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No user_id in token")
    return user_id


async def get_current_user_optional(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
) -> Optional[str]:
    """Like get_current_user_id but returns None instead of raising."""
    try:
        return await get_current_user_id(authorization=authorization, x_user_id=x_user_id)
    except HTTPException:
        return None
