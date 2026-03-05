// src/lib/tutorApi.ts
// AI Tutor client — PUMi v2 AI Learning Workspace
//
// The tutor reads the workspace snapshot and can emit canvas tool calls
// (create_block, update_block, delete_block) as part of its response.
// Updated/created blocks are returned so the UI can apply them immediately
// without a separate canvas fetch.

import { pumiInvoke } from "./pumiInvoke";
import type { CanvasBlock } from "./canvasApi";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single canvas tool call executed by the tutor during this turn. */
export interface TutorToolCall {
  name: "create_block" | "update_block" | "delete_block" | "list_blocks";
  input: Record<string, unknown>;
  result: Record<string, unknown>;
}

/** One message in the conversation history (for multi-turn context). */
export interface TutorHistoryItem {
  role: "user" | "assistant";
  content: string;
}

// ---------------------------------------------------------------------------
// Request payload
// ---------------------------------------------------------------------------

export interface TutorMessagePayload {
  workspace_id: string;
  message: string;
  /** "hu" | "en" — controls tutor response language. Defaults to "hu". */
  locale?: string;
  /**
   * Block IDs the user has selected in the UI.
   * Prepended to the message so the tutor knows which blocks are in focus.
   */
  selected_block_ids?: string[];
  /**
   * "freeform" — open conversation (default).
   * "session"  — structured learning session (reserved for future use).
   */
  mode?: "freeform" | "session";
  /** Prior conversation turns (last N kept by the backend). */
  history?: TutorHistoryItem[];
}

// ---------------------------------------------------------------------------
// Response shape
// ---------------------------------------------------------------------------

export interface TutorMessageResp {
  ok: boolean;
  /** Tutor's text reply to display in the chat. */
  text: string;
  /** Tool calls the tutor made this turn (informational, for debug/UI). */
  tool_calls: TutorToolCall[];
  /**
   * Blocks that were created or updated this turn.
   * Apply these to local state directly — no need to re-fetch canvas.
   */
  updated_blocks: CanvasBlock[];
  /** Reserved for future session mode. Always null in freeform mode. */
  session: null | Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

export const tutorApi = {
  /**
   * Send a user message to the AI tutor.
   *
   * The tutor sees the workspace snapshot and may create/update canvas blocks.
   * Returns the text reply and any updated blocks to merge into local state.
   */
  sendMessage: (payload: TutorMessagePayload) =>
    pumiInvoke<TutorMessageResp>("/tutor/message", payload),
};
