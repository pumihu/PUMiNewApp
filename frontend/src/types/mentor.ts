import type { BlockType } from "@/types/canvas";

export type Locale = "en" | "hu";
export type WorkspaceMode = "build" | "learn" | "creative";

export interface MentorChatRequest {
  workspace_id: string;
  message: string;
  locale: Locale;
  selected_block_ids: string[];
  mode: WorkspaceMode;
}

export interface SuggestedAction {
  label: string;
  action: string;
  payload?: Record<string, unknown>;
}

export interface MentorGeneratedBlock {
  block_type: BlockType;
  title?: string;
  content_json?: Record<string, unknown>;
  reason?: string;
}

export interface MentorChatResponse {
  text: string;
  suggested_actions: SuggestedAction[];
  generated_blocks?: MentorGeneratedBlock[];
  tool_results: unknown[];
  language: string;
}

export interface MentorMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
  suggested_actions?: SuggestedAction[];
  generated_blocks?: MentorGeneratedBlock[];
}

export const MENTOR_MESSAGE_DND_MIME = "application/x-pumi-mentor-message";

export interface MentorCanvasCapturePayload {
  source_message_id: string;
  text: string;
  action_type: "pin" | "drag";
  target_section_key?: string;
  target_layout?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  generated_block?: MentorGeneratedBlock;
}
