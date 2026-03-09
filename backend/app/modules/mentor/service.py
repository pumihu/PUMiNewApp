from __future__ import annotations

import json
import uuid
from typing import List, Optional

from app.core import db, llm_client
from app.modules.mentor.prompt_builder import build_system_prompt, compact_block_summary
from app.modules.mentor.schemas import (
    MentorChatRequest,
    MentorChatResponse,
    MentorGeneratedBlock,
    SuggestedAction,
)
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


def _contains_any(text: str, terms: List[str]) -> bool:
    return any(term in text for term in terms)


def _selected_preview(selected_blocks: List[dict]) -> str:
    for block in selected_blocks:
        content = _normalize_content(block.get("content_json") or {})
        if isinstance(content, dict):
            for key in ("text", "excerpt", "summary_preview", "goal", "objective"):
                value = content.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip()[:180]
        title = block.get("title")
        if isinstance(title, str) and title.strip():
            return title.strip()[:120]
    return ""


def _is_board_request(message: str) -> bool:
    normalized = (message or "").lower()
    if _contains_any(
        normalized,
        [
            "moodboard",
            "mood board",
            "reference board",
            "gif block",
            "sticker block",
            "link block",
            "pdf reference",
        ],
    ):
        return False
    return _contains_any(
        normalized,
        [
            "board",
            "study board",
            "lesson board",
            "visual lesson board",
            "classroom summary board",
            "4-section",
            "4 section",
            "organize this into",
            "turn this workspace into",
            "tabla",
            "tábla",
            "tablat",
            "táblát",
        ],
    )


def _infer_requested_block_type(message: str, mode: str) -> Optional[str]:
    normalized = (message or "").lower()
    explicit_checks = [
        ("source", ["source block", "source material", "learning material", "study source", "forras blokk"]),
        ("moodboard", ["moodboard", "mood board", "inspiration board", "visual direction board"]),
        ("reference_board", ["reference board", "pinterest-style board", "resource board"]),
        ("gif", ["gif", "gif block"]),
        ("sticker", ["sticker", "emoji marker", "emoji block"]),
        ("link", ["link block", "resource link", "insert link", "add link"]),
        ("pdf_reference", ["pdf reference", "pdf block", "document reference", "citation block"]),
        ("quiz", ["quiz", "kviz", "kvíz", "teszt", "3-question", "3 question"]),
        ("flashcard", ["flashcard", "flash card", "kartya", "kártya"]),
        ("lesson", ["lesson", "explain", "simplify", "magyaraz", "magyaráz", "tanits", "taníts"]),
        ("summary", ["summary", "summarize", "key concept", "timeline", "comparison", "compare", "osszefoglal", "összefoglal"]),
        ("task_list", ["task list", "tasks", "todo", "to-do", "feladat", "teendo", "teendő", "steps"]),
        ("goal", ["goal", "objective", "cel", "cél"]),
        ("roadmap", ["roadmap", "timeline", "milestone", "utemterv", "ütemterv"]),
        ("critique", ["critique", "review", "feedback", "kritika", "criticize"]),
        ("brief", ["brief", "creative brief", "creative direction", "direction block"]),
        ("storyboard", ["storyboard", "scene", "jelenet", "shot list"]),
        ("image_generation", ["image generation", "generate image", "text-to-image", "image prompt", "kep", "kép"]),
        ("copy", ["copy", "headline", "tagline", "caption", "ad copy", "szoveg", "szöveg"]),
    ]
    for block_type, terms in explicit_checks:
        if _contains_any(normalized, terms):
            return block_type

    if mode == "build":
        if _contains_any(normalized, ["refine goal", "clarify goal", "success criteria", "kristalyositsd a celt"]):
            return "goal"
        if _contains_any(normalized, ["break into", "next steps", "action plan", "kovetkezo lepes"]):
            return "task_list"
        if _contains_any(normalized, ["plan critique", "risk review", "kritikald", "kockazat"]):
            return "critique"
        if _contains_any(normalized, ["resource", "reference link", "external source"]):
            return "link"

    if mode == "learn":
        if _contains_any(normalized, ["timeline", "chronology", "comparison", "compare", "osszehasonlitas", "idovonal"]):
            return "summary"
        if _contains_any(normalized, ["practice me", "quiz me", "test me", "visszakerdezes"]):
            return "quiz"
        if _contains_any(normalized, ["flashcards", "recall cards", "ismetlokartya"]):
            return "flashcard"
        if _contains_any(normalized, ["source", "material", "forrasanyag"]):
            return "source"

    if mode == "creative":
        if _contains_any(normalized, ["direction", "concept direction", "creative angle", "kreativ irany"]):
            return "brief"
        if _contains_any(normalized, ["visual references", "reference pack", "inspiration references"]):
            return "reference_board"

    is_block_intent = _contains_any(
        normalized,
        ["create", "make", "generate", "build", "turn this into", "keszits", "készíts", "alakitsd", "alakítsd"],
    )
    if not is_block_intent:
        return None

    if mode == "learn":
        return "lesson"
    if mode == "creative":
        return "brief"
    return "task_list"


def _mode_actions(mode: str, locale: str) -> List[SuggestedAction]:
    if mode == "learn":
        if locale == "hu":
            return [
                SuggestedAction(label="Magyarazd el egyszeruen", action="Magyarazd el egyszeruen ezt a temat."),
                SuggestedAction(label="Keszits lecket", action="Keszits lesson blokkot ebbol."),
                SuggestedAction(label="Quiz me", action="Keszits 3 kerdeses quiz blokkot."),
                SuggestedAction(label="Keszits flashcardokat", action="Keszits flashcard blokkot ebbol."),
                SuggestedAction(label="Keszits timeline osszegzest", action="Keszits timeline jellegu summary blokkot errol."),
            ]
        return [
            SuggestedAction(label="Explain simply", action="Explain this topic simply."),
            SuggestedAction(label="Create lesson", action="Create a lesson block from this."),
            SuggestedAction(label="Quiz me", action="Create a 3-question quiz block."),
            SuggestedAction(label="Make flashcards", action="Create a flashcard block from this."),
            SuggestedAction(label="Create timeline summary", action="Create a timeline-style summary block for this topic."),
        ]

    if mode == "creative":
        if locale == "hu":
            return [
                SuggestedAction(label="Keszits briefet", action="Keszits brief blokkot ebbol."),
                SuggestedAction(label="Generalj kreativ iranyokat", action="Generalj 3 kreativ iranyt ehhez."),
                SuggestedAction(label="Keszits moodboardot", action="Keszits moodboard blokkot ehhez."),
                SuggestedAction(label="Indits storyboardot", action="Keszits storyboard blokkot ehhez."),
                SuggestedAction(label="Adj kep promptot", action="Keszits image_generation blokkot prompttal."),
            ]
        return [
            SuggestedAction(label="Create brief", action="Create a brief block from this."),
            SuggestedAction(label="Generate directions", action="Generate three creative directions."),
            SuggestedAction(label="Create moodboard", action="Create a moodboard block for this concept."),
            SuggestedAction(label="Start storyboard", action="Create a storyboard block for this concept."),
            SuggestedAction(label="Add image prompt", action="Create an image generation block with prompt."),
        ]

    if locale == "hu":
        return [
            SuggestedAction(label="Finomitsd a celt", action="Keszits goal blokkot ebbol, konkret sikerkriteriumokkal."),
            SuggestedAction(label="Bontsd lepesekre", action="Bontsd ezt vegrehajthato task_list blokkra."),
            SuggestedAction(label="Keszits roadmapet", action="Keszits roadmap blokkot 3 fazissal."),
            SuggestedAction(label="Kritikald a tervet", action="Keszits critique blokkot a fo kockazatokrol."),
            SuggestedAction(label="Rendezd boardba", action="Rendezd ezt strukturalt build boardda."),
        ]
    return [
        SuggestedAction(label="Refine goal", action="Create a goal block from this with measurable criteria."),
        SuggestedAction(label="Break into steps", action="Break this into an executable task_list block."),
        SuggestedAction(label="Create roadmap", action="Create a roadmap block with 3 phases."),
        SuggestedAction(label="Critique plan", action="Create a critique block with risks and improvements."),
        SuggestedAction(label="Organize blocks", action="Organize this into a structured build board."),
    ]


def _board_sections_for_mode(mode: str, locale: str) -> list[dict]:
    if mode == "learn":
        return [
            {
                "key": "overview",
                "title": "Attekintes" if locale == "hu" else "Overview",
                "subtitle": "Tema es kontextus" if locale == "hu" else "Topic scope and context",
                "default_type": "lesson",
                "color_theme": "violet",
            },
            {
                "key": "concepts",
                "title": "Kulcsfogalmak" if locale == "hu" else "Key Concepts",
                "subtitle": "Lenyegi fogalmak" if locale == "hu" else "Distilled concepts",
                "default_type": "summary",
                "color_theme": "sky",
            },
            {
                "key": "practice",
                "title": "Gyakorlas" if locale == "hu" else "Practice",
                "subtitle": "Kviz es visszahivas" if locale == "hu" else "Quiz and recall",
                "default_type": "quiz",
                "color_theme": "olive",
            },
            {
                "key": "sources",
                "title": "Forrasok" if locale == "hu" else "Sources",
                "subtitle": "Forrasanyagok" if locale == "hu" else "Source material",
                "default_type": "source",
                "color_theme": "rose",
            },
        ]

    if mode == "creative":
        return [
            {
                "key": "brief",
                "title": "Brief",
                "subtitle": "Cel es celcsoport" if locale == "hu" else "Objective and audience",
                "default_type": "brief",
                "color_theme": "violet",
            },
            {
                "key": "directions",
                "title": "Iranyok" if locale == "hu" else "Directions",
                "subtitle": "Koncepcios iranyok" if locale == "hu" else "Concept directions",
                "default_type": "copy",
                "color_theme": "olive",
            },
            {
                "key": "storyboard",
                "title": "Storyboard",
                "subtitle": "Jelenetstruktura" if locale == "hu" else "Scene structure",
                "default_type": "storyboard",
                "color_theme": "sky",
            },
            {
                "key": "media",
                "title": "Media" if locale == "en" else "Media",
                "subtitle": "Kep- es video promptok" if locale == "hu" else "Image and video prompts",
                "default_type": "image_generation",
                "color_theme": "rose",
            },
        ]

    return [
        {
            "key": "goal",
            "title": "Cel" if locale == "hu" else "Goal",
            "subtitle": "Eredmenydefinicio" if locale == "hu" else "Outcome definition",
            "default_type": "goal",
            "color_theme": "violet",
        },
        {
            "key": "plan",
            "title": "Terv" if locale == "hu" else "Plan",
            "subtitle": "Feladatok es merfoldkovek" if locale == "hu" else "Tasks and milestones",
            "default_type": "task_list",
            "color_theme": "olive",
        },
        {
            "key": "execution",
            "title": "Vegrehajtas" if locale == "hu" else "Execution",
            "subtitle": "Roadmap es haladas" if locale == "hu" else "Roadmap and progress",
            "default_type": "roadmap",
            "color_theme": "sky",
        },
        {
            "key": "review",
            "title": "Review",
            "subtitle": "Kritika es dontesek" if locale == "hu" else "Critique and decisions",
            "default_type": "critique",
            "color_theme": "rose",
        },
    ]


def _build_board_sections(mode: str, locale: str) -> list[MentorGeneratedBlock]:
    sections = _board_sections_for_mode(mode, locale)
    return [
        MentorGeneratedBlock(
            block_type="board_section",
            title=str(item["title"]),
            reason=(
                "Mentor altal elokeszitett board szekcio."
                if locale == "hu"
                else "Mentor-prepared board section."
            ),
            content_json={
                "key": item["key"],
                "subtitle": item["subtitle"],
                "color_theme": item["color_theme"],
                "default_type": item["default_type"],
            },
        )
        for item in sections
    ]


def _build_generated_block(req: MentorChatRequest, selected_blocks: List[dict], mode: str) -> Optional[MentorGeneratedBlock]:
    block_type = _infer_requested_block_type(req.message, mode)
    if not block_type:
        return None

    locale = req.locale
    seed = _selected_preview(selected_blocks) or req.message.strip()

    if block_type == "lesson":
        return MentorGeneratedBlock(
            block_type="lesson",
            title="Gyors lecke" if locale == "hu" else "Quick Lesson",
            reason="Mentor-generated learning block.",
            content_json={
                "section": "ideas",
                "topic": req.message.strip(),
                "explanation": seed[:220],
                "key_points": ["Core concept", "Why this matters", "Common pitfall"]
                if locale == "en"
                else ["Alapfogalom", "Miert fontos", "Tipikus hiba"],
            },
        )

    if block_type == "quiz":
        return MentorGeneratedBlock(
            block_type="quiz",
            title="Gyakorlo kviz" if locale == "hu" else "Practice Quiz",
            reason="Mentor-generated quiz block.",
            content_json={
                "section": "plan",
                "questions": [
                    {
                        "id": str(uuid.uuid4()),
                        "question": f"{'Mi a fo cel?' if locale == 'hu' else 'What is the primary goal?'} ({seed[:50]})",
                        "options": ["A", "B", "C"],
                        "correct_index": 0,
                        "explanation": "Choose the most grounded option.",
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "question": "What should happen next?" if locale == "en" else "Mi legyen a kovetkezo lepes?",
                        "options": ["Define scope", "Wait", "Restart"],
                        "correct_index": 0,
                        "explanation": "Execution starts from clear scope.",
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "question": "How to validate?" if locale == "en" else "Hogyan validalod?",
                        "options": ["Metric", "Guess", "No check"],
                        "correct_index": 0,
                        "explanation": "Use a measurable indicator.",
                    },
                ],
            },
        )

    if block_type == "flashcard":
        return MentorGeneratedBlock(
            block_type="flashcard",
            title="Flashcard set",
            reason="Mentor-generated recall cards.",
            content_json={
                "section": "plan",
                "cards": [
                    {"id": str(uuid.uuid4()), "front": "Concept", "back": seed[:110]},
                    {"id": str(uuid.uuid4()), "front": "Why it matters", "back": "It supports clearer decisions."},
                    {"id": str(uuid.uuid4()), "front": "Common mistake", "back": "Working without explicit criteria."},
                ],
            },
        )

    if block_type == "source":
        return MentorGeneratedBlock(
            block_type="source",
            title="Study Source" if locale == "en" else "Tanulasi forras",
            reason="Mentor-generated source context block.",
            content_json={
                "section": "sources",
                "name": "Source",
                "excerpt": seed[:320],
                "source_type": "text",
            },
        )

    if block_type == "summary":
        normalized = (req.message or "").lower()
        timeline_requested = _contains_any(normalized, ["timeline", "chronology", "idovonal"])
        comparison_requested = _contains_any(normalized, ["comparison", "compare", "osszehasonlitas"])
        return MentorGeneratedBlock(
            block_type="summary",
            title=(
                "Timeline Summary"
                if timeline_requested and locale == "en"
                else "Idovonal osszegzes"
                if timeline_requested
                else "Comparison Summary"
                if comparison_requested and locale == "en"
                else "Osszehasonlito osszegzes"
                if comparison_requested
                else "Mentor Summary"
            ),
            reason="Mentor-generated summary block.",
            content_json={
                "section": "sources",
                "text": seed[:320],
                "key_points": (
                    ["T1: Context", "T2: Turning point", "T3: Result"]
                    if timeline_requested and locale == "en"
                    else ["1. pont: kontextus", "2. pont: fordulopont", "3. pont: eredmeny"]
                    if timeline_requested
                    else ["Dimension A", "Dimension B", "Dimension C"]
                    if comparison_requested and locale == "en"
                    else ["A dimenzio", "B dimenzio", "C dimenzio"]
                    if comparison_requested
                    else ["Main claim", "Critical risk", "Next step"]
                    if locale == "en"
                    else ["Fo allitas", "Kritikus kockazat", "Kovetkezo lepes"]
                ),
                "summary_kind": "timeline" if timeline_requested else "comparison" if comparison_requested else "summary",
            },
        )

    if block_type == "moodboard":
        return MentorGeneratedBlock(
            block_type="moodboard",
            title="Moodboard",
            reason="Mentor-generated moodboard block.",
            content_json={
                "section": "output",
                "title": "Moodboard",
                "direction": seed[:220],
                "items": [],
            },
        )

    if block_type == "reference_board":
        return MentorGeneratedBlock(
            block_type="reference_board",
            title="Reference Board",
            reason="Mentor-generated reference board block.",
            content_json={
                "section": "sources",
                "board_title": "Reference Board",
                "objective": seed[:220],
                "references": [],
                "connector_targets": ["Pinterest", "YouTube", "Instagram", "Canva", "Calendar"],
            },
        )

    if block_type == "gif":
        return MentorGeneratedBlock(
            block_type="gif",
            title="GIF Tone Marker",
            reason="Mentor-generated GIF block.",
            content_json={
                "section": "output",
                "url": "",
                "purpose": seed[:180],
                "placement_note": "",
            },
        )

    if block_type == "sticker":
        return MentorGeneratedBlock(
            block_type="sticker",
            title="Sticker Marker",
            reason="Mentor-generated sticker block.",
            content_json={
                "section": "output",
                "emoji": "*",
                "label": "Signal",
                "meaning": seed[:160],
                "action_signal": "",
            },
        )

    if block_type == "link":
        return MentorGeneratedBlock(
            block_type="link",
            title="Resource Link",
            reason="Mentor-generated link block.",
            content_json={
                "section": "sources",
                "title": "Resource Link",
                "url": "",
                "summary": seed[:220],
                "usage_note": "",
            },
        )

    if block_type == "pdf_reference":
        return MentorGeneratedBlock(
            block_type="pdf_reference",
            title="PDF Reference",
            reason="Mentor-generated PDF reference block.",
            content_json={
                "section": "sources",
                "title": "PDF Reference",
                "url": "",
                "pages": "",
                "excerpt": seed[:220],
                "why_it_matters": "",
            },
        )

    if block_type == "goal":
        return MentorGeneratedBlock(
            block_type="goal",
            title="Working Goal",
            reason="Mentor-generated goal block.",
            content_json={
                "section": "ideas",
                "goal": seed[:160],
                "success_criteria": ["Measurable outcome", "Deadline", "Owner"]
                if locale == "en"
                else ["Merheto eredmeny", "Hatarido", "Tulajdonos"],
            },
        )

    if block_type == "task_list":
        return MentorGeneratedBlock(
            block_type="task_list",
            title="Mentor Task List",
            reason="Mentor-generated execution steps.",
            content_json={
                "section": "plan",
                "tasks": [
                    {"id": str(uuid.uuid4()), "text": "Define scope", "done": False},
                    {"id": str(uuid.uuid4()), "text": "Break into 3 steps", "done": False},
                    {"id": str(uuid.uuid4()), "text": "Run mentor critique", "done": False},
                ],
            },
        )

    if block_type == "roadmap":
        return MentorGeneratedBlock(
            block_type="roadmap",
            title="Roadmap Outline",
            reason="Mentor-generated phase plan.",
            content_json={
                "section": "plan",
                "phases": [
                    {"id": str(uuid.uuid4()), "title": "Phase 1", "outcome": "Clarify objective"},
                    {"id": str(uuid.uuid4()), "title": "Phase 2", "outcome": "Execute tasks"},
                    {"id": str(uuid.uuid4()), "title": "Phase 3", "outcome": "Validate results"},
                ],
            },
        )

    if block_type == "critique":
        return MentorGeneratedBlock(
            block_type="critique",
            title="Mentor Critique",
            reason="Mentor-generated critique block.",
            content_json={
                "section": "output",
                "strengths": ["Clear direction"],
                "risks": ["Success criteria still vague"],
                "improvements": ["Define acceptance criteria", "Add timeline constraints"],
            },
        )

    if block_type == "storyboard":
        return MentorGeneratedBlock(
            block_type="storyboard",
            title="Storyboard Draft",
            reason="Mentor-generated storyboard block.",
            content_json={
                "section": "output",
                "scenes": [
                    {"scene_title": "Opening", "camera_direction": "Push-in", "voiceover": seed[:120]},
                    {"scene_title": "Conflict", "camera_direction": "Handheld", "voiceover": "Show the primary tension."},
                    {"scene_title": "Resolution", "camera_direction": "Wide", "voiceover": "Close with a clear promise."},
                ],
            },
        )

    if block_type == "image_generation":
        return MentorGeneratedBlock(
            block_type="image_generation",
            title="Media Generation",
            reason="Prepared generation block (no provider run yet).",
            content_json={
                "section": "output",
                "prompt": req.message.strip(),
                "reference_input": "",
                "generation_modes": ["text-to-image", "image-to-image", "text-to-video", "image-to-video"],
                "selected_mode": "text-to-image",
                "status": "Prepared, execution is not wired yet.",
                "output_preview_url": "",
            },
        )

    if block_type == "copy":
        return MentorGeneratedBlock(
            block_type="copy",
            title="Copy Block",
            reason="Mentor-generated copy draft.",
            content_json={
                "section": "output",
                "channel": "Campaign",
                "text": seed[:220],
                "variations": ["Direct", "Emotional", "CTA-focused"],
            },
        )

    if block_type == "brief":
        return MentorGeneratedBlock(
            block_type="brief",
            title="Creative Brief",
            reason="Mentor-generated brief block.",
            content_json={
                "section": "ideas",
                "objective": req.message.strip(),
                "audience": "Primary audience",
                "tone": "Clear, premium, focused",
                "key_messages": ["Clear promise", "Concrete benefit", "Strong CTA"],
            },
        )

    return None


def _build_generated_blocks(req: MentorChatRequest, selected_blocks: List[dict], mode: str) -> list[MentorGeneratedBlock]:
    if _is_board_request(req.message):
        return _build_board_sections(mode, req.locale)

    generated_block = _build_generated_block(req, selected_blocks, mode)
    if generated_block:
        return [generated_block]
    return []


def chat(req: MentorChatRequest, user_id: str) -> MentorChatResponse:
    context = _get_workspace_context(req.workspace_id, user_id)
    if not context:
        raise ValueError("Workspace not found")

    title, workspace_mode = context
    mode = req.mode if req.mode in ("build", "learn", "creative") else workspace_mode
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

    generated_blocks = _build_generated_blocks(req, selected_blocks, mode)
    raw_actions = parse_suggested_actions(text)
    suggested = [SuggestedAction(label=item["label"], action=item["action"]) for item in raw_actions]
    for mode_action in _mode_actions(mode, req.locale):
        if len(suggested) >= 5:
            break
        if all(item.label != mode_action.label for item in suggested):
            suggested.append(mode_action)

    return MentorChatResponse(
        text=text,
        suggested_actions=suggested,
        generated_blocks=generated_blocks,
        tool_results=[],
        language=req.locale,
    )
