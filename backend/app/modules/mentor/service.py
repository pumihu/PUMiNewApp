from __future__ import annotations

import json
from typing import List

from app.core import db, llm_client
from app.modules.mentor.prompt_builder import build_system_prompt, compact_block_summary
from app.modules.mentor.schemas import MentorChatRequest, MentorChatResponse, SuggestedAction
from app.modules.mentor.tools import parse_suggested_actions


def _get_workspace_context(workspace_id: str, user_id: str) -> tuple[str, str] | None:
    row = db.fetch_one(
        "SELECT title, mode FROM workspaces WHERE id = %s AND user_id = %s",
        (workspace_id, user_id),
    )
    if not row:
        return None
    return (row["title"], row.get("mode", "build"))


def _get_blocks(workspace_id: str, user_id: str) -> list[dict]:
    return db.fetch_all(
        """
        SELECT b.id, b.type, b.title, b.content_json
        FROM canvas_blocks b
        JOIN workspaces w ON w.id = b.workspace_id
        WHERE b.workspace_id = %s AND w.user_id = %s
        ORDER BY b.position ASC
        """,
        (workspace_id, user_id),
    )


def _normalize_content(content: object) -> object:
    if isinstance(content, str):
        try:
            return json.loads(content)
        except Exception:
            return content
    return content


def _extract_recent_source_context(blocks: List[dict], locale: str) -> List[str]:
    lines: List[str] = []

    for block in reversed(blocks):
        btype = block.get("type")
        if btype not in ("source", "summary"):
            continue

        content = _normalize_content(block.get("content_json") or {})

        if btype == "source" and isinstance(content, dict):
            name = str(content.get("name") or block.get("title") or "Source")
            preview = str(content.get("summary_preview") or content.get("excerpt") or "").strip()
            if preview:
                lines.append(f"Source {name}: {preview[:180]}")
            else:
                lines.append(f"Source {name}")

        if btype == "summary" and isinstance(content, dict):
            source_name = str(content.get("source_name") or "Source")
            text = str(content.get("text") or "").strip()
            key_points = [str(item).strip() for item in (content.get("key_points") or []) if str(item).strip()]

            if text:
                lines.append(f"Summary for {source_name}: {text[:220]}")
            if key_points:
                bullet_prefix = "Pont" if locale == "hu" else "Point"
                for index, point in enumerate(key_points[:3], start=1):
                    lines.append(f"{bullet_prefix} {index} ({source_name}): {point[:180]}")

        if len(lines) >= 8:
            break

    return lines[:8]


def _fallback_text(req: MentorChatRequest, selected_count: int) -> str:
    if req.locale == "hu":
        if selected_count > 0:
            return (
                f"Atneztem a(z) {selected_count} kijelolt blokkot. "
                "Mondd meg, mi legyen a kovetkezo blokk alapu lepes."
            )
        return "Latom a munkateret. Adj egy konkret kerdest, es adok kovetkezo lepest."

    if selected_count > 0:
        return f"I reviewed {selected_count} selected block(s). Tell me the next block-level action you want."

    return "I can see your workspace. Ask a concrete question and I will propose the next block-level step."


def chat(req: MentorChatRequest, user_id: str) -> MentorChatResponse:
    context = _get_workspace_context(req.workspace_id, user_id)
    if not context:
        raise ValueError("Workspace not found")

    title, mode = context
    all_blocks = _get_blocks(req.workspace_id, user_id)

    block_summaries = [compact_block_summary(block) for block in all_blocks]
    recent_source_context = _extract_recent_source_context(all_blocks, req.locale)

    selected_blocks = [block for block in all_blocks if str(block["id"]) in req.selected_block_ids]
    selected_content = []

    for block in selected_blocks:
        content = _normalize_content(block.get("content_json") or {})
        selected_content.append(
            f"[{block.get('type', 'block')}] {block.get('title') or 'Untitled'}\n{json.dumps(content, ensure_ascii=False)}"
        )

    system = build_system_prompt(
        workspace_title=title,
        workspace_mode=mode,
        locale=req.locale,
        block_summaries=block_summaries,
        selected_block_content=selected_content,
        recent_source_context=recent_source_context,
    )

    try:
        text = llm_client.chat_completion(
            system=system,
            user=req.message,
            max_tokens=1024,
        )
    except Exception:
        text = _fallback_text(req, len(selected_blocks))

    raw_actions = parse_suggested_actions(text)
    suggested = [SuggestedAction(label=item["label"], action=item["action"]) for item in raw_actions]

    return MentorChatResponse(
        text=text,
        suggested_actions=suggested,
        tool_results=[],
        language=req.locale,
    )
