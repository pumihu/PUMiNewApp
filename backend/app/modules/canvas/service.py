from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from app.core import db
from app.modules.canvas.schemas import CanvasBlock, CanvasBlockCreate, CanvasBlockPatch


def _row_to_block(row: dict) -> CanvasBlock:
    content = row.get("content_json")
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except Exception:
            pass

    return CanvasBlock(
        id=str(row["id"]),
        workspace_id=str(row["workspace_id"]),
        type=row["type"],
        title=row.get("title"),
        content_json=content,
        position=row.get("position", 0),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _workspace_owned_by_user(workspace_id: str, user_id: str) -> bool:
    row = db.fetch_one(
        "SELECT id FROM workspaces WHERE id = %s AND user_id = %s",
        (workspace_id, user_id),
    )
    return bool(row)


def _block_row_for_user(block_id: str, user_id: str) -> Optional[dict]:
    return db.fetch_one(
        """
        SELECT b.*
        FROM canvas_blocks b
        JOIN workspaces w ON w.id = b.workspace_id
        WHERE b.id = %s AND w.user_id = %s
        """,
        (block_id, user_id),
    )


def create_block(data: CanvasBlockCreate, user_id: str) -> CanvasBlock:
    if not _workspace_owned_by_user(data.workspace_id, user_id):
        raise PermissionError("Workspace not found")

    now = datetime.now(timezone.utc)
    bid = str(uuid.uuid4())

    db.run_sql(
        """
        INSERT INTO canvas_blocks (id, workspace_id, type, title, content_json, position, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s, %s)
        """,
        (
            bid,
            data.workspace_id,
            data.type,
            data.title,
            json.dumps(data.content_json) if data.content_json is not None else "{}",
            data.position,
            now,
            now,
        ),
    )

    row = _block_row_for_user(bid, user_id)
    if not row:
        raise RuntimeError("Block create failed")
    return _row_to_block(row)


def patch_block(block_id: str, data: CanvasBlockPatch, user_id: str) -> Optional[CanvasBlock]:
    existing = _block_row_for_user(block_id, user_id)
    if not existing:
        return None

    sets = []
    params = []

    if data.title is not None:
        sets.append("title = %s")
        params.append(data.title)

    if data.content_json is not None:
        sets.append("content_json = %s::jsonb")
        params.append(json.dumps(data.content_json))

    if data.position is not None:
        sets.append("position = %s")
        params.append(data.position)

    if not sets:
        return _row_to_block(existing)

    sets.append("updated_at = NOW()")
    params.append(block_id)

    db.run_sql(f"UPDATE canvas_blocks SET {', '.join(sets)} WHERE id = %s", tuple(params))

    row = _block_row_for_user(block_id, user_id)
    return _row_to_block(row) if row else None


def delete_block(block_id: str, user_id: str) -> bool:
    existing = _block_row_for_user(block_id, user_id)
    if not existing:
        return False

    db.run_sql("DELETE FROM canvas_blocks WHERE id = %s", (block_id,))
    return True


def list_blocks(workspace_id: str, user_id: str) -> List[CanvasBlock]:
    if not _workspace_owned_by_user(workspace_id, user_id):
        return []

    rows = db.fetch_all(
        """
        SELECT b.*
        FROM canvas_blocks b
        JOIN workspaces w ON w.id = b.workspace_id
        WHERE b.workspace_id = %s AND w.user_id = %s
        ORDER BY b.position ASC, b.created_at ASC
        """,
        (workspace_id, user_id),
    )
    return [_row_to_block(r) for r in rows]
