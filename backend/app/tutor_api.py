"""
Tutor API — PUMi v2 AI Tutor for the Learning Workspace

The tutor receives a user message, builds a compact snapshot of the workspace,
calls Claude Sonnet with canvas tools, executes any tool calls against the
canvas store, then returns the final text reply + updated blocks.

Flow per request:
  1. Fetch workspace + blocks from store
  2. Build structured snapshot (compact text for LLM context)
  3. Call Sonnet with CANVAS_TOOLS
  4. If stop_reason="tool_use": execute tools, send tool_results, get final text
  5. Return {text, tool_calls, updated_blocks}

Endpoint:
  POST /tutor/message
    Input:  {workspace_id, message, locale, selected_block_ids?, mode?, history?}
    Output: {ok, text, tool_calls, updated_blocks, session?}
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter(prefix="/tutor", tags=["tutor"])


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

try:
    from .guard import get_user_id
except Exception:
    async def get_user_id(request: Request) -> str:  # type: ignore[misc]
        return "anonymous"


# ---------------------------------------------------------------------------
# LLM client — Sonnet for high-quality conversational tutor responses
# ---------------------------------------------------------------------------

try:
    from .llm_client import (
        claude,
        _CLAUDE_READY,
        CLAUDE_MODEL_SONNET,
    )
    LLM_AVAILABLE = True
except Exception as e:
    print(f"[tutor] LLM import failed: {e}")
    LLM_AVAILABLE = False
    claude = None  # type: ignore[assignment]
    _CLAUDE_READY = False
    CLAUDE_MODEL_SONNET = "claude-sonnet-4-20250514"


# ---------------------------------------------------------------------------
# Canvas store + tools (imported lazily in endpoints to avoid circular imports)
# ---------------------------------------------------------------------------

from .canvas_tools import CANVAS_TOOLS
from .canvas_api import (
    _store_list_blocks,
    _store_create_block,
    _store_update_block,
    _store_delete_block,
)
from .workspace_api import _store_get_workspace


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class TutorMessageReq(BaseModel):
    workspace_id: str
    message: str
    locale: str = "hu"
    # Optionally reference specific blocks (their IDs are prepended to the message)
    selected_block_ids: List[str] = []
    # "freeform" = open conversation; "session" = structured learning session (future)
    mode: str = "freeform"
    # Prior conversation turns for multi-turn context (last N kept)
    history: Optional[List[Dict[str, str]]] = None


# ---------------------------------------------------------------------------
# Workspace snapshot — compact text representation for LLM system prompt
# ---------------------------------------------------------------------------

def _build_snapshot(workspace: Dict[str, Any], blocks: List[Dict[str, Any]]) -> str:
    """
    Compact snapshot of the workspace sent in every system prompt.
    Keeps the LLM context lean while providing full situational awareness.
    Block IDs are truncated to 8 chars — the tutor uses these in tool calls.
    """
    lines = [
        f"WORKSPACE: {workspace.get('title', 'Untitled')}",
        f"GOAL: {workspace.get('goal', '(none)')}",
        f"LOCALE: {workspace.get('locale', 'hu')}",
        f"CANVAS BLOCKS ({len(blocks)} total):",
    ]
    for b in blocks:
        summary = _summarize_content(b.get("type", "note"), b.get("content", {}))
        lines.append(
            f"  [{b['id'][:8]}] {b.get('type', '?').upper()} — "
            f"{b.get('title', 'Untitled')}: {summary}"
        )
    return "\n".join(lines)


def _summarize_content(block_type: str, content: Dict[str, Any]) -> str:
    """One-line content summary per block type for the snapshot."""
    if block_type == "quiz":
        return f"{len(content.get('questions', []))} question(s)"
    if block_type == "translation":
        return f"{len(content.get('sentences', []))} sentence(s)"
    if block_type == "cards":
        return f"{len(content.get('cards', []))} card(s)"
    if block_type == "lesson":
        return f"{len(content.get('vocabulary_table', []))} vocab item(s)"
    if block_type == "writing":
        return (content.get("prompt") or "")[:80]
    if block_type == "roleplay":
        return (content.get("scenario") or "")[:80]
    if block_type == "checklist":
        return f"{len(content.get('steps', []))} step(s)"
    if block_type == "briefing":
        return (content.get("situation") or "")[:80]
    return "(note)"


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

def _build_system_prompt(snapshot: str, locale: str) -> str:
    """Tutor personality + workspace context + tool usage instructions."""
    lang_instruction = (
        "Respond in Hungarian (Magyar) unless the user writes in English."
        if locale == "hu"
        else "Respond in English."
    )
    return f"""You are PUMi, a friendly and knowledgeable AI language tutor. \
You help users learn by creating and managing content blocks on their learning canvas.

{lang_instruction}

## Current Workspace
{snapshot}

## Your Tools
You can modify the user's canvas with:
- **create_block** — add a new learning exercise (quiz, lesson, translation, flashcards, roleplay, writing, checklist)
- **update_block** — modify a block's title or content (provide full updated content)
- **delete_block** — remove a block the user no longer needs
- **list_blocks** — inspect the canvas before creating, to avoid duplicates

## Content Schemas (use exactly these shapes when creating blocks)
- quiz        → {{questions:[{{question,options:[str],correct_index:int,explanation?}}]}}
- translation → {{sentences:[{{source,target_lang,hint?}}]}}
- cards       → {{cards:[{{front,back}}]}}
- lesson      → {{vocabulary_table:[{{word,translation,example}}],grammar_explanation,dialogues:[]}}
- writing     → {{prompt,example?,word_count_target?}}
- roleplay    → {{scenario,roles:{{user,ai}},starter_prompt,sample_exchanges:[]}}
- checklist   → {{steps:[{{instruction,proof_prompt?}}]}}
- note        → {{markdown:str}}

## Guidelines
- Be encouraging, concise, and pedagogically sound.
- When asked for exercises or practice, **create canvas blocks** rather than writing examples inline.
- For language learning: mix vocabulary (cards/lesson), comprehension (quiz/translation), and production (writing/roleplay).
- After using tools, confirm in plain language what you added or changed — no technical jargon.
- Use block IDs from the snapshot (the 8-char prefix) when calling update_block or delete_block."""


# ---------------------------------------------------------------------------
# Tool execution — run canvas tool calls against the in-memory store
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _execute_tool(
    tool_name: str,
    tool_input: Dict[str, Any],
    workspace_id: str,
) -> Dict[str, Any]:
    """
    Execute a single canvas tool call.
    Returns a result dict that is sent back to Claude as a tool_result message.
    """
    if tool_name == "create_block":
        existing = _store_list_blocks(workspace_id)
        now = _now_iso()
        block = {
            "id": str(uuid.uuid4()),
            "workspace_id": workspace_id,
            "type": tool_input.get("type", "note"),
            "title": tool_input.get("title", "Untitled"),
            "content": tool_input.get("content", {}),
            "order_index": len(existing),
            "created_at": now,
            "updated_at": now,
        }
        _store_create_block(block)
        return {"created": True, "block": block}

    if tool_name == "update_block":
        block_id = tool_input.get("block_id", "")
        # Match by full ID or 8-char prefix
        if len(block_id) == 8:
            all_blocks = _store_list_blocks(workspace_id)
            matches = [b for b in all_blocks if b["id"].startswith(block_id)]
            block_id = matches[0]["id"] if matches else block_id
        updates = {k: v for k, v in tool_input.items() if k != "block_id"}
        block = _store_update_block(block_id, updates)
        if block:
            return {"updated": True, "block": block}
        return {"updated": False, "error": f"Block {block_id} not found"}

    if tool_name == "delete_block":
        block_id = tool_input.get("block_id", "")
        if len(block_id) == 8:
            all_blocks = _store_list_blocks(workspace_id)
            matches = [b for b in all_blocks if b["id"].startswith(block_id)]
            block_id = matches[0]["id"] if matches else block_id
        deleted = _store_delete_block(block_id)
        return {"deleted": deleted, "block_id": block_id}

    if tool_name == "list_blocks":
        ws_id = tool_input.get("workspace_id", workspace_id)
        blocks = _store_list_blocks(ws_id)
        return {"blocks": blocks}

    return {"error": f"Unknown tool: {tool_name}"}


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/message")
async def tutor_message(req: TutorMessageReq, request: Request):
    """
    Send a user message to the AI tutor.

    The tutor reads the workspace snapshot, may issue tool calls to create or
    update canvas blocks, then returns a text reply with the list of mutations.

    Returns:
      ok            — always True unless LLM unavailable
      text          — tutor's reply text
      tool_calls    — list of {name, input, result} dicts (one per tool executed)
      updated_blocks — list of block dicts that were created or modified
      session       — None for freeform mode; reserved for future session mode
    """
    await get_user_id(request)

    if not LLM_AVAILABLE or not _CLAUDE_READY or not claude:
        return {
            "ok": False,
            "text": "LLM not available",
            "tool_calls": [],
            "updated_blocks": [],
            "session": None,
        }

    # 1. Fetch workspace + blocks
    workspace = _store_get_workspace(req.workspace_id)
    if not workspace:
        return {
            "ok": False,
            "text": "Workspace not found",
            "tool_calls": [],
            "updated_blocks": [],
            "session": None,
        }

    blocks = _store_list_blocks(req.workspace_id)

    # 2. Build system prompt with workspace snapshot
    snapshot = _build_snapshot(workspace, blocks)
    system_prompt = _build_system_prompt(snapshot, req.locale)

    # 3. Build messages array (with optional conversation history)
    messages: List[Dict[str, Any]] = []
    if req.history:
        for h in req.history[-8:]:  # cap history to last 8 turns
            role = h.get("role", "user")
            content = h.get("content", "")
            if role and content:
                messages.append({"role": role, "content": content})

    # Append selected block IDs to user message for explicit context
    user_message = req.message
    if req.selected_block_ids:
        refs = ", ".join(f"[{bid[:8]}]" for bid in req.selected_block_ids)
        user_message = f"[Selected blocks: {refs}]\n{req.message}"

    messages.append({"role": "user", "content": user_message})

    try:
        # 4. First LLM call — model may request tool use
        response = claude.messages.create(
            model=CLAUDE_MODEL_SONNET,
            system=system_prompt,
            messages=messages,
            tools=CANVAS_TOOLS,
            max_tokens=2048,
            temperature=0.5,
        )

        executed_tool_calls: List[Dict[str, Any]] = []
        updated_blocks: List[Dict[str, Any]] = []
        final_text = ""

        # 5. Execute tool calls if requested
        if response.stop_reason == "tool_use":
            tool_results = []

            for content_block in response.content:
                if content_block.type == "tool_use":
                    result = _execute_tool(
                        content_block.name,
                        content_block.input,
                        req.workspace_id,
                    )
                    executed_tool_calls.append(
                        {
                            "name": content_block.name,
                            "input": content_block.input,
                            "result": result,
                        }
                    )
                    # Collect created/updated blocks for the response
                    if "block" in result:
                        updated_blocks.append(result["block"])

                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": content_block.id,
                            "content": json.dumps(result, default=str),
                        }
                    )

            # 6. Follow-up call to get tutor's text reply after tool execution
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})

            follow_up = claude.messages.create(
                model=CLAUDE_MODEL_SONNET,
                system=system_prompt,
                messages=messages,
                tools=CANVAS_TOOLS,
                max_tokens=1024,
                temperature=0.5,
            )
            for cb in follow_up.content:
                if hasattr(cb, "text"):
                    final_text += cb.text

        else:
            # No tool calls — extract text directly
            for cb in response.content:
                if hasattr(cb, "text"):
                    final_text += cb.text

        return {
            "ok": True,
            "text": final_text.strip(),
            "tool_calls": executed_tool_calls,
            "updated_blocks": updated_blocks,
            "session": None,
        }

    except Exception as e:
        print(f"[tutor/message] Error: {e}")
        return {
            "ok": False,
            "text": f"Tutor error: {str(e)}",
            "tool_calls": [],
            "updated_blocks": [],
            "session": None,
        }
