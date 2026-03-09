export type BlockType =
  | "note"
  | "task_list"
  | "link"
  | "source"
  | "pdf_reference"
  | "summary"
  | "idea"
  | "ai_sticky"
  | "creative_brief"
  | "image_asset"
  | "image"
  | "gif"
  | "sticker"
  | "moodboard"
  | "reference_board"
  | "storyboard"
  | "lesson"
  | "quiz"
  | "flashcard"
  | "goal"
  | "roadmap"
  | "critique"
  | "brief"
  | "image_generation"
  | "copy"
  | "board_section";

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
