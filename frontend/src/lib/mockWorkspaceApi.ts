import type { CanvasBlock, CanvasBlockCreate, CanvasBlockPatch } from "@/types/canvas";
import type {
  DocumentSummarizeRequest,
  DocumentSummaryBundle,
  DocumentUploadRequest,
  SourceDocument,
} from "@/types/document";
import type { MentorChatRequest, MentorChatResponse } from "@/types/mentor";
import type { Workspace, WorkspaceCreate } from "@/types/workspace";

const STORAGE_KEY = "pumi_v2_mock_store";

interface MockStore {
  workspaces: Workspace[];
  blocks: CanvasBlock[];
  documents: SourceDocument[];
}

const EMPTY_STORE: MockStore = {
  workspaces: [],
  blocks: [],
  documents: [],
};

const BLOCK_TITLE_BY_TYPE: Record<CanvasBlock["type"], string> = {
  note: "Note",
  task_list: "Task list",
  source: "Source",
  summary: "Summary",
  idea: "Idea",
  ai_sticky: "AI Insight",
  creative_brief: "Creative brief",
  image_asset: "Image asset",
  storyboard: "Storyboard",
};

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(): string {
  return crypto.randomUUID();
}

function readStore(): MockStore {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return EMPTY_STORE;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<MockStore>;
    return {
      workspaces: Array.isArray(parsed.workspaces) ? parsed.workspaces : [],
      blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
      documents: Array.isArray(parsed.documents) ? parsed.documents : [],
    };
  } catch {
    return EMPTY_STORE;
  }
}

function writeStore(store: MockStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function inferMockUserId(): string {
  const authRaw = localStorage.getItem("pumi_mock_user_id");
  if (authRaw) {
    return authRaw;
  }

  const fallback = "local-user";
  localStorage.setItem("pumi_mock_user_id", fallback);
  return fallback;
}

function nextBlockPosition(store: MockStore, workspaceId: string): number {
  const positions = store.blocks
    .filter((block) => block.workspace_id === workspaceId)
    .map((block) => block.position);
  return positions.length === 0 ? 0 : Math.max(...positions) + 1;
}

function splitSentences(content: string): string[] {
  const normalized = (content || "").replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  return normalized.split(/(?<=[.!?])\s+/).filter((item) => item.trim().length > 0);
}

function fallbackSummary(content: string, locale: "en" | "hu"): {
  summary: string;
  keyPoints: string[];
  suggestedNextActions: string[];
} {
  const sentences = splitSentences(content);
  const summary = sentences.slice(0, 4).join(" ") || content.slice(0, 600);
  const keyPoints = (sentences.length > 0 ? sentences : [summary]).slice(0, 7);
  while (keyPoints.length < 3) {
    keyPoints.push(
      locale === "hu"
        ? "Tovabbi kontextus segithet a melyebb bontasban."
        : "More context can help produce deeper structured points.",
    );
  }

  const suggestedNextActions = locale === "hu"
    ? [
        "Kerd a mentortol a kovetkezo lepest erre a forrasra.",
        "Alakitsd at a key pointokat feladatlistava.",
        "Emeld ki, melyik allitas a legerosebb es melyik bizonytalan.",
      ]
    : [
        "Ask the mentor for the best next step from this source.",
        "Convert key points into a concrete task list.",
        "Identify which claims are strongest and which need validation.",
      ];

  return {
    summary,
    keyPoints,
    suggestedNextActions,
  };
}

function createDocumentSummaryBundle(
  store: MockStore,
  input: {
    workspaceId: string;
    name: string;
    sourceType: string;
    contentText: string;
    locale: "en" | "hu";
    existingDocumentId?: string;
  },
): DocumentSummaryBundle {
  const { summary, keyPoints, suggestedNextActions } = fallbackSummary(input.contentText, input.locale);

  const timestamp = nowIso();
  const documentId = input.existingDocumentId ?? makeId();

  const existingDocumentIndex = store.documents.findIndex((doc) => doc.id === documentId);
  const document: SourceDocument = {
    id: documentId,
    workspace_id: input.workspaceId,
    name: input.name,
    source_type: input.sourceType,
    content_text: input.contentText,
    summary,
    created_at: existingDocumentIndex >= 0 ? store.documents[existingDocumentIndex].created_at : timestamp,
  };

  if (existingDocumentIndex >= 0) {
    store.documents[existingDocumentIndex] = document;
  } else {
    store.documents.push(document);
  }

  const basePosition = nextBlockPosition(store, input.workspaceId);

  const sourceBlock: CanvasBlock = {
    id: makeId(),
    workspace_id: input.workspaceId,
    type: "source",
    title: input.name,
    content_json: {
      document_id: document.id,
      name: input.name,
      source_type: input.sourceType,
      excerpt: input.contentText.slice(0, 600),
      summary_preview: summary.slice(0, 260),
      key_points: keyPoints,
      word_count: input.contentText.split(/\s+/).filter(Boolean).length,
      char_count: input.contentText.length,
    },
    position: basePosition,
    created_at: timestamp,
    updated_at: timestamp,
  };

  const summaryBlock: CanvasBlock = {
    id: makeId(),
    workspace_id: input.workspaceId,
    type: "summary",
    title: input.locale === "hu" ? `Osszefoglalo - ${input.name}` : `Summary - ${input.name}`,
    content_json: {
      document_id: document.id,
      source_name: input.name,
      text: summary,
      key_points: keyPoints,
      suggested_next_actions: suggestedNextActions,
    },
    position: basePosition + 1,
    created_at: timestamp,
    updated_at: timestamp,
  };

  store.blocks.push(sourceBlock, summaryBlock);

  return {
    document,
    source_block: sourceBlock,
    summary_block: summaryBlock,
    key_points: keyPoints,
    suggested_next_actions: suggestedNextActions,
  };
}

export const mockWorkspaceApi = {
  createWorkspace(data: WorkspaceCreate): Workspace {
    const store = readStore();
    const timestamp = nowIso();

    const workspace: Workspace = {
      id: makeId(),
      user_id: inferMockUserId(),
      title: data.title,
      description: data.description,
      mode: data.mode ?? "build",
      created_at: timestamp,
      updated_at: timestamp,
    };

    store.workspaces = [workspace, ...store.workspaces];
    writeStore(store);
    return workspace;
  },

  listWorkspaces(): Workspace[] {
    const store = readStore();
    return [...store.workspaces].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  },

  getWorkspace(workspaceId: string): Workspace {
    const store = readStore();
    const workspace = store.workspaces.find((item) => item.id === workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }
    return workspace;
  },
};

export const mockCanvasApi = {
  createBlock(data: CanvasBlockCreate): CanvasBlock {
    const store = readStore();
    const timestamp = nowIso();

    const block: CanvasBlock = {
      id: makeId(),
      workspace_id: data.workspace_id,
      type: data.type,
      title: data.title ?? BLOCK_TITLE_BY_TYPE[data.type],
      content_json: data.content_json ?? {},
      position: data.position ?? nextBlockPosition(store, data.workspace_id),
      created_at: timestamp,
      updated_at: timestamp,
    };

    store.blocks.push(block);

    const workspaceIndex = store.workspaces.findIndex((ws) => ws.id === data.workspace_id);
    if (workspaceIndex >= 0) {
      store.workspaces[workspaceIndex] = {
        ...store.workspaces[workspaceIndex],
        updated_at: timestamp,
      };
    }

    writeStore(store);
    return block;
  },

  patchBlock(blockId: string, data: CanvasBlockPatch): CanvasBlock {
    const store = readStore();
    const index = store.blocks.findIndex((item) => item.id === blockId);
    if (index < 0) {
      throw new Error("Block not found");
    }

    const previous = store.blocks[index];
    const updated: CanvasBlock = {
      ...previous,
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.content_json !== undefined ? { content_json: data.content_json } : {}),
      ...(data.position !== undefined ? { position: data.position } : {}),
      updated_at: nowIso(),
    };

    store.blocks[index] = updated;
    writeStore(store);
    return updated;
  },

  deleteBlock(blockId: string): { ok: boolean } {
    const store = readStore();
    const before = store.blocks.length;
    store.blocks = store.blocks.filter((item) => item.id !== blockId);
    writeStore(store);

    return { ok: store.blocks.length !== before };
  },

  listBlocks(workspaceId: string): CanvasBlock[] {
    const store = readStore();
    return store.blocks
      .filter((item) => item.workspace_id === workspaceId)
      .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
  },
};

export const mockDocumentApi = {
  uploadDocument(input: DocumentUploadRequest): DocumentSummaryBundle {
    const store = readStore();
    const bundle = createDocumentSummaryBundle(store, {
      workspaceId: input.workspace_id,
      name: input.name,
      sourceType: input.source_type ?? "text",
      contentText: input.content_text,
      locale: input.locale ?? "en",
    });
    writeStore(store);
    return bundle;
  },

  summarizeDocument(req: DocumentSummarizeRequest): DocumentSummaryBundle {
    const store = readStore();

    if (req.document_id) {
      const document = store.documents.find((item) => item.id === req.document_id);
      if (!document) {
        throw new Error("Document not found");
      }

      const bundle = createDocumentSummaryBundle(store, {
        workspaceId: document.workspace_id,
        name: document.name,
        sourceType: document.source_type,
        contentText: document.content_text ?? req.content_text ?? "",
        locale: req.locale ?? "en",
        existingDocumentId: document.id,
      });
      writeStore(store);
      return bundle;
    }

    if (!req.workspace_id || !req.content_text) {
      throw new Error("workspace_id and content_text are required");
    }

    const bundle = createDocumentSummaryBundle(store, {
      workspaceId: req.workspace_id,
      name: req.name ?? "Untitled Source",
      sourceType: req.source_type ?? "text",
      contentText: req.content_text,
      locale: req.locale ?? "en",
    });
    writeStore(store);
    return bundle;
  },
};

export const mockMentorApi = {
  chat(req: MentorChatRequest): MentorChatResponse {
    const store = readStore();
    const blocks = store.blocks.filter((item) => item.workspace_id === req.workspace_id);
    const selected = blocks.filter((item) => req.selected_block_ids.includes(item.id));

    const sourceSummaries = blocks
      .filter((item) => item.type === "summary")
      .slice(-2)
      .map((item) => {
        const content = item.content_json as { source_name?: string; text?: string } | undefined;
        if (!content?.text) return null;
        return `${content.source_name ?? "Source"}: ${content.text.slice(0, 140)}`;
      })
      .filter(Boolean) as string[];

    const sourceHint = sourceSummaries.length > 0
      ? req.locale === "hu"
        ? ` Forras kontextus: ${sourceSummaries.join(" | ")}`
        : ` Source context: ${sourceSummaries.join(" | ")}`
      : "";

    const baseText = req.locale === "hu"
      ? selected.length > 0
        ? `Megneztem a kijelolt ${selected.length} blokkot.${sourceHint}`
        : `Latom a munkatered.${sourceHint}`
      : selected.length > 0
        ? `I reviewed ${selected.length} selected block(s).${sourceHint}`
        : `I can see your workspace.${sourceHint}`;

    return {
      text: `${baseText} ${req.locale === "hu" ? "Mondd, mi legyen a kovetkezo lepes." : "Tell me the next step you want."}`,
      suggested_actions: [
        {
          label: req.locale === "hu" ? "Feladatlista a forrasbol" : "Task list from source",
          action: "build_tasks_from_source",
        },
        {
          label: req.locale === "hu" ? "Ellenerv kerese" : "Challenge assumptions",
          action: "challenge_source",
        },
      ],
      tool_results: [],
      language: req.locale,
    };
  },
};

