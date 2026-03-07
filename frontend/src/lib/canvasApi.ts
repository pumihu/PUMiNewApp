// src/lib/canvasApi.ts
// Canvas block CRUD — PUMi v2 AI Learning Workspace
//
// Canvas blocks conform to the StrictFocusItem schema (types/focusItem.ts).
// The frontend renderers (components/focus/renderers/) consume the `content`
// field directly, so blocks produced by the tutor are immediately renderable.

import { pumiInvoke } from "./pumiInvoke";
import type { FocusItemKind } from "@/types/focusItem";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** A single canvas block on the workspace. */
export interface CanvasBlock {
  id: string;
  workspace_id: string;
  /** Block kind — matches FocusItemKind or "note" for free-form markdown. */
  type: FocusItemKind | "note";
  title: string;
  /** Typed content — structure depends on `type`. See types/focusItem.ts. */
  content: Record<string, unknown>;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Request payloads
// ---------------------------------------------------------------------------

export interface CreateBlockPayload {
  workspace_id: string;
  type: FocusItemKind | "note";
  title: string;
  content?: Record<string, unknown>;
  order_index?: number;
}

export interface UpdateBlockPayload {
  title?: string;
  content?: Record<string, unknown>;
  order_index?: number;
}

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

export interface BlockResp {
  ok: boolean;
  block: CanvasBlock;
}

export interface DeleteBlockResp {
  ok: boolean;
  block_id: string;
}

export interface ListBlocksResp {
  ok: boolean;
  blocks: CanvasBlock[];
  count: number;
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

export const canvasApi = {
  /** Create a new canvas block in a workspace. */
  create: (payload: CreateBlockPayload) =>
    pumiInvoke<BlockResp>("/canvas/block", payload),

  /** Update a block's title, content, or order. */
  update: (blockId: string, payload: UpdateBlockPayload) =>
    pumiInvoke<BlockResp>(`/canvas/block/${blockId}`, payload, "PATCH"),

  /** Permanently delete a block. */
  delete: (blockId: string) =>
    pumiInvoke<DeleteBlockResp>(`/canvas/block/${blockId}`, {}, "DELETE"),

  /** List all blocks in a workspace (ordered by order_index). */
  list: (workspaceId: string) =>
    pumiInvoke<ListBlocksResp>(`/canvas/${workspaceId}`, {}, "GET"),
};

