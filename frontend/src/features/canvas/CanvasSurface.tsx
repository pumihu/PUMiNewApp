import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ErrorInfo,
  type ReactNode,
} from "react";
import {
  BookOpen,
  ClipboardList,
  FilePlus2,
  ImagePlus,
  LayoutTemplate,
  Library,
  Plus,
  Sparkles,
  StickyNote,
} from "lucide-react";
import {
  Tldraw,
  createShapeId,
  type Editor,
  type TLCreateShapePartial,
  type TLShape,
} from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";

import { UploadSourceDialog } from "@/features/documents/UploadSourceDialog";
import { useTranslation } from "@/hooks/useTranslation";
import { createBlock, patchBlock } from "@/lib/api";
import type { BlockType, CanvasBlock } from "@/types/canvas";
import type { DocumentSummaryBundle } from "@/types/document";
import {
  MENTOR_MESSAGE_DND_MIME,
  type MentorCanvasCapturePayload,
  type MentorGeneratedBlock,
} from "@/types/mentor";
import type { Workspace } from "@/types/workspace";
import { pumiShapeUtils } from "./tldrawPumiShapeUtils";

interface CanvasLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEV_DIAGNOSTICS = import.meta.env.DEV;
const TLDRAW_LICENSE_KEY = String(import.meta.env.VITE_TLDRAW_LICENSE_KEY ?? "").trim();
const REQUIRE_TLDRAW_LICENSE = import.meta.env.PROD;

class CanvasRuntimeErrorBoundary extends Component<
  { onError: (error: Error, info: ErrorInfo) => void; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError(error, info);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

interface Props {
  workspace: Workspace;
  blocks: CanvasBlock[];
  selectedBlockIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onBlocksChange: (blocks: CanvasBlock[]) => void;
  onCaptureMentorMessage?: (payload: MentorCanvasCapturePayload) => Promise<void> | void;
}

const COMMON_INSERT: Array<{ type: BlockType; labelEn: string; labelHu: string }> = [
  { type: "note", labelEn: "Note", labelHu: "Jegyzet" },
  { type: "ai_sticky", labelEn: "AI Sticky", labelHu: "AI Sticky" },
  { type: "source", labelEn: "Source", labelHu: "Forrás" },
  { type: "image_asset", labelEn: "Image", labelHu: "Kép" },
];

const MODE_INSERT: Record<Workspace["mode"], Array<{ type: BlockType; labelEn: string; labelHu: string }>> = {
  build: [
    { type: "task_list", labelEn: "Task List", labelHu: "Feladatlista" },
    { type: "roadmap", labelEn: "Roadmap", labelHu: "Roadmap" },
    { type: "critique", labelEn: "Critique", labelHu: "Kritika" },
  ],
  learn: [
    { type: "lesson", labelEn: "Lesson", labelHu: "Lecke" },
    { type: "quiz", labelEn: "Quiz", labelHu: "Kvíz" },
    { type: "flashcard", labelEn: "Flashcards", labelHu: "Flashcardok" },
  ],
  creative: [
    { type: "brief", labelEn: "Brief", labelHu: "Brief" },
    { type: "storyboard", labelEn: "Storyboard", labelHu: "Storyboard" },
    { type: "image_generation", labelEn: "Image Generation", labelHu: "Kép generálás" },
  ],
};

const INSERT_ICON_CLASS = "h-4 w-4";

function blockIcon(type: BlockType) {
  if (type === "note" || type === "ai_sticky") return <StickyNote className={INSERT_ICON_CLASS} />;
  if (type === "source") return <Library className={INSERT_ICON_CLASS} />;
  if (type === "image_asset" || type === "image") return <ImagePlus className={INSERT_ICON_CLASS} />;
  if (type === "lesson") return <BookOpen className={INSERT_ICON_CLASS} />;
  if (type === "quiz") return <ClipboardList className={INSERT_ICON_CLASS} />;
  if (type === "task_list") return <ClipboardList className={INSERT_ICON_CLASS} />;
  if (type === "brief") return <LayoutTemplate className={INSERT_ICON_CLASS} />;
  if (type === "storyboard") return <LayoutTemplate className={INSERT_ICON_CLASS} />;
  if (type === "roadmap") return <LayoutTemplate className={INSERT_ICON_CLASS} />;
  return <Plus className={INSERT_ICON_CLASS} />;
}

function sizeForBlockType(type: BlockType): { width: number; height: number } {
  if (type === "ai_sticky") return { width: 280, height: 190 };
  if (type === "source") return { width: 360, height: 250 };
  if (type === "image_asset" || type === "image") return { width: 360, height: 260 };
  if (type === "lesson") return { width: 380, height: 280 };
  if (type === "quiz") return { width: 360, height: 280 };
  if (type === "flashcard") return { width: 360, height: 260 };
  if (type === "task_list") return { width: 360, height: 280 };
  if (type === "roadmap") return { width: 380, height: 280 };
  if (type === "critique") return { width: 380, height: 280 };
  if (type === "brief") return { width: 380, height: 280 };
  if (type === "storyboard") return { width: 400, height: 300 };
  if (type === "image_generation") return { width: 400, height: 300 };
  return { width: 320, height: 220 };
}

function defaultLayout(type: BlockType, index: number): CanvasLayout {
  const col = index % 4;
  const row = Math.floor(index / 4);
  const size = sizeForBlockType(type);
  return {
    x: 72 + col * 340,
    y: 96 + row * 260,
    width: size.width,
    height: size.height,
  };
}

function readLayout(content: Record<string, unknown> | undefined, fallback: CanvasLayout): CanvasLayout {
  const layout = (content?.layout as Record<string, unknown> | undefined) ?? undefined;
  const x = typeof layout?.x === "number" ? layout.x : fallback.x;
  const y = typeof layout?.y === "number" ? layout.y : fallback.y;
  const width = typeof layout?.width === "number" ? layout.width : fallback.width;
  const height = typeof layout?.height === "number" ? layout.height : fallback.height;
  return { x, y, width, height };
}

function extractText(content: Record<string, unknown> | undefined): string {
  const candidates = [
    content?.text,
    content?.goal,
    content?.objective,
    content?.explanation,
    content?.summary,
    content?.excerpt,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return "";
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const candidate =
          (item as { text?: unknown }).text ??
          (item as { title?: unknown }).title ??
          (item as { question?: unknown }).question ??
          (item as { front?: unknown }).front ??
          (item as { scene_title?: unknown }).scene_title ??
          (item as { outcome?: unknown }).outcome;
        return typeof candidate === "string" ? candidate.trim() : "";
      }
      return "";
    })
    .filter(Boolean);
}

function joinLines(lines: string[]): string {
  return lines.filter(Boolean).join("\n");
}

function buildShapeContent(block: CanvasBlock, content: Record<string, unknown>) {
  const defaultText = extractText(content);
  const defaultItems = toStringArray(content.key_points);

  if (block.type === "lesson") {
    return {
      text: (typeof content.explanation === "string" && content.explanation) || defaultText,
      items: joinLines(defaultItems),
      meta: defaultItems.length > 0 ? `${defaultItems.length} key points` : "",
    };
  }

  if (block.type === "quiz") {
    const questions = Array.isArray(content.questions) ? content.questions : [];
    const questionLines = questions
      .map((item) =>
        item && typeof item === "object" && typeof (item as { question?: unknown }).question === "string"
          ? String((item as { question: string }).question)
          : "",
      )
      .filter(Boolean);
    return {
      text: defaultText,
      items: joinLines(questionLines),
      meta: `${questionLines.length} questions`,
    };
  }

  if (block.type === "flashcard") {
    const cards = Array.isArray(content.cards) ? content.cards : [];
    const cardLines = cards
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        const front = (item as { front?: unknown }).front;
        const back = (item as { back?: unknown }).back;
        if (typeof front !== "string" || !front.trim()) return "";
        return `${front.trim()}${typeof back === "string" && back.trim() ? ` -> ${back.trim()}` : ""}`;
      })
      .filter(Boolean);
    return {
      text: defaultText,
      items: joinLines(cardLines),
      meta: `${cardLines.length} cards`,
    };
  }

  if (block.type === "task_list") {
    const tasks = Array.isArray(content.tasks) ? content.tasks : [];
    const taskLines = tasks
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        const text = (item as { text?: unknown }).text;
        const done = (item as { done?: unknown }).done === true;
        return typeof text === "string" && text.trim() ? `${done ? "[x]" : "[ ]"} ${text.trim()}` : "";
      })
      .filter(Boolean);
    return {
      text: defaultText,
      items: joinLines(taskLines),
      meta: `${taskLines.length} tasks`,
    };
  }

  if (block.type === "roadmap") {
    const phases = Array.isArray(content.phases)
      ? content.phases
      : Array.isArray(content.steps)
        ? content.steps
        : [];
    const phaseLines = phases
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        const title = (item as { title?: unknown }).title;
        const outcome = (item as { outcome?: unknown }).outcome;
        if (typeof title === "string" && title.trim()) {
          return typeof outcome === "string" && outcome.trim()
            ? `${title.trim()}: ${outcome.trim()}`
            : title.trim();
        }
        return typeof outcome === "string" && outcome.trim() ? outcome.trim() : "";
      })
      .filter(Boolean);
    return {
      text: defaultText,
      items: joinLines(phaseLines),
      meta: `${phaseLines.length} phases`,
    };
  }

  if (block.type === "critique") {
    const strengths = toStringArray(content.strengths);
    const weaknesses = toStringArray(content.weaknesses);
    const risks = toStringArray(content.risks);
    const suggestions = toStringArray(content.suggestions);
    const improvements = toStringArray(content.improvements);
    const critiqueLines = [
      ...strengths.map((item) => `+ ${item}`),
      ...[...weaknesses, ...risks].map((item) => `- ${item}`),
      ...[...suggestions, ...improvements].map((item) => `> ${item}`),
    ];
    return {
      text: defaultText,
      items: joinLines(critiqueLines),
      meta: critiqueLines.length > 0 ? "Structured critique" : "",
    };
  }

  if (block.type === "brief") {
    const objective =
      (typeof content.objective === "string" && content.objective) || defaultText;
    const audience = typeof content.audience === "string" ? content.audience : "";
    const tone = typeof content.tone === "string" ? content.tone : "";
    const output = typeof content.output === "string" ? content.output : "";
    const lines = [
      audience ? `Audience: ${audience}` : "",
      tone ? `Tone: ${tone}` : "",
      output ? `Output: ${output}` : "",
    ].filter(Boolean);
    return {
      text: objective,
      items: joinLines(lines),
      meta: "Creative brief",
    };
  }

  if (block.type === "storyboard") {
    const scenes = Array.isArray(content.scenes) ? content.scenes : [];
    const sceneLines = scenes
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        const title =
          (item as { scene_title?: unknown }).scene_title ??
          (item as { title?: unknown }).title;
        return typeof title === "string" && title.trim() ? title.trim() : "";
      })
      .filter(Boolean);
    return {
      text: defaultText,
      items: joinLines(sceneLines),
      meta: `${sceneLines.length} scenes`,
    };
  }

  if (block.type === "image_generation") {
    const prompt =
      (typeof content.prompt === "string" && content.prompt) || defaultText;
    const model = typeof content.model === "string" ? content.model : "";
    const mode = typeof content.selected_mode === "string" ? content.selected_mode : "";
    const status = typeof content.status === "string" ? content.status : "";
    const lines = [mode ? `Mode: ${mode}` : "", model ? `Model: ${model}` : "", status ? `Status: ${status}` : ""]
      .filter(Boolean);
    return {
      text: prompt,
      items: joinLines(lines),
      meta: "Generation setup",
    };
  }

  return {
    text: defaultText,
    items: joinLines(defaultItems),
    meta: "",
  };
}

function mapBlockTypeToShapeType(
  blockType: BlockType,
):
  | "pumi-note"
  | "pumi-ai-sticky"
  | "pumi-image-asset"
  | "pumi-source"
  | "pumi-lesson"
  | "pumi-quiz"
  | "pumi-flashcard"
  | "pumi-task-list"
  | "pumi-roadmap"
  | "pumi-critique"
  | "pumi-brief"
  | "pumi-storyboard"
  | "pumi-image-generation" {
  if (blockType === "ai_sticky") return "pumi-ai-sticky";
  if (blockType === "image_asset" || blockType === "image") return "pumi-image-asset";
  if (blockType === "source") return "pumi-source";
  if (blockType === "lesson") return "pumi-lesson";
  if (blockType === "quiz") return "pumi-quiz";
  if (blockType === "flashcard") return "pumi-flashcard";
  if (blockType === "task_list") return "pumi-task-list";
  if (blockType === "roadmap") return "pumi-roadmap";
  if (blockType === "critique") return "pumi-critique";
  if (blockType === "brief") return "pumi-brief";
  if (blockType === "storyboard") return "pumi-storyboard";
  if (blockType === "image_generation") return "pumi-image-generation";

  return "pumi-note";
}

function shapeIdToBlockId(shapeId: string): string {
  return shapeId.startsWith("shape:") ? shapeId.slice(6) : shapeId;
}

function blockToShape(
  block: CanvasBlock,
  index: number,
  layoutOverrides: Map<string, CanvasLayout>,
): TLCreateShapePartial<TLShape> {
  const content = (block.content_json ?? {}) as Record<string, unknown>;
  const fallback = defaultLayout(block.type, index);
  const layout = layoutOverrides.get(block.id) ?? readLayout(content, fallback);
  const type = mapBlockTypeToShapeType(block.type);

  const title =
    (typeof block.title === "string" && block.title.trim() ? block.title : undefined) ??
    (typeof content.title === "string" ? content.title : undefined) ??
    (block.type === "source" ? "Source" : block.type === "ai_sticky" ? "AI Insight" : "Note");

  const imageUrl =
    (typeof content.url === "string" && content.url) ||
    (typeof content.image_url === "string" && content.image_url) ||
    (typeof content.output_preview_url === "string" && content.output_preview_url) ||
    "";

  const sourceName =
    (typeof content.name === "string" && content.name) ||
    (typeof content.source_name === "string" && content.source_name) ||
    "Source";

  const excerpt =
    (typeof content.excerpt === "string" && content.excerpt) ||
    (typeof content.summary_preview === "string" && content.summary_preview) ||
    "";

  const shapeContent = buildShapeContent(block, content);

  return {
    id: createShapeId(block.id),
    type,
    x: layout.x,
    y: layout.y,
    props: {
      w: layout.width,
      h: layout.height,
      blockId: block.id,
      blockType: block.type,
      title,
      text: shapeContent.text,
      items: shapeContent.items,
      meta: shapeContent.meta,
      imageUrl,
      sourceName,
      excerpt,
    },
  };
}

function sameLayout(left: CanvasLayout, right: CanvasLayout): boolean {
  return (
    Math.round(left.x) === Math.round(right.x) &&
    Math.round(left.y) === Math.round(right.y) &&
    Math.round(left.width) === Math.round(right.width) &&
    Math.round(left.height) === Math.round(right.height)
  );
}

function sortBlocks(items: CanvasBlock[]): CanvasBlock[] {
  return [...items].sort(
    (a, b) =>
      a.position - b.position ||
      a.created_at.localeCompare(b.created_at) ||
      a.id.localeCompare(b.id),
  );
}

function resolveMentorSection(blockType: BlockType): "ideas" | "plan" | "sources" | "output" {
  if (blockType === "source" || blockType === "summary" || blockType === "link" || blockType === "pdf_reference") return "sources";
  if (blockType === "task_list" || blockType === "roadmap" || blockType === "quiz" || blockType === "flashcard") return "plan";
  if (blockType === "storyboard" || blockType === "image_asset" || blockType === "image" || blockType === "gif" || blockType === "sticker" || blockType === "moodboard" || blockType === "reference_board" || blockType === "image_generation" || blockType === "copy" || blockType === "critique") return "output";
  return "ideas";
}

function createInitialContent(type: BlockType, isHu: boolean, section: "ideas" | "plan" | "sources" | "output", layout: CanvasLayout): Record<string, unknown> {
  const base: Record<string, unknown> = {
    section,
    section_key: section,
    layout,
  };

  if (type === "note") return { ...base, text: isHu ? "Rögzítsd itt a következő fontos gondolatot." : "Capture the next important thought here." };
  if (type === "ai_sticky") return { ...base, text: "AI insight", created_from: "mentor" };
  if (type === "source") return { ...base, name: isHu ? "Forrás" : "Source", excerpt: "", source_type: "text" };
  if (type === "image_asset") return { ...base, url: "", caption: "" };
  if (type === "lesson") return { ...base, explanation: "", key_points: [] };
  if (type === "quiz") return { ...base, questions: [] };
  if (type === "flashcard") return { ...base, cards: [] };
  if (type === "task_list") return { ...base, tasks: [] };
  if (type === "roadmap") return { ...base, phases: [] };
  if (type === "critique") return { ...base, strengths: [], weaknesses: [], suggestions: [] };
  if (type === "brief") return { ...base, objective: "", audience: "", tone: "", output: "" };
  if (type === "storyboard") return { ...base, scenes: [] };
  if (type === "image_generation") {
    return {
      ...base,
      prompt: "",
      model: "",
      reference_input: "",
      output_placeholder: isHu ? "Kimenet ide fog erkezni." : "Output preview will appear here.",
    };
  }

  return base;
}

function defaultInsertedTitle(type: BlockType, isHu: boolean): string | undefined {
  const en: Partial<Record<BlockType, string>> = {
    ai_sticky: "AI Insight",
    source: "Source",
    lesson: "Lesson",
    quiz: "Quiz",
    flashcard: "Flashcards",
    task_list: "Task List",
    roadmap: "Roadmap",
    critique: "Critique",
    brief: "Brief",
    storyboard: "Storyboard",
    image_generation: "Image Generation",
  };

  const hu: Partial<Record<BlockType, string>> = {
    ai_sticky: "AI Insight",
    source: "Forrás",
    lesson: "Lecke",
    quiz: "Kvíz",
    flashcard: "Flashcardok",
    task_list: "Feladatlista",
    roadmap: "Roadmap",
    critique: "Kritika",
    brief: "Brief",
    storyboard: "Storyboard",
    image_generation: "Kép generálás",
  };

  return (isHu ? hu[type] : en[type]) ?? undefined;
}

type InspectorFieldConfig = {
  key: string;
  labelEn: string;
  labelHu: string;
  placeholderEn: string;
  placeholderHu: string;
  multiline?: boolean;
  rows?: number;
};

interface BlockEditorDraft {
  blockId: string;
  blockType: BlockType;
  title: string;
  fields: Record<string, string>;
  dirty: boolean;
}

const EDITABLE_BLOCK_TYPES = new Set<BlockType>([
  "note",
  "ai_sticky",
  "image_asset",
  "image",
  "source",
  "lesson",
  "quiz",
  "brief",
  "storyboard",
  "image_generation",
]);

function toTextLines(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const candidate =
          (item as { question?: unknown }).question ??
          (item as { scene_title?: unknown }).scene_title ??
          (item as { title?: unknown }).title ??
          (item as { text?: unknown }).text ??
          (item as { front?: unknown }).front;
        return typeof candidate === "string" ? candidate.trim() : "";
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isEditableBlockType(type: BlockType): boolean {
  return EDITABLE_BLOCK_TYPES.has(type);
}

function createEditorDraft(block: CanvasBlock): BlockEditorDraft {
  const content = (block.content_json ?? {}) as Record<string, unknown>;
  const title = toText(block.title) || toText(content.title);

  const fields: Record<string, string> = {};

  if (block.type === "note" || block.type === "ai_sticky") {
    fields.text = toText(content.text);
  } else if (block.type === "image_asset" || block.type === "image") {
    fields.url = toText(content.url) || toText(content.image_url);
    fields.caption = toText(content.caption) || toText(content.text);
    fields.reference = toText(content.reference_input);
  } else if (block.type === "source") {
    fields.name = toText(content.name) || toText(content.source_name);
    fields.excerpt = toText(content.excerpt) || toText(content.text);
    fields.source_url = toText(content.source_url) || toText(content.url);
  } else if (block.type === "lesson") {
    fields.explanation = toText(content.explanation) || toText(content.text);
    fields.key_points = toTextLines(content.key_points);
  } else if (block.type === "quiz") {
    fields.intro = toText(content.text);
    fields.questions = toTextLines(content.questions);
  } else if (block.type === "brief") {
    fields.objective = toText(content.objective) || toText(content.text);
    fields.audience = toText(content.audience);
    fields.tone = toText(content.tone);
    fields.output = toText(content.output);
  } else if (block.type === "storyboard") {
    fields.summary = toText(content.text);
    fields.scenes = toTextLines(content.scenes);
  } else if (block.type === "image_generation") {
    fields.prompt = toText(content.prompt) || toText(content.text);
    fields.model = toText(content.model);
    fields.reference_input = toText(content.reference_input);
  }

  return {
    blockId: block.id,
    blockType: block.type,
    title,
    fields,
    dirty: false,
  };
}

function inspectorFieldsForType(type: BlockType): InspectorFieldConfig[] {
  if (type === "note" || type === "ai_sticky") {
    return [
      {
        key: "text",
        labelEn: "Text",
        labelHu: "Szöveg",
        placeholderEn: "Write the note content...",
        placeholderHu: "Írd le a blokk tartalmát...",
        multiline: true,
        rows: 5,
      },
    ];
  }

  if (type === "image_asset" || type === "image") {
    return [
      {
        key: "url",
        labelEn: "Image URL",
        labelHu: "Kép URL",
        placeholderEn: "https://...",
        placeholderHu: "https://...",
      },
      {
        key: "caption",
        labelEn: "Caption",
        labelHu: "Felirat",
        placeholderEn: "Context for this asset",
        placeholderHu: "Kontexus ehhez a képi elemhez",
        multiline: true,
        rows: 3,
      },
      {
        key: "reference",
        labelEn: "Reference",
        labelHu: "Referencia",
        placeholderEn: "Optional reference link or note",
        placeholderHu: "Opcionális referencia link vagy megjegyzés",
      },
    ];
  }

  if (type === "source") {
    return [
      {
        key: "name",
        labelEn: "Source title",
        labelHu: "Forrás címe",
        placeholderEn: "Name of the source",
        placeholderHu: "A forrás neve",
      },
      {
        key: "source_url",
        labelEn: "Source URL",
        labelHu: "Forrás URL",
        placeholderEn: "https://...",
        placeholderHu: "https://...",
      },
      {
        key: "excerpt",
        labelEn: "Source content",
        labelHu: "Forrás tartalom",
        placeholderEn: "Paste key source text...",
        placeholderHu: "Illeszd be a kulcs forrásrészt...",
        multiline: true,
        rows: 6,
      },
    ];
  }

  if (type === "lesson") {
    return [
      {
        key: "explanation",
        labelEn: "Explanation",
        labelHu: "Magyarázat",
        placeholderEn: "Core explanation...",
        placeholderHu: "Alapmagyarázat...",
        multiline: true,
        rows: 5,
      },
      {
        key: "key_points",
        labelEn: "Key points (one per line)",
        labelHu: "Kulcspontok (soronként egy)",
        placeholderEn: "Point 1\nPoint 2",
        placeholderHu: "1. pont\n2. pont",
        multiline: true,
        rows: 5,
      },
    ];
  }

  if (type === "quiz") {
    return [
      {
        key: "intro",
        labelEn: "Quiz context",
        labelHu: "Kvíz kontextus",
        placeholderEn: "What is this quiz about?",
        placeholderHu: "Miről szól ez a kvíz?",
        multiline: true,
        rows: 3,
      },
      {
        key: "questions",
        labelEn: "Questions (one per line)",
        labelHu: "Kérdések (soronként egy)",
        placeholderEn: "Question 1\nQuestion 2",
        placeholderHu: "1. kérdés\n2. kérdés",
        multiline: true,
        rows: 6,
      },
    ];
  }

  if (type === "brief") {
    return [
      {
        key: "objective",
        labelEn: "Objective",
        labelHu: "Cél",
        placeholderEn: "What should this achieve?",
        placeholderHu: "Mit kell elérni?",
        multiline: true,
        rows: 3,
      },
      {
        key: "audience",
        labelEn: "Audience",
        labelHu: "Közönség",
        placeholderEn: "Primary audience",
        placeholderHu: "Elsődleges célcsoport",
      },
      {
        key: "tone",
        labelEn: "Tone",
        labelHu: "Hangnem",
        placeholderEn: "Tone and style",
        placeholderHu: "Hangnem és stílus",
      },
      {
        key: "output",
        labelEn: "Output",
        labelHu: "Kimenet",
        placeholderEn: "Desired output format",
        placeholderHu: "Elvárt kimeneti formátum",
      },
    ];
  }

  if (type === "storyboard") {
    return [
      {
        key: "summary",
        labelEn: "Summary",
        labelHu: "Összegzés",
        placeholderEn: "Narrative summary...",
        placeholderHu: "Narratív összegzés...",
        multiline: true,
        rows: 3,
      },
      {
        key: "scenes",
        labelEn: "Scenes (one per line)",
        labelHu: "Jelenetek (soronként egy)",
        placeholderEn: "Opening shot\nConflict\nResolution",
        placeholderHu: "Nyitó jelenet\nKonfliktus\nFeloldás",
        multiline: true,
        rows: 6,
      },
    ];
  }

  if (type === "image_generation") {
    return [
      {
        key: "prompt",
        labelEn: "Prompt",
        labelHu: "Prompt",
        placeholderEn: "Describe the desired visual output...",
        placeholderHu: "Írd le a kívánt vizuális kimenetet...",
        multiline: true,
        rows: 4,
      },
      {
        key: "model",
        labelEn: "Model",
        labelHu: "Modell",
        placeholderEn: "Model identifier (optional)",
        placeholderHu: "Modell azonosító (opcionális)",
      },
      {
        key: "reference_input",
        labelEn: "Reference input",
        labelHu: "Referencia input",
        placeholderEn: "Optional references, URLs, visual cues",
        placeholderHu: "Opcionális referenciák, URL-ek, vizuális jelek",
        multiline: true,
        rows: 3,
      },
    ];
  }

  return [];
}

function buildContentFromDraft(
  block: CanvasBlock,
  draft: BlockEditorDraft,
): Record<string, unknown> {
  const content = { ...((block.content_json ?? {}) as Record<string, unknown>) };
  const fields = draft.fields;

  if (block.type === "note" || block.type === "ai_sticky") {
    content.text = fields.text ?? "";
    return content;
  }

  if (block.type === "image_asset" || block.type === "image") {
    content.url = fields.url ?? "";
    content.image_url = fields.url ?? "";
    content.caption = fields.caption ?? "";
    content.text = fields.caption ?? "";
    content.reference_input = fields.reference ?? "";
    return content;
  }

  if (block.type === "source") {
    content.name = fields.name ?? "";
    content.source_name = fields.name ?? "";
    content.excerpt = fields.excerpt ?? "";
    content.text = fields.excerpt ?? "";
    content.source_url = fields.source_url ?? "";
    content.url = fields.source_url ?? "";
    return content;
  }

  if (block.type === "lesson") {
    content.explanation = fields.explanation ?? "";
    content.text = fields.explanation ?? "";
    content.key_points = splitLines(fields.key_points ?? "");
    return content;
  }

  if (block.type === "quiz") {
    const currentQuestions = Array.isArray(content.questions) ? content.questions : [];
    const questionLines = splitLines(fields.questions ?? "");
    content.text = fields.intro ?? "";
    content.questions = questionLines.map((question, index) => {
      const previous = currentQuestions[index];
      if (previous && typeof previous === "object") {
        return { ...(previous as Record<string, unknown>), question };
      }
      return { id: crypto.randomUUID(), question, options: [], correct_answer: 0 };
    });
    return content;
  }

  if (block.type === "brief") {
    content.objective = fields.objective ?? "";
    content.text = fields.objective ?? "";
    content.audience = fields.audience ?? "";
    content.tone = fields.tone ?? "";
    content.output = fields.output ?? "";
    return content;
  }

  if (block.type === "storyboard") {
    const currentScenes = Array.isArray(content.scenes) ? content.scenes : [];
    const sceneLines = splitLines(fields.scenes ?? "");
    content.text = fields.summary ?? "";
    content.scenes = sceneLines.map((sceneTitle, index) => {
      const previous = currentScenes[index];
      if (previous && typeof previous === "object") {
        return { ...(previous as Record<string, unknown>), scene_title: sceneTitle };
      }
      return { id: crypto.randomUUID(), scene_title: sceneTitle };
    });
    return content;
  }

  if (block.type === "image_generation") {
    content.prompt = fields.prompt ?? "";
    content.text = fields.prompt ?? "";
    content.model = fields.model ?? "";
    content.reference_input = fields.reference_input ?? "";
    return content;
  }

  return content;
}

export function CanvasSurface({
  workspace,
  blocks,
  selectedBlockIds,
  onSelectionChange,
  onBlocksChange,
  onCaptureMentorMessage,
}: Props) {
  const { t, lang } = useTranslation();
  const locale: "en" | "hu" = lang === "hu" ? "hu" : "en";
  const isHu = locale === "hu";
  const quickInsertItems = useMemo(
    () => [...COMMON_INSERT, ...MODE_INSERT[workspace.mode]],
    [workspace.mode],
  );
  const quickInsertMap = useMemo(() => {
    const map = new Map<BlockType, { labelEn: string; labelHu: string }>();
    for (const item of quickInsertItems) {
      map.set(item.type, { labelEn: item.labelEn, labelHu: item.labelHu });
    }
    return map;
  }, [quickInsertItems]);
  const floatingQuickTypes = useMemo(() => {
    const modePrimary = MODE_INSERT[workspace.mode][0]?.type;
    const seed: BlockType[] = ["note", "source", "image_asset", "ai_sticky"];
    if (modePrimary) {
      seed.splice(3, 0, modePrimary);
    }
    return [...new Set(seed)];
  }, [workspace.mode]);

  const [showInsert, setShowInsert] = useState(false);
  const [showSourceDialog, setShowSourceDialog] = useState(false);
  const [mentorDropActive, setMentorDropActive] = useState(false);
  const [adding, setAdding] = useState(false);
  const [canvasRuntimeError, setCanvasRuntimeError] = useState<string | null>(null);
  const [editorDraft, setEditorDraft] = useState<BlockEditorDraft | null>(null);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  const editorRef = useRef<Editor | null>(null);
  const editorCleanupRef = useRef<(() => void) | null>(null);
  const syncingRef = useRef(false);
  const blocksRef = useRef(blocks);
  const dragDepthRef = useRef(0);
  const persistTimersRef = useRef<Map<string, number>>(new Map());
  const persistRevisionRef = useRef<Map<string, number>>(new Map());
  const layoutOverridesRef = useRef<Map<string, CanvasLayout>>(new Map());
  const insertPanelRef = useRef<HTMLDivElement | null>(null);
  const missingProductionLicense = REQUIRE_TLDRAW_LICENSE && TLDRAW_LICENSE_KEY.length === 0;
  const canvasUnavailable = missingProductionLicense || Boolean(canvasRuntimeError);
  const selectedPrimaryBlock = useMemo(
    () =>
      selectedBlockIds
        .map((id) => blocks.find((block) => block.id === id))
        .find((block): block is CanvasBlock => !!block),
    [blocks, selectedBlockIds],
  );
  const editableSelectedBlock =
    selectedPrimaryBlock && isEditableBlockType(selectedPrimaryBlock.type)
      ? selectedPrimaryBlock
      : null;
  const inspectorFields = useMemo(
    () => (editorDraft ? inspectorFieldsForType(editorDraft.blockType) : []),
    [editorDraft],
  );

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => {
    layoutOverridesRef.current.clear();
    persistRevisionRef.current.clear();
    for (const timer of persistTimersRef.current.values()) {
      window.clearTimeout(timer);
    }
    persistTimersRef.current.clear();
  }, [workspace.id]);

  const visibleBlocks = useMemo(() => blocks.filter((block) => block.type !== "board_section"), [blocks]);

  useEffect(() => {
    if (!showInsert) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (insertPanelRef.current?.contains(target)) return;
      setShowInsert(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [showInsert]);

  useEffect(() => {
    setCanvasRuntimeError(null);
  }, [workspace.id]);

  useEffect(() => {
    if (!editableSelectedBlock) {
      setEditorDraft(null);
      setEditorError(null);
      return;
    }
    setEditorDraft(createEditorDraft(editableSelectedBlock));
    setEditorError(null);
  }, [editableSelectedBlock?.id]);

  useEffect(() => {
    if (!missingProductionLicense) return;
    console.error(
      "[canvas] Missing VITE_TLDRAW_LICENSE_KEY in production build. Canvas rendering is disabled to avoid blank runtime failure.",
    );
  }, [missingProductionLicense]);

  const upsertBlocks = (incoming: CanvasBlock[]) => {
    const byId = new Map<string, CanvasBlock>();
    for (const item of blocksRef.current) byId.set(item.id, item);
    for (const item of incoming) byId.set(item.id, item);

    const next = sortBlocks([...byId.values()]);
    blocksRef.current = next;
    onBlocksChange(next);
  };

  const updateDraftTitle = (value: string) => {
    setEditorDraft((previous) => {
      if (!previous) return previous;
      return { ...previous, title: value, dirty: true };
    });
  };

  const updateDraftField = (key: string, value: string) => {
    setEditorDraft((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        fields: {
          ...previous.fields,
          [key]: value,
        },
        dirty: true,
      };
    });
  };

  const resetEditorDraft = () => {
    if (!editableSelectedBlock) return;
    setEditorDraft(createEditorDraft(editableSelectedBlock));
    setEditorError(null);
  };

  const saveEditorDraft = async () => {
    if (!editorDraft || !editorDraft.dirty) return;
    const block = blocksRef.current.find((item) => item.id === editorDraft.blockId);
    if (!block) return;

    setEditorSaving(true);
    setEditorError(null);

    try {
      const updated = await patchBlock(block.id, {
        title: editorDraft.title.trim() ? editorDraft.title.trim() : undefined,
        content_json: buildContentFromDraft(block, editorDraft),
      });

      upsertBlocks([updated]);
      setEditorDraft(createEditorDraft(updated));
    } catch (error) {
      console.error("[canvas] failed to save block edits", error);
      setEditorError(
        isHu
          ? "Nem sikerült menteni a blokk szerkesztését."
          : "Could not save block edits.",
      );
    } finally {
      setEditorSaving(false);
    }
  };

  const syncShapesFromBlocks = () => {
    const editor = editorRef.current;
    if (!editor) return;

    syncingRef.current = true;
    try {
      const desiredIds = new Set<string>();
      const createPartials: TLCreateShapePartial<TLShape>[] = [];
      const updatePartials: TLCreateShapePartial<TLShape>[] = [];

      for (const [index, block] of visibleBlocks.entries()) {
        const partial = blockToShape(block, index, layoutOverridesRef.current);
        desiredIds.add(String(partial.id));

        const existing = editor.getShape(partial.id as never) as TLShape | undefined;
        if (!existing) {
          createPartials.push(partial);
          continue;
        }

        const sameType = existing.type === partial.type;
        const sameX = Math.round(existing.x) === Math.round(partial.x ?? 0);
        const sameY = Math.round(existing.y) === Math.round(partial.y ?? 0);
        const existingProps = (existing as { props?: Record<string, unknown> }).props ?? {};
        const nextProps = (partial as { props?: Record<string, unknown> }).props ?? {};
        const sameProps = JSON.stringify(existingProps) === JSON.stringify(nextProps);

        if (!sameType || !sameX || !sameY || !sameProps) {
          updatePartials.push(partial);
        }
      }

      if (createPartials.length > 0) {
        editor.createShapes(createPartials as never);
      }
      if (updatePartials.length > 0) {
        editor.updateShapes(updatePartials as never);
      }

      const currentShapes = editor.getCurrentPageShapes();
      const toDelete = currentShapes
        .filter((shape) => String(shape.type).startsWith("pumi-") && !desiredIds.has(String(shape.id)))
        .map((shape) => shape.id);
      if (toDelete.length > 0) {
        editor.deleteShapes(toDelete as never);
      }
    } finally {
      syncingRef.current = false;
    }
  };

  useEffect(() => {
    syncShapesFromBlocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleBlocks]);

  useEffect(() => {
    if (!DEV_DIAGNOSTICS) return;
    console.info(`[canvas] workspace=${workspace.id} loaded blocks=${visibleBlocks.length}`);
  }, [workspace.id, visibleBlocks.length]);

  const persistLayout = async (blockId: string, layout: CanvasLayout, revision: number) => {
    const block = blocksRef.current.find((item) => item.id === blockId);
    if (!block) {
      if (DEV_DIAGNOSTICS) {
        console.warn(`[canvas] skipped layout save, missing block ${blockId}`);
      }
      return;
    }

    const content = (block.content_json ?? {}) as Record<string, unknown>;

    try {
      const updated = await patchBlock(blockId, {
        content_json: {
          ...content,
          layout,
        },
      });

      const currentRevision = persistRevisionRef.current.get(blockId) ?? 0;
      if (revision !== currentRevision) {
        if (DEV_DIAGNOSTICS) {
          console.info(`[canvas] ignored stale layout response for ${blockId}`);
        }
        return;
      }

      const next = blocksRef.current.map((item) => {
        if (item.id !== blockId) return item;
        const mergedContent = {
          ...(item.content_json ?? {}),
          ...((updated.content_json ?? {}) as Record<string, unknown>),
          layout,
        };

        return {
          ...item,
          ...updated,
          content_json: mergedContent,
        };
      });

      const normalized = sortBlocks(next);
      blocksRef.current = normalized;
      onBlocksChange(normalized);

      const currentOverride = layoutOverridesRef.current.get(blockId);
      if (currentOverride && sameLayout(currentOverride, layout)) {
        layoutOverridesRef.current.delete(blockId);
      }

      if (DEV_DIAGNOSTICS) {
        console.info(`[canvas] persisted layout for ${blockId}`, layout);
      }
    } catch (error) {
      const currentRevision = persistRevisionRef.current.get(blockId) ?? 0;
      if (revision === currentRevision) {
        console.error(`[canvas] failed to persist layout for ${blockId}. Shape may be local-only until next save.`, error);
      }
    }
  };

  const scheduleLayoutPersist = (blockId: string, layout: CanvasLayout) => {
    layoutOverridesRef.current.set(blockId, layout);

    const existing = persistTimersRef.current.get(blockId);
    if (existing) {
      window.clearTimeout(existing);
    }

    const revision = (persistRevisionRef.current.get(blockId) ?? 0) + 1;
    persistRevisionRef.current.set(blockId, revision);

    const timer = window.setTimeout(() => {
      void persistLayout(blockId, layout, revision);
      persistTimersRef.current.delete(blockId);
    }, 180);

    persistTimersRef.current.set(blockId, timer);
  };

  const handleEditorMount = (editor: Editor) => {
    editorCleanupRef.current?.();
    editorRef.current = editor;
    syncShapesFromBlocks();

    const unlisten = editor.store.listen((entry: any) => {
      if (syncingRef.current) return;

      const selected = editor
        .getSelectedShapes()
        .filter((shape) => String(shape.type).startsWith("pumi-"))
        .map((shape) => {
          const props = (shape as { props?: Record<string, unknown> }).props;
          if (props && typeof props.blockId === "string" && props.blockId) {
            return props.blockId;
          }
          return shapeIdToBlockId(String(shape.id));
        });
      onSelectionChange([...new Set(selected)]);

      const updated = (entry?.changes?.updated ?? {}) as Record<string, [any, any]>;
      for (const value of Object.values(updated)) {
        const to = value?.[1];
        if (!to || typeof to !== "object") continue;
        if (typeof to.type !== "string" || !to.type.startsWith("pumi-")) continue;

        const blockId =
          (to.props && typeof to.props.blockId === "string" && to.props.blockId) ||
          shapeIdToBlockId(String(to.id));

        if (!blockId) continue;

        const layout: CanvasLayout = {
          x: Math.round(typeof to.x === "number" ? to.x : 0),
          y: Math.round(typeof to.y === "number" ? to.y : 0),
          width: Math.max(120, Math.round(typeof to.props?.w === "number" ? to.props.w : 320)),
          height: Math.max(100, Math.round(typeof to.props?.h === "number" ? to.props.h : 220)),
        };

        scheduleLayoutPersist(blockId, layout);
      }
    });

    editorCleanupRef.current = () => {
      unlisten();
      for (const timer of persistTimersRef.current.values()) {
        window.clearTimeout(timer);
      }
      persistTimersRef.current.clear();
      persistRevisionRef.current.clear();
      layoutOverridesRef.current.clear();
    };
  };

  useEffect(() => {
    return () => {
      editorCleanupRef.current?.();
      editorCleanupRef.current = null;
    };
  }, []);

  const createCanvasBlock = async (type: BlockType) => {
    setShowInsert(false);
    setAdding(true);

    try {
      const index = blocksRef.current.length;
      const layout = defaultLayout(type, index);
      const section = resolveMentorSection(type);
      const title = defaultInsertedTitle(type, isHu);
      const content = createInitialContent(type, isHu, section, layout);

      const block = await createBlock({
        workspace_id: workspace.id,
        type,
        title,
        content_json: content,
        position: index,
      });

      upsertBlocks([block]);
      onSelectionChange([block.id]);
      if (isEditableBlockType(block.type)) {
        setEditorDraft(createEditorDraft(block));
      }
    } catch (error) {
      console.error("[canvas] failed to create block", error);
    } finally {
      setAdding(false);
    }
  };

  const handleSourceCompleted = async (result: DocumentSummaryBundle) => {
    const sourceLayout = defaultLayout("source", blocksRef.current.length);
    const summaryLayout = defaultLayout("summary", blocksRef.current.length + 1);

    const sourceContent = {
      ...(result.source_block.content_json ?? {}),
      section: "sources",
      section_key: "sources",
      layout: sourceLayout,
    };
    const summaryContent = {
      ...(result.summary_block.content_json ?? {}),
      section: "sources",
      section_key: "sources",
      layout: summaryLayout,
    };

    try {
      const [sourceBlock, summaryBlock] = await Promise.all([
        patchBlock(result.source_block.id, { content_json: sourceContent }),
        patchBlock(result.summary_block.id, { content_json: summaryContent }),
      ]);

      upsertBlocks([sourceBlock, summaryBlock]);
      if (DEV_DIAGNOSTICS) {
        console.info("[canvas] source upload blocks persisted with layout", {
          source: sourceBlock.id,
          summary: summaryBlock.id,
        });
      }
    } catch (error) {
      console.error("[canvas] source block layout persistence failed. Updated layout is local-only until next save.", error);
      upsertBlocks([
        { ...result.source_block, content_json: sourceContent },
        { ...result.summary_block, content_json: summaryContent },
      ]);
    }
  };

  const hasMentorPayloadType = (event: DragEvent<HTMLElement>) =>
    Array.from(event.dataTransfer.types).includes(MENTOR_MESSAGE_DND_MIME);

  const parseMentorPayload = (
    event: DragEvent<HTMLElement>,
  ): Omit<MentorCanvasCapturePayload, "action_type"> | null => {
    const raw = event.dataTransfer.getData(MENTOR_MESSAGE_DND_MIME);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as {
        source_message_id?: string;
        text?: string;
        generated_block?: MentorGeneratedBlock;
      };
      if (!parsed.source_message_id || !parsed.text) return null;
      return {
        source_message_id: parsed.source_message_id,
        text: parsed.text,
        generated_block: parsed.generated_block,
      };
    } catch {
      return null;
    }
  };

  const handleMentorDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!hasMentorPayloadType(event)) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setMentorDropActive(true);
  };

  const handleMentorDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!hasMentorPayloadType(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleMentorDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!mentorDropActive && !hasMentorPayloadType(event)) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setMentorDropActive(false);
    }
  };

  const handleMentorDrop = async (event: DragEvent<HTMLDivElement>) => {
    if (!mentorDropActive && !hasMentorPayloadType(event)) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setMentorDropActive(false);

    const payload = parseMentorPayload(event);
    if (!payload || !onCaptureMentorMessage) return;

    const blockType: BlockType = payload.generated_block?.block_type ?? "ai_sticky";
    const fallback = defaultLayout(blockType, blocksRef.current.length);

    let x = fallback.x;
    let y = fallback.y;
    const editor = editorRef.current;
    if (editor) {
      const point = editor.screenToPage({ x: event.clientX, y: event.clientY });
      x = Math.round(point.x);
      y = Math.round(point.y);
    }

    const size = sizeForBlockType(blockType);

    await onCaptureMentorMessage({
      ...payload,
      action_type: "drag",
      target_section_key: resolveMentorSection(blockType),
      target_layout: {
        x,
        y,
        width: size.width,
        height: size.height,
      },
    });
  };

  const dropHint = isHu
    ? "Dobd ide, és a mentor output valódi canvas objektum lesz."
    : "Drop here and the mentor output becomes a real canvas object.";
  const selectedLabel = isHu ? "kijelölt" : "selected";
  const insertLabel = isHu ? "Beszúrás" : "Insert";
  const insertMoreLabel = isHu ? "További blokkok" : "More blocks";
  const modeSectionLabel =
    workspace.mode === "learn"
      ? isHu
        ? "Tanulás mód"
        : "Learn mode"
      : workspace.mode === "creative"
        ? isHu
          ? "Kreatív mód"
          : "Creative mode"
        : isHu
          ? "Build mód"
          : "Build mode";
  const unavailableTitle = missingProductionLicense
    ? isHu
      ? "Canvas licence kulcs hiányzik"
      : "Canvas license key missing"
    : isHu
      ? "Canvas jelenleg nem elérhető"
      : "Canvas is currently unavailable";
  const unavailableBody = missingProductionLicense
    ? isHu
      ? "Állítsd be a VITE_TLDRAW_LICENSE_KEY környezeti változót a production/preview deployban."
      : "Set VITE_TLDRAW_LICENSE_KEY in the production/preview environment variables."
    : isHu
      ? "A canvas futása közben hiba történt. Ellenőrizd a konzolt, majd frissítsd az oldalt."
      : "The canvas crashed at runtime. Check the browser console and refresh the page.";
  const unavailableMeta = canvasRuntimeError
    ? canvasRuntimeError
    : missingProductionLicense
      ? "Missing environment variable: VITE_TLDRAW_LICENSE_KEY"
      : null;

  return (
    <div className="relative h-full min-h-[680px] p-2 md:p-3">
      {showSourceDialog && (
        <UploadSourceDialog
          workspaceId={workspace.id}
          locale={locale}
          onCompleted={handleSourceCompleted}
          onClose={() => setShowSourceDialog(false)}
        />
      )}

      <div
        className={`relative h-full min-h-[680px] rounded-[24px] border border-[var(--shell-border)]/80 bg-[var(--shell-surface)]/75 overflow-hidden shadow-[var(--shell-shadow-strong)] ${
          mentorDropActive ? "ring-2 ring-[var(--shell-accent)]/60 shell-drop-active" : ""
        }`}
        onDragEnter={handleMentorDragEnter}
        onDragOver={handleMentorDragOver}
        onDragLeave={handleMentorDragLeave}
        onDrop={handleMentorDrop}
      >
        {!canvasUnavailable && mentorDropActive && (
          <div className="pointer-events-none absolute z-30 top-4 left-4 rounded-xl border border-dashed border-[var(--shell-accent)] bg-[var(--shell-accent-soft)] px-3 py-2 text-xs inline-flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            {dropHint}
          </div>
        )}

        {!canvasUnavailable && !editorDraft && selectedBlockIds.length > 0 && (
          <div className="absolute z-30 top-4 right-4 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)]/90 px-2.5 py-1.5 text-[11px] shell-muted">
            {selectedBlockIds.length} {selectedLabel}
          </div>
        )}

        {!canvasUnavailable && editorDraft && (
          <div className="absolute z-30 top-4 right-4 w-[330px] rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-surface)]/94 shadow-xl backdrop-blur-md p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] uppercase tracking-[0.14em] shell-muted">
                {isHu ? "Objektum szerkesztése" : "Edit object"}
              </p>
              <span className="rounded-md border border-[var(--shell-border)]/70 bg-[var(--shell-surface-2)]/65 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] shell-muted">
                {editorDraft.blockType}
              </span>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] shell-muted">{isHu ? "Cím" : "Title"}</p>
              <input
                value={editorDraft.title}
                onChange={(event) => updateDraftTitle(event.target.value)}
                className="w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface-2)]/70 px-2.5 py-1.5 text-xs text-[var(--shell-text)] outline-none"
                placeholder={isHu ? "Adj címet..." : "Add title..."}
              />
            </div>

            <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
              {inspectorFields.map((field) => {
                const label = isHu ? field.labelHu : field.labelEn;
                const placeholder = isHu ? field.placeholderHu : field.placeholderEn;
                const value = editorDraft.fields[field.key] ?? "";
                return (
                  <div key={field.key} className="space-y-1.5">
                    <p className="text-[11px] shell-muted">{label}</p>
                    {field.multiline ? (
                      <textarea
                        value={value}
                        rows={field.rows ?? 4}
                        onChange={(event) => updateDraftField(field.key, event.target.value)}
                        className="w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface-2)]/70 px-2.5 py-1.5 text-xs text-[var(--shell-text)] outline-none resize-y min-h-[72px]"
                        placeholder={placeholder}
                      />
                    ) : (
                      <input
                        value={value}
                        onChange={(event) => updateDraftField(field.key, event.target.value)}
                        className="w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface-2)]/70 px-2.5 py-1.5 text-xs text-[var(--shell-text)] outline-none"
                        placeholder={placeholder}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {editorError && <p className="text-[11px] text-rose-400">{editorError}</p>}

            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-[11px] shell-muted">
                {editorDraft.dirty
                  ? isHu
                    ? "Nem mentett változtatások"
                    : "Unsaved changes"
                  : isHu
                    ? "Minden változtatás mentve"
                    : "All changes saved"}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={resetEditorDraft}
                  disabled={!editorDraft.dirty || editorSaving}
                  className="rounded-md border border-[var(--shell-border)]/70 bg-[var(--shell-surface-2)]/65 px-2 py-1 text-[11px] shell-muted hover:text-[var(--shell-text)] shell-interactive disabled:opacity-50"
                >
                  {isHu ? "Visszaállítás" : "Reset"}
                </button>
                <button
                  onClick={() => void saveEditorDraft()}
                  disabled={!editorDraft.dirty || editorSaving}
                  className="rounded-md border border-[var(--shell-border)]/70 bg-[var(--shell-accent-soft)] px-2 py-1 text-[11px] text-[var(--shell-text)] shell-interactive disabled:opacity-50"
                >
                  {editorSaving
                    ? isHu
                      ? "Mentés..."
                      : "Saving..."
                    : isHu
                      ? "Mentés"
                      : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {!canvasUnavailable && (
          <div ref={insertPanelRef} className="absolute z-30 left-4 bottom-4 flex items-end gap-2">
            <div className="rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-surface)]/92 p-2.5 shadow-xl backdrop-blur-lg">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowInsert((value) => !value)}
                  className={`h-10 w-10 inline-flex items-center justify-center rounded-xl border border-[var(--shell-border)] shell-interactive ${
                    showInsert ? "bg-[var(--shell-accent-soft)] text-[var(--shell-text)]" : "shell-muted"
                  }`}
                  title={insertLabel}
                  aria-label={insertLabel}
                >
                  <Plus className="h-4 w-4" />
                </button>

                {floatingQuickTypes.map((type) => {
                  const labels = quickInsertMap.get(type);
                  const label = labels ? (isHu ? labels.labelHu : labels.labelEn) : type;
                  return (
                    <button
                      key={type}
                      onClick={() => void createCanvasBlock(type)}
                      disabled={adding}
                      className="h-10 w-10 inline-flex items-center justify-center rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface-2)]/65 shell-muted hover:text-[var(--shell-text)] shell-interactive disabled:opacity-60"
                      title={label}
                      aria-label={label}
                    >
                      {blockIcon(type)}
                    </button>
                  );
                })}

                <button
                  onClick={() => setShowSourceDialog(true)}
                  className="h-10 w-10 inline-flex items-center justify-center rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface-2)]/65 shell-muted hover:text-[var(--shell-text)] shell-interactive"
                  title={t("uploadSource")}
                  aria-label={t("uploadSource")}
                >
                  <FilePlus2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {showInsert && (
              <div className="absolute bottom-[calc(100%+10px)] left-0 w-[300px] rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-surface)]/96 backdrop-blur-md p-3 shadow-2xl max-h-[68vh] overflow-y-auto space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-[0.14em] shell-muted">{insertMoreLabel}</p>
                  <span className="text-[11px] shell-muted">{adding ? (isHu ? "Hozzáadás..." : "Adding...") : ""}</span>
                </div>

                <div className="space-y-1.5">
                  {COMMON_INSERT.map((item) => (
                    <button
                      key={item.type}
                      onClick={() => void createCanvasBlock(item.type)}
                      className="w-full rounded-xl border border-[var(--shell-border)]/65 bg-[var(--shell-surface-2)]/55 px-3 py-2 text-left shell-interactive"
                    >
                      <span className="inline-flex items-center gap-2 text-xs text-[var(--shell-text)]">
                        {blockIcon(item.type)}
                        {isHu ? item.labelHu : item.labelEn}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] uppercase tracking-[0.14em] shell-muted">{modeSectionLabel}</p>
                  {MODE_INSERT[workspace.mode].map((item) => (
                    <button
                      key={item.type}
                      onClick={() => void createCanvasBlock(item.type)}
                      className="w-full rounded-xl border border-[var(--shell-border)]/65 bg-[var(--shell-surface-2)]/55 px-3 py-2 text-left shell-interactive"
                    >
                      <span className="inline-flex items-center gap-2 text-xs text-[var(--shell-text)]">
                        {blockIcon(item.type)}
                        {isHu ? item.labelHu : item.labelEn}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {canvasUnavailable ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-6">
            <div className="w-full max-w-lg rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-surface)]/90 p-5 shadow-xl">
              <p className="text-[11px] uppercase tracking-[0.16em] shell-muted">
                {isHu ? "Fejlesztői jelzés" : "Developer notice"}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-[var(--shell-text)]">{unavailableTitle}</h3>
              <p className="mt-2 text-sm shell-muted">{unavailableBody}</p>
              {unavailableMeta && (
                <pre className="mt-3 overflow-x-auto rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface-2)]/70 p-3 text-xs shell-muted">
                  {unavailableMeta}
                </pre>
              )}
            </div>
          </div>
        ) : (
          <CanvasRuntimeErrorBoundary
            onError={(error, info) => {
              setCanvasRuntimeError(error.message || "Unknown canvas runtime error");
              console.error("[canvas] tldraw runtime error", error, info);
            }}
          >
            <Tldraw
              licenseKey={TLDRAW_LICENSE_KEY || undefined}
              shapeUtils={pumiShapeUtils}
              hideUi
              inferDarkMode={false}
              options={{ maxPages: 1 }}
              onMount={handleEditorMount}
            />
          </CanvasRuntimeErrorBoundary>
        )}
      </div>
    </div>
  );
}





