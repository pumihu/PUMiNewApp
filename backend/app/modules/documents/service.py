from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from app.core import db, llm_client
from app.modules.canvas.schemas import CanvasBlock
from app.modules.documents.schemas import (
    DocumentSummarizeRequest,
    DocumentSummaryBundle,
    DocumentUpload,
    SourceDocument,
)


def _row_to_doc(row: dict) -> SourceDocument:
    return SourceDocument(
        id=str(row["id"]),
        workspace_id=str(row["workspace_id"]),
        name=row["name"],
        source_type=row.get("source_type", "text"),
        content_text=row.get("content_text"),
        summary=row.get("summary"),
        created_at=row["created_at"],
    )


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


def _get_document_for_user(document_id: str, user_id: str) -> Optional[dict]:
    return db.fetch_one(
        """
        SELECT d.*
        FROM source_documents d
        JOIN workspaces w ON w.id = d.workspace_id
        WHERE d.id = %s AND w.user_id = %s
        """,
        (document_id, user_id),
    )


def _create_document(
    *,
    workspace_id: str,
    name: str,
    source_type: str,
    content_text: str,
) -> dict:
    now = datetime.now(timezone.utc)
    did = str(uuid.uuid4())

    db.run_sql(
        """
        INSERT INTO source_documents (id, workspace_id, name, source_type, content_text, created_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (did, workspace_id, name, source_type, content_text, now),
    )

    row = db.fetch_one("SELECT * FROM source_documents WHERE id = %s", (did,))
    if not row:
        raise RuntimeError("Document create failed")
    return row


def _extract_json_object(raw: str) -> Optional[dict]:
    if not raw:
        return None

    text = raw.strip()

    # strip common markdown fences
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text, flags=re.IGNORECASE).strip()
        text = re.sub(r"```$", "", text).strip()

    try:
        return json.loads(text)
    except Exception:
        pass

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None

    try:
        return json.loads(text[start : end + 1])
    except Exception:
        return None


def _split_sentences(text: str) -> List[str]:
    normalized = re.sub(r"\s+", " ", text or "").strip()
    if not normalized:
        return []

    chunks = re.split(r"(?<=[.!?])\s+", normalized)
    return [chunk.strip() for chunk in chunks if chunk.strip()]


def _fallback_summary(content: str, locale: str) -> tuple[str, List[str], List[str]]:
    sentences = _split_sentences(content)
    summary_sentences = sentences[:4]

    if summary_sentences:
        summary = " ".join(summary_sentences)
    else:
        summary = (content or "")[:600].strip()

    key_points = sentences[:5] if sentences else []

    if not key_points and summary:
        key_points = [summary]

    while len(key_points) < 3:
        if locale == "hu":
            key_points.append("Tovabbi kontextus segithet a melyebb bontasban.")
        else:
            key_points.append("More context can help produce deeper structured points.")

    if locale == "hu":
        actions = [
            "Alakitsd at ezt az osszefoglalot egy konkret feladatlistava.",
            "Jelold ki a legerosebb allitasokat, es kerj ellenervet.",
            "Kerd a mentortol, hogy epitsen cselekvesi tervet a forras alapjan.",
        ]
    else:
        actions = [
            "Turn this summary into a concrete task list.",
            "Ask the mentor to challenge the strongest claims.",
            "Request a practical action plan based on this source.",
        ]

    return summary[:1200], key_points[:7], actions


def _summarize_content(content: str, locale: str) -> tuple[str, List[str], List[str]]:
    lang_hint = "Hungarian" if locale == "hu" else "English"

    system = (
        "You summarize source material for an AI mentor workspace. "
        "Return STRICT JSON with keys: summary, key_points, suggested_next_actions. "
        "Rules: summary max 220 words; key_points must be 3-7 bullets; suggested_next_actions 0-3 short actions. "
        f"Write all text in {lang_hint}."
    )

    user = json.dumps({"content": content[:12000]}, ensure_ascii=False)

    try:
        raw = llm_client.chat_completion(system=system, user=user, max_tokens=900)
    except Exception:
        return _fallback_summary(content, locale)

    payload = _extract_json_object(raw)
    if not payload:
        return _fallback_summary(content, locale)

    summary = str(payload.get("summary") or "").strip()
    key_points = [str(point).strip() for point in (payload.get("key_points") or []) if str(point).strip()]
    suggested = [str(item).strip() for item in (payload.get("suggested_next_actions") or []) if str(item).strip()]

    if not summary:
        return _fallback_summary(content, locale)

    if len(key_points) < 3:
        _, fallback_key_points, _ = _fallback_summary(content, locale)
        for point in fallback_key_points:
            if point not in key_points:
                key_points.append(point)
            if len(key_points) >= 7:
                break

    return summary[:1400], key_points[:7], suggested[:3]


def _next_canvas_position(workspace_id: str) -> int:
    row = db.fetch_one(
        "SELECT COALESCE(MAX(position), -1) AS max_position FROM canvas_blocks WHERE workspace_id = %s",
        (workspace_id,),
    )
    max_position = int((row or {}).get("max_position", -1))
    return max_position + 1


def _insert_canvas_block(
    *,
    workspace_id: str,
    block_type: str,
    title: str,
    content_json: dict,
    position: int,
) -> CanvasBlock:
    now = datetime.now(timezone.utc)
    block_id = str(uuid.uuid4())

    db.run_sql(
        """
        INSERT INTO canvas_blocks (id, workspace_id, type, title, content_json, position, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s, %s)
        """,
        (
            block_id,
            workspace_id,
            block_type,
            title,
            json.dumps(content_json, ensure_ascii=False),
            position,
            now,
            now,
        ),
    )

    row = db.fetch_one("SELECT * FROM canvas_blocks WHERE id = %s", (block_id,))
    if not row:
        raise RuntimeError("Canvas block create failed")
    return _row_to_block(row)


def _build_document_bundle(document_row: dict, locale: str) -> DocumentSummaryBundle:
    content = document_row.get("content_text") or ""
    summary, key_points, suggested_next_actions = _summarize_content(content, locale)

    db.run_sql(
        "UPDATE source_documents SET summary = %s WHERE id = %s",
        (summary, document_row["id"]),
    )
    document_row["summary"] = summary

    source_name = str(document_row.get("name") or "Source")
    source_title = source_name
    summary_title = f"Summary - {source_name}" if locale == "en" else f"Osszefoglalo - {source_name}"

    position = _next_canvas_position(str(document_row["workspace_id"]))

    source_block = _insert_canvas_block(
        workspace_id=str(document_row["workspace_id"]),
        block_type="source",
        title=source_title,
        content_json={
            "document_id": str(document_row["id"]),
            "name": source_name,
            "source_type": document_row.get("source_type", "text"),
            "excerpt": content[:600],
            "word_count": len(re.findall(r"\S+", content)),
            "char_count": len(content),
            "summary_preview": summary[:260],
            "key_points": key_points,
        },
        position=position,
    )

    summary_block = _insert_canvas_block(
        workspace_id=str(document_row["workspace_id"]),
        block_type="summary",
        title=summary_title,
        content_json={
            "document_id": str(document_row["id"]),
            "source_name": source_name,
            "text": summary,
            "key_points": key_points,
            "suggested_next_actions": suggested_next_actions,
        },
        position=position + 1,
    )

    return DocumentSummaryBundle(
        document=_row_to_doc(document_row),
        source_block=source_block,
        summary_block=summary_block,
        key_points=key_points,
        suggested_next_actions=suggested_next_actions,
    )


def upload_document(data: DocumentUpload, user_id: str) -> DocumentSummaryBundle:
    if not _workspace_owned_by_user(data.workspace_id, user_id):
        raise ValueError("Workspace not found")

    document_row = _create_document(
        workspace_id=data.workspace_id,
        name=data.name,
        source_type=data.source_type,
        content_text=data.content_text,
    )
    return _build_document_bundle(document_row, data.locale)


def summarize_document(req: DocumentSummarizeRequest, user_id: str) -> DocumentSummaryBundle:
    document_row: Optional[dict] = None

    if req.document_id:
        document_row = _get_document_for_user(req.document_id, user_id)
        if not document_row:
            raise ValueError("Document not found")

    if not document_row:
        if not req.workspace_id or not req.content_text:
            raise ValueError("workspace_id and content_text are required when document_id is not provided")

        if not _workspace_owned_by_user(req.workspace_id, user_id):
            raise ValueError("Workspace not found")

        document_row = _create_document(
            workspace_id=req.workspace_id,
            name=req.name or ("Untitled Source" if req.locale == "en" else "Nevtelen forras"),
            source_type=req.source_type,
            content_text=req.content_text,
        )

    return _build_document_bundle(document_row, req.locale)

