"""
Workspace API — PUMi v2 AI Learning Workspace

A workspace is the top-level container for a user's learning session.
It has a goal and owns a set of canvas blocks.

Storage: in-memory dict behind a simple interface.
Swap storage by replacing the _store_* functions — keep the interface stable.

Endpoints:
  POST /workspace/create       — create workspace
  GET  /workspace/{id}         — fetch workspace + all its canvas blocks
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter(prefix="/workspace", tags=["workspace"])


# ---------------------------------------------------------------------------
# In-memory store
# Replace _store_* functions with Supabase REST calls to swap persistence.
# ---------------------------------------------------------------------------

_workspaces: Dict[str, Dict[str, Any]] = {}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _store_create_workspace(workspace: Dict[str, Any]) -> Dict[str, Any]:
    _workspaces[workspace["id"]] = workspace
    return workspace


def _store_get_workspace(workspace_id: str) -> Optional[Dict[str, Any]]:
    return _workspaces.get(workspace_id)


def _store_list_workspaces(user_id: str) -> List[Dict[str, Any]]:
    return [w for w in _workspaces.values() if w.get("user_id") == user_id]


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

try:
    from .guard import get_user_id
except Exception:
    async def get_user_id(request: Request) -> str:  # type: ignore[misc]
        return "anonymous"


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class CreateWorkspaceReq(BaseModel):
    title: str
    goal: str = ""
    locale: str = "hu"  # "hu" | "en" — controls tutor language + TTS voice


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/create")
async def create_workspace(req: CreateWorkspaceReq, request: Request):
    """
    Create a new AI Learning Workspace.
    Returns workspace_id used for all subsequent canvas and tutor calls.
    """
    uid = await get_user_id(request)
    now = _now()

    workspace = {
        "id": str(uuid.uuid4()),
        "user_id": uid,
        "title": req.title,
        "goal": req.goal,
        "locale": req.locale,
        "created_at": now,
        "updated_at": now,
    }
    _store_create_workspace(workspace)
    return {"ok": True, "workspace": workspace}


@router.get("/{workspace_id}")
async def get_workspace(workspace_id: str, request: Request):
    """
    Fetch a workspace and all its canvas blocks.
    Canvas blocks are ordered by order_index ascending.
    """
    await get_user_id(request)

    workspace = _store_get_workspace(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Import lazily to avoid circular import at module load time
    from .canvas_api import _store_list_blocks
    blocks = _store_list_blocks(workspace_id)

    return {"ok": True, "workspace": workspace, "blocks": blocks}
