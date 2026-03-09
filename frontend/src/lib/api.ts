// lib/api.ts - PUMi v2 API client
// Calls remote API through pumi-proxy and falls back to local mock state when needed.

import {
  mockCanvasApi,
  mockDocumentApi,
  mockMentorApi,
  mockWorkspaceApi,
} from "@/lib/mockWorkspaceApi";
import { pumiInvoke } from "@/lib/pumiInvoke";
import type { CanvasBlock, CanvasBlockCreate, CanvasBlockPatch } from "@/types/canvas";
import type {
  DocumentSummarizeRequest,
  DocumentSummaryBundle,
  DocumentUploadRequest,
} from "@/types/document";
import type {
  BriefRequest,
  CreativeBrief,
  StoryboardRequest,
  StoryboardScene,
  VisualDirection,
  VisualizeRequest,
} from "@/types/creative";
import type { MentorChatRequest, MentorChatResponse } from "@/types/mentor";
import type { Workspace, WorkspaceCreate, WorkspaceUpdate } from "@/types/workspace";

const FORCE_MOCK = import.meta.env.VITE_PUMI_FORCE_MOCK === "1";
const DEV_DIAGNOSTICS = import.meta.env.DEV;

async function withMockFallback<T>(
  label: string,
  remoteCall: () => Promise<T>,
  mockCall: () => T,
): Promise<T> {
  if (FORCE_MOCK) {
    if (DEV_DIAGNOSTICS) {
      console.info(`[api:${label}] using mock persistence (VITE_PUMI_FORCE_MOCK=1)`);
    }
    return mockCall();
  }

  try {
    const result = await remoteCall();
    if (DEV_DIAGNOSTICS) {
      console.info(`[api:${label}] remote persistence ok`);
    }
    return result;
  } catch (error) {
    console.warn(`[api:${label}] remote failed, switching to mock fallback`, error);
    if (DEV_DIAGNOSTICS) {
      console.info(`[api:${label}] fallback result comes from mock store`);
    }
    return mockCall();
  }
}

function unwrapWorkspace(payload: unknown): Workspace {
  if (payload && typeof payload === "object" && "workspace" in payload) {
    return (payload as { workspace: Workspace }).workspace;
  }
  return payload as Workspace;
}

function unwrapWorkspaceList(payload: unknown): Workspace[] {
  if (Array.isArray(payload)) {
    return payload as Workspace[];
  }

  if (payload && typeof payload === "object" && "workspaces" in payload) {
    return (payload as { workspaces: Workspace[] }).workspaces;
  }

  return [];
}

function unwrapBlock(payload: unknown): CanvasBlock {
  if (payload && typeof payload === "object" && "block" in payload) {
    return (payload as { block: CanvasBlock }).block;
  }
  return payload as CanvasBlock;
}

function unwrapBlockList(payload: unknown): CanvasBlock[] {
  if (Array.isArray(payload)) {
    return payload as CanvasBlock[];
  }

  if (payload && typeof payload === "object" && "blocks" in payload) {
    return (payload as { blocks: CanvasBlock[] }).blocks;
  }

  return [];
}

function unwrapMentor(payload: unknown, locale: "en" | "hu"): MentorChatResponse {
  if (payload && typeof payload === "object" && "text" in payload) {
    return payload as MentorChatResponse;
  }

  if (payload && typeof payload === "object" && "reply" in payload) {
    return {
      text: String((payload as { reply?: unknown }).reply ?? ""),
      suggested_actions: [],
      tool_results: [],
      language: locale,
    };
  }

  return {
    text: locale === "hu" ? "A mentor valasza ervenytelen." : "Mentor response was invalid.",
    suggested_actions: [],
    tool_results: [],
    language: locale,
  };
}

// ---- Workspace ----

export const createWorkspace = (data: WorkspaceCreate) =>
  withMockFallback(
    "createWorkspace",
    async () => unwrapWorkspace(await pumiInvoke<unknown>("/workspace/create", data)),
    () => mockWorkspaceApi.createWorkspace(data),
  );

export const listWorkspaces = () =>
  withMockFallback(
    "listWorkspaces",
    async () => unwrapWorkspaceList(await pumiInvoke<unknown>("/workspace/list", {}, "GET")),
    () => mockWorkspaceApi.listWorkspaces(),
  );

export const getWorkspace = (id: string) =>
  withMockFallback(
    "getWorkspace",
    async () => unwrapWorkspace(await pumiInvoke<unknown>(`/workspace/${id}`, {}, "GET")),
    () => mockWorkspaceApi.getWorkspace(id),
  );

export const updateWorkspace = (id: string, data: WorkspaceUpdate) =>
  withMockFallback(
    "updateWorkspace",
    async () => unwrapWorkspace(await pumiInvoke<unknown>(`/workspace/${id}/update`, data, "POST")),
    () => mockWorkspaceApi.updateWorkspace(id, data),
  );

// ---- Canvas ----

export const createBlock = (data: CanvasBlockCreate) =>
  withMockFallback(
    "createBlock",
    async () => unwrapBlock(await pumiInvoke<unknown>("/canvas/block", data)),
    () => mockCanvasApi.createBlock(data),
  );

export const patchBlock = (blockId: string, data: CanvasBlockPatch) =>
  withMockFallback(
    "patchBlock",
    async () => unwrapBlock(await pumiInvoke<unknown>(`/canvas/block/${blockId}`, data, "POST")),
    () => mockCanvasApi.patchBlock(blockId, data),
  );

export const deleteBlock = (blockId: string) =>
  withMockFallback(
    "deleteBlock",
    async () => pumiInvoke<{ ok: boolean }>(`/canvas/block/${blockId}/delete`, {}),
    () => mockCanvasApi.deleteBlock(blockId),
  );

export const listBlocks = (workspaceId: string) =>
  withMockFallback(
    "listBlocks",
    async () => unwrapBlockList(await pumiInvoke<unknown>(`/canvas/${workspaceId}`, {}, "GET")),
    () => mockCanvasApi.listBlocks(workspaceId),
  );

// ---- Mentor ----

export const mentorChat = (req: MentorChatRequest) =>
  withMockFallback(
    "mentorChat",
    async () => unwrapMentor(await pumiInvoke<unknown>("/mentor/chat", req), req.locale),
    () => mockMentorApi.chat(req),
  );

// ---- Documents ----

export const uploadDocument = (data: DocumentUploadRequest) =>
  withMockFallback(
    "uploadDocument",
    async () => pumiInvoke<DocumentSummaryBundle>("/documents/upload", data),
    () => mockDocumentApi.uploadDocument(data),
  );

export const summarizeDocument = (req: DocumentSummarizeRequest) =>
  withMockFallback(
    "summarizeDocument",
    async () => pumiInvoke<DocumentSummaryBundle>("/documents/summarize", req),
    () => mockDocumentApi.summarizeDocument(req),
  );

// ---- Creative ----

export const buildBrief = (req: BriefRequest) => pumiInvoke<CreativeBrief>("/creative/brief", req);

export const visualize = (req: VisualizeRequest) =>
  pumiInvoke<{ directions: VisualDirection[] }>("/creative/visualize", req);

export const buildStoryboard = (req: StoryboardRequest) =>
  pumiInvoke<{ scenes: StoryboardScene[] }>("/creative/storyboard", req);

// ---- TTS ----

export const ttsSpeak = (text: string, locale = "en") =>
  pumiInvoke<{ audio_base64: string; content_type: string }>("/tts/speak", { text, locale });
