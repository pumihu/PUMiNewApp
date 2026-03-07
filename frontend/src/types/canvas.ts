export type BlockType =
  | "note"
  | "task_list"
  | "source"
  | "summary"
  | "idea"
  | "creative_brief"
  | "image_asset"
  | "storyboard";

export interface CanvasBlock {
  id: string;
  workspace_id: string;
  type: BlockType;
  title?: string;
  content_json?: Record<string, unknown>;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CanvasBlockCreate {
  workspace_id: string;
  type: BlockType;
  title?: string;
  content_json?: Record<string, unknown>;
  position?: number;
}

export interface CanvasBlockPatch {
  title?: string;
  content_json?: Record<string, unknown>;
  position?: number;
}
