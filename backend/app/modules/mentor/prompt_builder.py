from __future__ import annotations

import json
from typing import List, Optional

SYSTEM_BASE = {
    "en": (
        "You are PUMi, a sharp and honest AI mentor inside a digital workspace. "
        "You can see the workspace title, mode, and canvas blocks. "
        "Help the user think clearly, structure ideas, critique work, summarize sources, "
        "and propose practical next actions. "
        "Be concise and direct."
    ),
    "hu": (
        "Te vagy a PUMi, egy oszinte es pontos AI mentor egy digitalis munkaterben. "
        "Latod a munkater nevet, modjat es a canvas blokkokat. "
        "Segits a tiszta gondolkodasban, az otletek strukturajaban, a munka kritikajaban, "
        "a forrasok osszefoglalasaban es a kovetkezo lepesekben. "
        "Valaszolj tomoren es direkt modon."
    ),
}

MODE_HINTS = {
    "build": {
        "en": (
            "Workspace mode is BUILD. Prioritize planning, structure, execution, and practical critique. "
            "Favor goal, task_list, roadmap, critique, and resource/link blocks."
        ),
        "hu": (
            "A munkater BUILD modban van. Fokusz: cel, lepesek, roadmap, vegrehajtas, kritika. "
            "Elsodlegesen goal, task_list, roadmap, critique es resource/link blokkokat javasolj."
        ),
    },
    "learn": {
        "en": (
            "Workspace mode is LEARN. Prioritize explanation, simplification, understanding gaps, and practice. "
            "Favor lesson, summary, quiz, flashcard, timeline/comparison summaries, and source context."
        ),
        "hu": (
            "A munkater LEARN modban van. Fokusz: magyarazat, egyszerusites, hianyok, gyakorlas. "
            "Elsodlegesen lesson, summary, quiz, flashcard, idovonal/osszehasonlito osszegzes es source blokkokat javasolj."
        ),
    },
    "creative": {
        "en": (
            "Workspace mode is CREATIVE. Prioritize concepts, direction, storytelling, and creative outputs. "
            "Favor brief, moodboard, storyboard, copy, image_generation, and reference_board blocks."
        ),
        "hu": (
            "A munkater CREATIVE modban van. Fokusz: koncepciok, kreativ iranyok, storytelling, kimenet. "
            "Elsodlegesen brief, moodboard, storyboard, copy, image_generation es reference_board blokkokat javasolj."
        ),
    },
}


def build_system_prompt(
    workspace_title: str,
    workspace_mode: str,
    locale: str,
    block_summaries: List[str],
    selected_block_content: List[str],
    recent_source_context: Optional[List[str]] = None,
) -> str:
    lang = locale if locale in ("en", "hu") else "en"
    mode = workspace_mode if workspace_mode in ("build", "learn", "creative") else "build"

    parts = [SYSTEM_BASE[lang]]
    parts.append(f"\n\nWorkspace: \"{workspace_title}\" | Mode: {mode.upper()}")
    parts.append(MODE_HINTS[mode][lang])

    if block_summaries:
        parts.append("\n\nCanvas blocks in this workspace:")
        for summary in block_summaries:
            parts.append(f"- {summary}")

    if recent_source_context:
        parts.append("\n\nRecent source summaries and key points:")
        for item in recent_source_context:
            parts.append(f"- {item}")

    if selected_block_content:
        parts.append("\n\nCurrently selected blocks (full content):")
        for content in selected_block_content:
            parts.append(content)

    return "\n".join(parts)


def compact_block_summary(block: dict) -> str:
    title = block.get("title") or block.get("type", "block")
    btype = block.get("type", "")

    content = block.get("content_json") or {}
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except Exception:
            content = {"text": content}

    preview = ""
    if isinstance(content, dict):
        if btype == "source":
            source_name = content.get("name") or title
            summary_preview = content.get("summary_preview") or content.get("excerpt") or ""
            preview = f"{source_name}: {str(summary_preview)[:80]}"
        elif btype == "summary":
            text = content.get("text") or ""
            key_points = content.get("key_points") or []
            if text:
                preview = str(text)[:80]
            elif key_points:
                preview = str(key_points[0])[:80]
        else:
            preview = str(content.get("text") or content.get("body") or "")[:80]
    else:
        preview = str(content)[:80]

    preview = preview.replace("\n", " ").strip()
    return f"[{btype}] {title}" + (f": {preview}..." if preview else "")
