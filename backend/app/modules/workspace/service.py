from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from app.core import db
from app.modules.workspace.schemas import Workspace, WorkspaceCreate, WorkspaceUpdate


def _row_to_workspace(row: dict) -> Workspace:
    return Workspace(
        id=str(row["id"]),
        user_id=str(row["user_id"]),
        title=row["title"],
        description=row.get("description"),
        mode=row.get("mode", "build"),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def create_workspace(user_id: str, data: WorkspaceCreate) -> Workspace:
    now = datetime.now(timezone.utc)
    wid = str(uuid.uuid4())
    db.run_sql(
        """
        INSERT INTO workspaces (id, user_id, title, description, mode, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (wid, user_id, data.title, data.description, data.mode, now, now),
    )
    row = db.fetch_one("SELECT * FROM workspaces WHERE id = %s", (wid,))
    return _row_to_workspace(row)


def list_workspaces(user_id: str) -> List[Workspace]:
    rows = db.fetch_all(
        "SELECT * FROM workspaces WHERE user_id = %s ORDER BY updated_at DESC",
        (user_id,),
    )
    return [_row_to_workspace(r) for r in rows]


def get_workspace(workspace_id: str, user_id: str) -> Optional[Workspace]:
    row = db.fetch_one(
        "SELECT * FROM workspaces WHERE id = %s AND user_id = %s",
        (workspace_id, user_id),
    )
    return _row_to_workspace(row) if row else None


def update_workspace(workspace_id: str, user_id: str, data: WorkspaceUpdate) -> Optional[Workspace]:
    existing = db.fetch_one(
        "SELECT * FROM workspaces WHERE id = %s AND user_id = %s",
        (workspace_id, user_id),
    )
    if not existing:
        return None

    sets: list[str] = []
    params: list[object] = []

    if data.title is not None:
        sets.append("title = %s")
        params.append(data.title)

    if data.description is not None:
        sets.append("description = %s")
        params.append(data.description)

    if data.mode is not None:
        mode = data.mode if data.mode in ("build", "learn", "creative") else "build"
        sets.append("mode = %s")
        params.append(mode)

    if not sets:
        return _row_to_workspace(existing)

    sets.append("updated_at = NOW()")
    params.append(workspace_id)
    params.append(user_id)

    db.run_sql(
        f"UPDATE workspaces SET {', '.join(sets)} WHERE id = %s AND user_id = %s",
        tuple(params),
    )

    row = db.fetch_one(
        "SELECT * FROM workspaces WHERE id = %s AND user_id = %s",
        (workspace_id, user_id),
    )
    return _row_to_workspace(row) if row else None
