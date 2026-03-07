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

export interface MentorChatResponse {
  text: string;
  suggested_actions: SuggestedAction[];
  tool_results: unknown[];
  language: string;
}

export interface MentorMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
  suggested_actions?: SuggestedAction[];
}
