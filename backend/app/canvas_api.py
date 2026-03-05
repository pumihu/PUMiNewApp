"""
Canvas API — CRUD for canvas blocks within a workspace.

A canvas block is a typed content item (lesson, quiz, translation, cards,
roleplay, writing, checklist, note) conforming to the StrictFocusItem schema
used by the frontend renderers (see frontend/src/types/focusItem.ts).

Storage: in-memory dict behind a simple interface.
Swap storage by replacing the _store_* functions — keep the interface stable.

Endpoints:
  POST   /canvas/block            — create block
  PATCH  /canvas/block/{id}       — update block
  DELETE /canvas/block/{id}       — delete block
  GET    /canvas/{workspace_id}   — list blocks (ordered by order_index)
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter(prefix="/canvas", tags=["canvas"])


# ---------------------------------------------------------------------------
# In-memory store
# Replace _store_* functions with Supabase REST calls to swap persistence.
# ---------------------------------------------------------------------------

_blocks: Dict[str, Dict[str, Any]] = {}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _store_create_block(block: Dict[str, Any]) -> Dict[str, Any]:
    _blocks[block["id"]] = block
    return block


def _store_get_block(block_id: str) -> Optional[Dict[str, Any]]:
    return _blocks.get(block_id)


def _store_update_block(block_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    block = _blocks.get(block_id)
    if not block:
        return None
    block.update(updates)
    block["updated_at"] = _now()
    return block


def _store_delete_block(block_id: str) -> bool:
    return _blocks.pop(block_id, None) is not None


def _store_list_blocks(workspace_id: str) -> List[Dict[str, Any]]:
    """Return blocks for a workspace sorted by order_index."""
    return sorted(
        [b for b in _blocks.values() if b.get("workspace_id") == workspace_id],
        key=lambda b: b.get("order_index", 0),
    )


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

class CreateBlockReq(BaseModel):
    workspace_id: str
    type: str  # must match FocusItemKind or "note"
    title: str
    content: Dict[str, Any] = {}
    order_index: Optional[int] = None


class UpdateBlockReq(BaseModel):
    title: Optional[str] = None
    content: Optional[Dict[str, Any]] = None
    order_index: Optional[int] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/block")
async def create_block(req: CreateBlockReq, request: Request):
    """
    Create a new canvas block.
    order_index is auto-assigned if omitted (appended at the end).
    """
    await get_user_id(request)
    now = _now()

    if req.order_index is None:
        existing = _store_list_blocks(req.workspace_id)
        order = len(existing)
    else:
        order = req.order_index

    block = {
        "id": str(uuid.uuid4()),
        "workspace_id": req.workspace_id,
        "type": req.type,
        "title": req.title,
        "content": req.content,
        "order_index": order,
        "created_at": now,
        "updated_at": now,
    }
    _store_create_block(block)
    return {"ok": True, "block": block}


@router.patch("/block/{block_id}")
async def update_block(block_id: str, req: UpdateBlockReq, request: Request):
    """Update a block's title, content, and/or order_index."""
    await get_user_id(request)
    updates = req.model_dump(exclude_none=True)
    block = _store_update_block(block_id, updates)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    return {"ok": True, "block": block}


@router.delete("/block/{block_id}")
async def delete_block(block_id: str, request: Request):
    """Delete a canvas block permanently."""
    await get_user_id(request)
    deleted = _store_delete_block(block_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Block not found")
    return {"ok": True, "block_id": block_id}


@router.get("/{workspace_id}")
async def list_blocks(workspace_id: str, request: Request):
    """List all blocks in a workspace ordered by order_index."""
    await get_user_id(request)
    blocks = _store_list_blocks(workspace_id)
    return {"ok": True, "blocks": blocks, "count": len(blocks)}
