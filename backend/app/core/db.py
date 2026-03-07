from __future__ import annotations

import os
from typing import Optional, List, Dict, Any, Tuple

import psycopg2
from psycopg2.extras import RealDictCursor

from app.core.config import settings


def get_dsn() -> str:
    dsn = (settings.SUPABASE_DB_URL or "").strip()
    if dsn:
        return dsn
    return (settings.DATABASE_URL or "").strip()


def _connect():
    dsn = get_dsn()
    if not dsn:
        raise RuntimeError("DATABASE_URL or SUPABASE_DB_URL not set")
    if ".supabase.co" in dsn and not dsn.startswith("postgres"):
        raise RuntimeError("Invalid DB DSN: looks like SUPABASE_URL (REST), not Postgres")
    return psycopg2.connect(dsn, sslmode="require")


def run_sql(sql: str, params: Optional[Tuple[Any, ...]] = None) -> None:
    if not get_dsn():
        return
    conn = _connect()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(sql, params or ())
    finally:
        conn.close()


def fetch_all(sql: str, params: Optional[Tuple[Any, ...]] = None) -> List[Dict[str, Any]]:
    if not get_dsn():
        return []
    conn = _connect()
    try:
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(sql, params or ())
                rows = cur.fetchall()
                return [dict(r) for r in rows] if rows else []
    finally:
        conn.close()


def fetch_one(sql: str, params: Optional[Tuple[Any, ...]] = None) -> Optional[Dict[str, Any]]:
    if not get_dsn():
        return None
    conn = _connect()
    try:
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(sql, params or ())
                row = cur.fetchone()
                return dict(row) if row else None
    finally:
        conn.close()


def ensure_schema() -> None:
    """Create v2 tables if they don't exist."""
    if not get_dsn():
        return
    conn = _connect()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS workspaces (
                        id UUID PRIMARY KEY,
                        user_id UUID NOT NULL,
                        title TEXT NOT NULL,
                        description TEXT,
                        mode TEXT NOT NULL DEFAULT 'build',
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                """)
                cur.execute("CREATE INDEX IF NOT EXISTS ix_workspaces_user_id ON workspaces(user_id);")

                cur.execute("""
                    CREATE TABLE IF NOT EXISTS canvas_blocks (
                        id UUID PRIMARY KEY,
                        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                        type TEXT NOT NULL,
                        title TEXT,
                        content_json JSONB NOT NULL DEFAULT '{}',
                        position INTEGER NOT NULL DEFAULT 0,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                """)
                cur.execute("CREATE INDEX IF NOT EXISTS ix_canvas_blocks_workspace_id ON canvas_blocks(workspace_id);")

                cur.execute("""
                    CREATE TABLE IF NOT EXISTS source_documents (
                        id UUID PRIMARY KEY,
                        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                        name TEXT NOT NULL,
                        source_type TEXT NOT NULL DEFAULT 'text',
                        content_text TEXT,
                        summary TEXT,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                """)
                cur.execute("CREATE INDEX IF NOT EXISTS ix_source_docs_workspace_id ON source_documents(workspace_id);")

                cur.execute("""
                    CREATE TABLE IF NOT EXISTS creative_assets (
                        id UUID PRIMARY KEY,
                        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                        asset_type TEXT NOT NULL,
                        prompt TEXT,
                        metadata_json JSONB NOT NULL DEFAULT '{}',
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                """)
                cur.execute("CREATE INDEX IF NOT EXISTS ix_creative_assets_workspace_id ON creative_assets(workspace_id);")

                cur.execute("""
                    CREATE TABLE IF NOT EXISTS mentor_sessions (
                        id UUID PRIMARY KEY,
                        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                        last_language TEXT NOT NULL DEFAULT 'en',
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                """)
                cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS ux_mentor_sessions_workspace_id ON mentor_sessions(workspace_id);")
    finally:
        conn.close()
