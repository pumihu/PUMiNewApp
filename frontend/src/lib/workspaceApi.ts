// src/lib/workspaceApi.ts
// Workspace management — PUMi v2 AI Learning Workspace
//
// A workspace is the top-level container for a user's learning session.
// It owns canvas blocks (see canvasApi.ts) and is the context sent to the tutor.

import { pumiInvoke } from "./pumiInvoke";
import type { CanvasBlock } from "./canvasApi";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Workspace {
  id: string;
  user_id: string;
  title: string;
  /** Learning goal — injected into the tutor's system prompt. */
  goal: string;
  /** "hu" | "en" — controls tutor response language and TTS voice. */
  locale: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Request payloads
// ---------------------------------------------------------------------------

export interface CreateWorkspacePayload {
  title: string;
  goal?: string;
  locale?: "hu" | "en";
}

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

export interface CreateWorkspaceResp {
  ok: boolean;
  workspace: Workspace;
}

export interface GetWorkspaceResp {
  ok: boolean;
  workspace: Workspace;
  /** Canvas blocks ordered by order_index. */
  blocks: CanvasBlock[];
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

export const workspaceApi = {
  /**
   * Create a new AI Learning Workspace.
   * Returns workspace_id used for all subsequent canvas and tutor calls.
   */
  create: (payload: CreateWorkspacePayload) =>
    pumiInvoke<CreateWorkspaceResp>("/workspace/create", payload),

  /**
   * Fetch a workspace and all its canvas blocks.
   * Blocks are ordered by order_index ascending.
   */
  get: (workspaceId: string) =>
    pumiInvoke<GetWorkspaceResp>(`/workspace/${workspaceId}`, {}, "GET"),
};
