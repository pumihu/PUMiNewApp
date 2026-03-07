import type { CanvasBlock } from "@/types/canvas";

export type DocumentLocale = "en" | "hu";

export interface SourceDocument {
  id: string;
  workspace_id: string;
  name: string;
  source_type: string;
  content_text?: string | null;
  summary?: string | null;
  created_at: string;
}

export interface SourceBlockContent {
  document_id: string;
  name: string;
  source_type: string;
  excerpt?: string;
  summary_preview?: string;
  key_points?: string[];
  word_count?: number;
  char_count?: number;
}

export interface SummaryBlockContent {
  document_id: string;
  source_name?: string;
  text: string;
  key_points?: string[];
  suggested_next_actions?: string[];
}

export interface DocumentSummaryBundle {
  document: SourceDocument;
  source_block: CanvasBlock;
  summary_block: CanvasBlock;
  key_points: string[];
  suggested_next_actions: string[];
}

export interface DocumentUploadRequest {
  workspace_id: string;
  name: string;
  source_type?: string;
  content_text: string;
  locale?: DocumentLocale;
}

export interface DocumentSummarizeRequest {
  document_id?: string;
  workspace_id?: string;
  name?: string;
  source_type?: string;
  content_text?: string;
  locale?: DocumentLocale;
}
