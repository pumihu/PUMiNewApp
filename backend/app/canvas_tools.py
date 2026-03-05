"""
Canvas Tool Definitions — Anthropic tool_use spec for the PUMi Tutor.

The tutor uses these tools to create, update, and delete canvas blocks
on the user's learning workspace. Schemas mirror the StrictFocusItem
contract in frontend/src/types/focusItem.ts so frontend renderers work
without extra transformation.

Imported by tutor_api.py and passed directly to claude.messages.create(tools=...).
"""
from __future__ import annotations

CANVAS_TOOLS = [
    {
        "name": "create_block",
        "description": (
            "Create a new learning content block on the workspace canvas. "
            "Use this to add a quiz, lesson, translation exercise, flashcards, "
            "roleplay scenario, checklist, or writing task for the user to work on. "
            "Prefer creating blocks over writing exercises inline in chat."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "type": {
                    "type": "string",
                    "enum": [
                        "lesson",
                        "quiz",
                        "translation",
                        "cards",
                        "roleplay",
                        "writing",
                        "checklist",
                        "note",
                    ],
                    "description": (
                        "Block kind — must match a FocusItemKind from the frontend schema. "
                        "'note' is free-form markdown text; all others are interactive exercises."
                    ),
                },
                "title": {
                    "type": "string",
                    "description": "Short display title shown in the canvas block header (e.g. 'Greetings Quiz')",
                },
                "content": {
                    "type": "object",
                    "description": (
                        "Typed content object. Structure depends on 'type':\n"
                        "  quiz        → {questions:[{question,options:[str],correct_index:int,explanation?}]}\n"
                        "  translation → {sentences:[{source,target_lang,hint?}]}\n"
                        "  cards       → {cards:[{front,back}]}\n"
                        "  lesson      → {vocabulary_table:[{word,translation,example}],grammar_explanation,dialogues:[]}\n"
                        "  writing     → {prompt,example?,word_count_target?:int}\n"
                        "  roleplay    → {scenario,roles:{user,ai},starter_prompt,sample_exchanges:[]}\n"
                        "  checklist   → {steps:[{instruction,proof_prompt?}]}\n"
                        "  note        → {markdown: str}"
                    ),
                },
            },
            "required": ["type", "title", "content"],
        },
    },
    {
        "name": "update_block",
        "description": (
            "Update an existing canvas block. Provide the block_id and any fields to change. "
            "Content is replaced in full — include all existing fields plus changes."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "block_id": {
                    "type": "string",
                    "description": "ID of the block to update (shown in the workspace snapshot as [id_prefix])",
                },
                "title": {
                    "type": "string",
                    "description": "New title (optional)",
                },
                "content": {
                    "type": "object",
                    "description": "New content object (optional). Replaces the entire content field.",
                },
            },
            "required": ["block_id"],
        },
    },
    {
        "name": "delete_block",
        "description": "Permanently remove a block from the canvas. Use when the user asks to clear or delete an exercise.",
        "input_schema": {
            "type": "object",
            "properties": {
                "block_id": {
                    "type": "string",
                    "description": "ID of the block to delete",
                },
            },
            "required": ["block_id"],
        },
    },
    {
        "name": "list_blocks",
        "description": (
            "List all blocks currently on the canvas (read-only). "
            "Use this before creating to avoid duplicates, or to check what the user already has."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "workspace_id": {
                    "type": "string",
                    "description": "Workspace ID to list blocks from",
                },
            },
            "required": ["workspace_id"],
        },
    },
]
