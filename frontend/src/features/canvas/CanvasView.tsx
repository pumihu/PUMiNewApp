import { useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent as ReactMouseEvent } from "react";
import { FilePlus2, GripVertical, LayoutGrid, Move, Plus, Sparkles, Trash2 } from "lucide-react";

import { CanvasBlockCard } from "./CanvasBlockCard";
import { UploadSourceDialog } from "@/features/documents/UploadSourceDialog";
import { useTranslation } from "@/hooks/useTranslation";
import { createBlock, deleteBlock, patchBlock } from "@/lib/api";
import type { CanvasBlock, BlockType } from "@/types/canvas";
import type { DocumentSummaryBundle } from "@/types/document";
import {
  MENTOR_MESSAGE_DND_MIME,
  type MentorCanvasCapturePayload,
  type MentorGeneratedBlock,
} from "@/types/mentor";
import type { Workspace } from "@/types/workspace";

type LayoutMode = "paint" | "board";
type InsertCategory = "core" | "research" | "visual" | "board";
type DragKind = "move" | "resize";

interface CanvasLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BoardSectionDef {
  blockId?: string;
  key: string;
  title: string;
  subtitle?: string;
  colorTheme?: string;
  defaultType: BlockType;
}

interface InsertBlockOption {
  type: BlockType;
  category: InsertCategory;
  labelEn: string;
  labelHu: string;
  descriptionEn: string;
  descriptionHu: string;
  modes?: Workspace["mode"][];
}

interface DragState {
  blockId: string;
  mode: DragKind;
  pointerX: number;
  pointerY: number;
  origin: CanvasLayout;
}

interface PlacedBlock {
  block: CanvasBlock;
  sectionKey: string;
  layout: CanvasLayout;
}

const BOARD_SECTION_THEMES = ["violet", "olive", "sky", "rose"] as const;
const BOARD_SECTION_THEME_CLASS: Record<string, string> = {
  violet: "border-t-violet-400/70",
  olive: "border-t-lime-500/60",
  sky: "border-t-sky-400/70",
  rose: "border-t-rose-400/70",
};

const INSERT_CATEGORY_META: Record<InsertCategory, { labelEn: string; labelHu: string }> = {
  core: { labelEn: "Core", labelHu: "Alap" },
  research: { labelEn: "Research", labelHu: "Forras" },
  visual: { labelEn: "Visual", labelHu: "Vizualis" },
  board: { labelEn: "Board", labelHu: "Board" },
};

const INSERT_BLOCK_OPTIONS: InsertBlockOption[] = [
  { type: "note", category: "core", labelEn: "Note", labelHu: "Jegyzet", descriptionEn: "Capture key thought and decisions.", descriptionHu: "Rogzitsd a lenyegi gondolatot es dontest." },
  { type: "task_list", category: "core", labelEn: "Task", labelHu: "Feladat", descriptionEn: "Actionable execution list.", descriptionHu: "Vegrehajthato feladatlista." },
  { type: "link", category: "research", labelEn: "Link", labelHu: "Link", descriptionEn: "Working web reference.", descriptionHu: "Hasznalhato webes referencia." },
  { type: "source", category: "research", labelEn: "Source", labelHu: "Forras", descriptionEn: "Source text for mentor context.", descriptionHu: "Forrasszoveg mentor kontextushoz." },
  { type: "pdf_reference", category: "research", labelEn: "PDF Reference", labelHu: "PDF referencia", descriptionEn: "Document citation with pages.", descriptionHu: "Dokumentum hivatkozas oldalakkal." },
  { type: "summary", category: "research", labelEn: "Summary", labelHu: "Osszegzes", descriptionEn: "Distilled understanding block.", descriptionHu: "Szerkesztett osszegzo blokk." },
  { type: "moodboard", category: "visual", labelEn: "Moodboard", labelHu: "Moodboard", descriptionEn: "Manual references and image collection.", descriptionHu: "Manualis referencia es kepgyujtemeny." },
  { type: "image", category: "visual", labelEn: "Image", labelHu: "Kep", descriptionEn: "Image block with intent and caption.", descriptionHu: "Kep blokk szandekkal es felirattal." },
  { type: "gif", category: "visual", labelEn: "GIF", labelHu: "GIF", descriptionEn: "Motion tone reference.", descriptionHu: "Mozgas-hangulat referencia." },
  { type: "sticker", category: "visual", labelEn: "Emoji / Sticker", labelHu: "Emoji / Sticker", descriptionEn: "Meaningful board signal marker.", descriptionHu: "Jelentest hordozo board marker." },
  { type: "reference_board", category: "board", labelEn: "Reference Board", labelHu: "Reference Board", descriptionEn: "Pinterest-style concept board (manual now).", descriptionHu: "Pinterest jellegu koncepcio board (manualis)." },
  { type: "storyboard", category: "visual", labelEn: "Storyboard", labelHu: "Storyboard", descriptionEn: "Scene layout planning.", descriptionHu: "Jelenetsor tervezes." },
  { type: "board_section", category: "board", labelEn: "Board Section", labelHu: "Board szekcio", descriptionEn: "Create a new board column.", descriptionHu: "Uj board oszlop letrehozasa." },
  { type: "goal", category: "core", labelEn: "Goal", labelHu: "Cel", descriptionEn: "Outcome and success criteria.", descriptionHu: "Eredmeny es sikerkriterium.", modes: ["build"] },
  { type: "roadmap", category: "core", labelEn: "Roadmap", labelHu: "Roadmap", descriptionEn: "Phase roadmap structure.", descriptionHu: "Fazis alapu roadmap szerkezet.", modes: ["build"] },
  { type: "lesson", category: "core", labelEn: "Lesson", labelHu: "Lecke", descriptionEn: "Structured explanation block.", descriptionHu: "Strukturalt magyarazo blokk.", modes: ["learn"] },
  { type: "quiz", category: "core", labelEn: "Quiz", labelHu: "Kviz", descriptionEn: "Practice check block.", descriptionHu: "Gyakorlo blokk.", modes: ["learn"] },
  { type: "flashcard", category: "core", labelEn: "Flashcards", labelHu: "Flashcardok", descriptionEn: "Recall cards for spaced practice.", descriptionHu: "Ismetlo kartya gyakorlasra.", modes: ["learn"] },
  { type: "brief", category: "core", labelEn: "Brief", labelHu: "Brief", descriptionEn: "Creative direction block.", descriptionHu: "Kreativ irany blokk.", modes: ["creative"] },
  { type: "image_generation", category: "visual", labelEn: "Image Generation", labelHu: "Kepgeneralas", descriptionEn: "Prepared media generation prompt block.", descriptionHu: "Elokeszitett media generalasi prompt blokk.", modes: ["creative"] },
];

const GRID_SNAP = 16;
const CANVAS_PADDING = 24;
const CANVAS_TOP = 72;
const MIN_BLOCK_WIDTH = 220;
const MIN_BLOCK_HEIGHT = 150;

function snap(value: number): number {
  return Math.round(value / GRID_SNAP) * GRID_SNAP;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

function inferDefaultBlockTypeByMode(mode: Workspace["mode"], sectionKey: string): BlockType {
  if (mode === "learn") {
    if (sectionKey.includes("source")) return "source";
    return "lesson";
  }
  if (mode === "creative") {
    if (sectionKey.includes("source")) return "source";
    if (sectionKey.includes("mood")) return "moodboard";
    return "brief";
  }
  if (sectionKey.includes("source")) return "source";
  if (sectionKey.includes("output")) return "critique";
  return "task_list";
}

function defaultBoardSections(mode: Workspace["mode"], locale: "en" | "hu"): BoardSectionDef[] {
  if (mode === "learn") {
    return [
      { key: "overview", title: locale === "hu" ? "Attekintes" : "Overview", subtitle: locale === "hu" ? "Tema alapjai" : "Topic foundations", colorTheme: "violet", defaultType: "lesson" },
      { key: "practice", title: locale === "hu" ? "Gyakorlas" : "Practice", subtitle: locale === "hu" ? "Kviz es gyakorlas" : "Quiz and practice", colorTheme: "sky", defaultType: "quiz" },
      { key: "sources", title: locale === "hu" ? "Forrasok" : "Sources", subtitle: locale === "hu" ? "Linkek es PDF-ek" : "Links and PDFs", colorTheme: "olive", defaultType: "pdf_reference" },
      { key: "output", title: "Output", subtitle: locale === "hu" ? "Osszegzes" : "Summary", colorTheme: "rose", defaultType: "summary" },
    ];
  }
  if (mode === "creative") {
    return [
      { key: "brief", title: "Brief", subtitle: locale === "hu" ? "Irany es cel" : "Direction and objective", colorTheme: "violet", defaultType: "brief" },
      { key: "references", title: locale === "hu" ? "Referenciak" : "References", subtitle: locale === "hu" ? "Reference board, link, PDF" : "Reference board, links, PDFs", colorTheme: "olive", defaultType: "reference_board" },
      { key: "mood", title: "Mood", subtitle: locale === "hu" ? "Moodboard, kep, GIF, sticker" : "Moodboard, image, GIF, sticker", colorTheme: "sky", defaultType: "moodboard" },
      { key: "output", title: "Output", subtitle: locale === "hu" ? "Storyboard es kimenet" : "Storyboard and outputs", colorTheme: "rose", defaultType: "storyboard" },
    ];
  }
  return [
    { key: "goal", title: locale === "hu" ? "Cel" : "Goal", subtitle: locale === "hu" ? "Mit viszunk elore?" : "What are we moving forward?", colorTheme: "violet", defaultType: "goal" },
    { key: "plan", title: locale === "hu" ? "Terv" : "Plan", subtitle: locale === "hu" ? "Feladatok es dontesek" : "Tasks and decisions", colorTheme: "olive", defaultType: "task_list" },
    { key: "sources", title: locale === "hu" ? "Forrasok" : "Sources", subtitle: locale === "hu" ? "Linkek es dokumentumok" : "Links and documents", colorTheme: "sky", defaultType: "link" },
    { key: "output", title: "Output", subtitle: locale === "hu" ? "Kimenet es review" : "Output and review", colorTheme: "rose", defaultType: "critique" },
  ];
}

function inferSectionKeyByType(type: BlockType): string {
  if (type === "source" || type === "summary" || type === "pdf_reference" || type === "link") return "sources";
  if (type === "task_list" || type === "quiz" || type === "flashcard" || type === "roadmap") return "plan";
  if (type === "reference_board") return "references";
  if (type === "brief" || type === "creative_brief") return "brief";
  if (type === "moodboard" || type === "image" || type === "gif" || type === "sticker") return "mood";
  if (type === "storyboard" || type === "image_asset" || type === "image_generation" || type === "copy" || type === "critique") return "output";
  return "ideas";
}

function resolveBlockSectionKey(block: CanvasBlock): string {
  const content = (block.content_json ?? {}) as { section_id?: string; section_key?: string; section?: string };
  if (typeof content.section_id === "string" && content.section_id.trim()) return content.section_id;
  if (typeof content.section_key === "string" && content.section_key.trim()) return content.section_key;
  if (typeof content.section === "string" && content.section.trim()) return content.section;
  return inferSectionKeyByType(block.type);
}

function normalizeBoardSectionDefs(blocks: CanvasBlock[], defaults: BoardSectionDef[]): BoardSectionDef[] {
  const sectionBlocks = blocks.filter((block) => block.type === "board_section").sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
  if (sectionBlocks.length === 0) return defaults;

  const defs: BoardSectionDef[] = [];
  const used = new Set<string>();
  for (const [index, block] of sectionBlocks.entries()) {
    const content = (block.content_json ?? {}) as { key?: string; subtitle?: string; color_theme?: string; default_type?: BlockType };
    const baseKey = content.key || slugify(block.title || "") || `section-${index + 1}`;
    let key = baseKey;
    let suffix = 2;
    while (used.has(key)) {
      key = `${baseKey}-${suffix}`;
      suffix += 1;
    }
    used.add(key);
    defs.push({
      blockId: block.id,
      key,
      title: block.title || `Section ${index + 1}`,
      subtitle: content.subtitle,
      colorTheme: content.color_theme,
      defaultType: content.default_type ?? defaults[Math.min(index, defaults.length - 1)]?.defaultType ?? "note",
    });
  }
  return defs;
}

function defaultContentForType(type: BlockType, sectionKey: string, locale: "en" | "hu"): Record<string, unknown> {
  const base = { section: sectionKey, section_key: sectionKey };
  if (type === "board_section") return { key: sectionKey || "section", subtitle: locale === "hu" ? "Rendezd ide a kapcsolodo blokkokat." : "Group related blocks here.", color_theme: "violet", default_type: "note" };
  if (type === "note") return { ...base, text: locale === "hu" ? "Rogzitsd a lenyeget." : "Capture the key point." };
  if (type === "task_list") return { ...base, tasks: [{ id: crypto.randomUUID(), text: locale === "hu" ? "Definiald az elso lepest." : "Define the first step.", done: false }] };
  if (type === "link") return { ...base, title: locale === "hu" ? "Referencia link" : "Reference link", url: "", summary: "", usage_note: "" };
  if (type === "source") return { ...base, name: locale === "hu" ? "Forras" : "Source", excerpt: "", source_type: "text" };
  if (type === "pdf_reference") return { ...base, title: locale === "hu" ? "PDF referencia" : "PDF reference", url: "", pages: "", excerpt: "", why_it_matters: "" };
  if (type === "summary") return { ...base, text: "", key_points: [] };
  if (type === "goal") return { ...base, goal: locale === "hu" ? "Mit akarsz konkretan elerni?" : "What concrete outcome do you want?", success_criteria: [] };
  if (type === "roadmap") return { ...base, phases: [] };
  if (type === "lesson") return { ...base, topic: "", explanation: "", key_points: [] };
  if (type === "quiz") return { ...base, questions: [] };
  if (type === "flashcard") return { ...base, cards: [] };
  if (type === "brief") return { ...base, objective: "", audience: "", tone: "", key_messages: [] };
  if (type === "moodboard") return { ...base, title: "Moodboard", direction: "", items: [] };
  if (type === "image") return { ...base, url: "", caption: "", intent: "" };
  if (type === "gif") return { ...base, url: "", purpose: "", placement_note: "" };
  if (type === "sticker") return { ...base, emoji: "*", label: locale === "hu" ? "Jeloles" : "Signal", meaning: "", action_signal: "" };
  if (type === "reference_board") return { ...base, board_title: "Reference board", objective: "", references: [], connector_targets: ["Pinterest", "YouTube", "Instagram", "Canva", "Calendar"] };
  if (type === "storyboard") return { ...base, scenes: [] };
  if (type === "image_generation") return { ...base, prompt: "", reference_input: "", generation_modes: ["text-to-image", "image-to-image", "text-to-video", "image-to-video"], selected_mode: "text-to-image", status: locale === "hu" ? "Elokeszitett blokk. A futtatas meg nincs bekotve." : "Prepared block. Execution is not wired yet.", output_preview_url: "" };
  return base;
}

function sizeForType(type: BlockType): { width: number; height: number } {
  if (type === "ai_sticky") return { width: 260, height: 190 };
  if (type === "task_list" || type === "quiz") return { width: 320, height: 250 };
  if (type === "moodboard" || type === "reference_board" || type === "storyboard") return { width: 360, height: 290 };
  if (type === "image_generation") return { width: 380, height: 300 };
  if (type === "source" || type === "summary") return { width: 340, height: 250 };
  return { width: 310, height: 230 };
}

function readLayout(contentJson: unknown): CanvasLayout | null {
  if (!contentJson || typeof contentJson !== "object") return null;
  const layout = (contentJson as { layout?: unknown }).layout;
  if (!layout || typeof layout !== "object") return null;
  const value = layout as { x?: unknown; y?: unknown; width?: unknown; height?: unknown };
  if (typeof value.x !== "number" || typeof value.y !== "number" || typeof value.width !== "number" || typeof value.height !== "number") return null;
  return { x: value.x, y: value.y, width: value.width, height: value.height };
}

function clampLayout(layout: CanvasLayout, canvasWidth: number): CanvasLayout {
  const safeWidth = Math.max(MIN_BLOCK_WIDTH, Math.min(layout.width, canvasWidth - CANVAS_PADDING * 2));
  const safeHeight = Math.max(MIN_BLOCK_HEIGHT, Math.min(layout.height, 760));
  const maxX = Math.max(CANVAS_PADDING, canvasWidth - safeWidth - CANVAS_PADDING);
  return {
    x: Math.max(CANVAS_PADDING, Math.min(layout.x, maxX)),
    y: Math.max(CANVAS_TOP, Math.min(layout.y, 2800)),
    width: safeWidth,
    height: safeHeight,
  };
}

interface Props {
  workspace: Workspace;
  blocks: CanvasBlock[];
  selectedBlockIds: string[];
  onBlocksChange: (blocks: CanvasBlock[]) => void;
  onToggleSelect: (id: string) => void;
  onCaptureMentorMessage?: (payload: MentorCanvasCapturePayload) => Promise<void> | void;
}

export function CanvasView({ workspace, blocks, selectedBlockIds, onBlocksChange, onToggleSelect, onCaptureMentorMessage }: Props) {
  const { t, lang } = useTranslation();
  const locale: "en" | "hu" = lang === "hu" ? "hu" : "en";
  const isHu = locale === "hu";

  const [layoutMode, setLayoutMode] = useState<LayoutMode>("paint");
  const [showInsertPanel, setShowInsertPanel] = useState(false);
  const [showSourceDialog, setShowSourceDialog] = useState(false);
  const [adding, setAdding] = useState(false);
  const [mentorDropActive, setMentorDropActive] = useState(false);
  const [dropPreview, setDropPreview] = useState<CanvasLayout | null>(null);
  const [draftLayouts, setDraftLayouts] = useState<Record<string, CanvasLayout>>({});
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(1180);

  const dragDepthRef = useRef(0);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const blocksRef = useRef(blocks);
  const draftLayoutsRef = useRef(draftLayouts);
  const storageKey = `pumi_v2_layout_mode_${workspace.id}`;

  useEffect(() => { blocksRef.current = blocks; }, [blocks]);
  useEffect(() => { draftLayoutsRef.current = draftLayouts; }, [draftLayouts]);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored === "paint" || stored === "board") {
      setLayoutMode(stored);
      return;
    }
    setLayoutMode("paint");
  }, [storageKey]);

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = Math.floor(entry.contentRect.width);
      if (width > 0) setCanvasWidth(width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [layoutMode]);

  const defaultSections = useMemo(() => defaultBoardSections(workspace.mode, locale), [workspace.mode, locale]);
  const boardSections = useMemo(() => normalizeBoardSectionDefs(blocks, defaultSections), [blocks, defaultSections]);
  const nonSectionBlocks = useMemo(() => blocks.filter((block) => block.type !== "board_section"), [blocks]);

  const sectionIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const [index, section] of boardSections.entries()) map.set(section.key, index);
    return map;
  }, [boardSections]);

  const laneWidth = useMemo(() => {
    const safeWidth = Math.max(canvasWidth, 980);
    const count = Math.max(1, boardSections.length);
    return Math.max(220, Math.floor((safeWidth - CANVAS_PADDING * 2) / count));
  }, [canvasWidth, boardSections.length]);

  const sectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const block of nonSectionBlocks) {
      const key = resolveBlockSectionKey(block);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [nonSectionBlocks]);

  const availableInsertOptions = useMemo(() => INSERT_BLOCK_OPTIONS.filter((item) => !item.modes || item.modes.includes(workspace.mode)), [workspace.mode]);
  const groupedInsertOptions = useMemo(() => {
    const map = new Map<InsertCategory, InsertBlockOption[]>();
    for (const option of availableInsertOptions) {
      const list = map.get(option.category) ?? [];
      list.push(option);
      map.set(option.category, list);
    }
    return map;
  }, [availableInsertOptions]);

  const groupedBySection = useMemo(() => {
    const map = new Map<string, CanvasBlock[]>();
    for (const section of boardSections) map.set(section.key, []);
    const fallbackKey = boardSections[0]?.key ?? defaultSections[0].key;

    for (const block of nonSectionBlocks) {
      const targetKey = resolveBlockSectionKey(block);
      const list = map.get(targetKey) ?? map.get(fallbackKey);
      if (list) list.push(block);
    }

    for (const [key, values] of map.entries()) {
      map.set(key, values.sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at)));
    }

    return map;
  }, [boardSections, defaultSections, nonSectionBlocks]);

  const nextPosition = useMemo(() => (blocks.length === 0 ? 0 : Math.max(...blocks.map((block) => block.position)) + 1), [blocks]);

  const buildPlacementLayout = (type: BlockType, sectionKey: string, offset = 0): CanvasLayout => {
    const sectionIndex = Math.max(0, sectionIndexMap.get(sectionKey) ?? 0);
    const inSection = (sectionCounts.get(sectionKey) ?? 0) + offset;
    const size = sizeForType(type);

    return clampLayout(
      {
        x: snap(CANVAS_PADDING + sectionIndex * laneWidth + 14 + (inSection % 2) * 12),
        y: snap(CANVAS_TOP + Math.floor(inSection / 2) * (size.height + 26) + (inSection % 2) * 10),
        width: size.width,
        height: size.height,
      },
      Math.max(canvasWidth, 980),
    );
  };

  const placedBlocks = useMemo<PlacedBlock[]>(() => {
    const sorted = [...nonSectionBlocks].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
    const running = new Map<string, number>();
    const safeWidth = Math.max(canvasWidth, 980);

    return sorted.map((block) => {
      const sectionKey = resolveBlockSectionKey(block);
      const stackIndex = running.get(sectionKey) ?? 0;
      running.set(sectionKey, stackIndex + 1);
      const persisted = readLayout(block.content_json);
      const draft = draftLayouts[block.id];
      const fallback = buildPlacementLayout(block.type, sectionKey, stackIndex);
      return {
        block,
        sectionKey,
        layout: clampLayout(draft ?? persisted ?? fallback, safeWidth),
      };
    });
  }, [nonSectionBlocks, draftLayouts, canvasWidth, laneWidth]);

  const placedById = useMemo(() => {
    const map = new Map<string, PlacedBlock>();
    for (const entry of placedBlocks) map.set(entry.block.id, entry);
    return map;
  }, [placedBlocks]);

  const surfaceHeight = useMemo(() => {
    let bottom = 780;
    for (const placed of placedBlocks) bottom = Math.max(bottom, placed.layout.y + placed.layout.height + 84);
    return Math.min(3600, bottom);
  }, [placedBlocks]);

  const persistLayoutMode = (mode: LayoutMode) => {
    setLayoutMode(mode);
    localStorage.setItem(storageKey, mode);
  };

  const inferSectionByX = (x: number): string => {
    const safeX = Math.max(CANVAS_PADDING, x);
    const index = Math.max(0, Math.min(boardSections.length - 1, Math.floor((safeX - CANVAS_PADDING) / laneWidth)));
    return boardSections[index]?.key ?? boardSections[0]?.key ?? defaultSections[0].key;
  };

  const persistBlockLayout = async (blockId: string, layout: CanvasLayout) => {
    const target = blocksRef.current.find((block) => block.id === blockId);
    if (!target) return;

    const content = (target.content_json ?? {}) as Record<string, unknown>;
    try {
      const updated = await patchBlock(blockId, { content_json: { ...content, layout } });
      const next = blocksRef.current.map((block) => (block.id === updated.id ? updated : block));
      blocksRef.current = next;
      onBlocksChange(next);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAdd = async (type: BlockType, sectionKey?: string, placementOffset = 0) => {
    setShowInsertPanel(false);
    setAdding(true);

    try {
      if (type === "board_section") {
        const idx = blocks.filter((block) => block.type === "board_section").length + 1;
        const key = `section-${idx}`;
        const theme = BOARD_SECTION_THEMES[(idx - 1) % BOARD_SECTION_THEMES.length];
        const block = await createBlock({
          workspace_id: workspace.id,
          type: "board_section",
          title: isHu ? `Szekcio ${idx}` : `Section ${idx}`,
          content_json: {
            key,
            subtitle: isHu ? "Rendezd ide a kapcsolodo blokkokat." : "Group related blocks under this section.",
            color_theme: theme,
            default_type: inferDefaultBlockTypeByMode(workspace.mode, key),
          },
          position: nextPosition,
        });
        onBlocksChange([...blocks, block]);
        persistLayoutMode("board");
        return;
      }

      const targetSection = sectionKey || boardSections[0]?.key || defaultSections[0].key;
      const content = defaultContentForType(type, targetSection, locale);
      const contentWithLayout =
        layoutMode === "paint"
          ? { ...content, layout: buildPlacementLayout(type, targetSection, placementOffset) }
          : content;

      const block = await createBlock({
        workspace_id: workspace.id,
        type,
        content_json: contentWithLayout,
        position: nextPosition,
      });
      onBlocksChange([...blocks, block]);
    } catch (error) {
      console.error(error);
    } finally {
      setAdding(false);
    }
  };

  const handleSourceCompleted = (result: DocumentSummaryBundle) => {
    const targetSection = boardSections.find((section) => section.key === "sources")?.key ?? boardSections[0]?.key ?? "sources";

    const sourceBlock: CanvasBlock = {
      ...result.source_block,
      content_json: {
        ...(result.source_block.content_json ?? {}),
        section: targetSection,
        section_key: targetSection,
        ...(layoutMode === "paint" ? { layout: buildPlacementLayout("source", targetSection, 0) } : {}),
      },
    };

    const summaryBlock: CanvasBlock = {
      ...result.summary_block,
      content_json: {
        ...(result.summary_block.content_json ?? {}),
        section: targetSection,
        section_key: targetSection,
        ...(layoutMode === "paint" ? { layout: buildPlacementLayout("summary", targetSection, 1) } : {}),
      },
    };

    const byId = new Map<string, CanvasBlock>();
    for (const block of blocks) byId.set(block.id, block);
    byId.set(sourceBlock.id, sourceBlock);
    byId.set(summaryBlock.id, summaryBlock);

    onBlocksChange([...byId.values()].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at)));
  };

  const handleDeleteSection = async (sectionBlockId?: string) => {
    if (!sectionBlockId) return;
    try {
      await deleteBlock(sectionBlockId);
      onBlocksChange(blocks.filter((block) => block.id !== sectionBlockId));
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdate = (updated: CanvasBlock) => {
    onBlocksChange(blocks.map((block) => (block.id === updated.id ? updated : block)));
  };

  const handleDelete = (id: string) => {
    onBlocksChange(blocks.filter((block) => block.id !== id));
  };

  const hasMentorPayloadType = (event: DragEvent<HTMLElement>) => Array.from(event.dataTransfer.types).includes(MENTOR_MESSAGE_DND_MIME);

  const parseMentorPayload = (event: DragEvent<HTMLElement>): Omit<MentorCanvasCapturePayload, "action_type"> | null => {
    const raw = event.dataTransfer.getData(MENTOR_MESSAGE_DND_MIME);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { source_message_id?: string; text?: string; generated_block?: MentorGeneratedBlock };
      if (!parsed.source_message_id || !parsed.text) return null;
      return { source_message_id: parsed.source_message_id, text: parsed.text, generated_block: parsed.generated_block };
    } catch {
      return null;
    }
  };

  const mentorLayoutForPointer = (event: DragEvent<HTMLDivElement>, type: BlockType): CanvasLayout => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const width = Math.max(canvasWidth, 980);
    const size = sizeForType(type);
    return clampLayout(
      {
        x: snap((rect ? event.clientX - rect.left : CANVAS_PADDING) - size.width / 2),
        y: snap((rect ? event.clientY - rect.top : CANVAS_TOP) - 32),
        width: size.width,
        height: size.height,
      },
      width,
    );
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
    const payload = parseMentorPayload(event);
    const type = payload?.generated_block?.block_type ?? "ai_sticky";
    setDropPreview(mentorLayoutForPointer(event, type));
  };

  const handleMentorDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!mentorDropActive && !hasMentorPayloadType(event)) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setMentorDropActive(false);
      setDropPreview(null);
    }
  };

  const handleMentorDrop = async (event: DragEvent<HTMLDivElement>) => {
    if (!mentorDropActive && !hasMentorPayloadType(event)) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setMentorDropActive(false);

    const payload = parseMentorPayload(event);
    if (!payload || !onCaptureMentorMessage) {
      setDropPreview(null);
      return;
    }

    const type = payload.generated_block?.block_type ?? "ai_sticky";
    const layout = mentorLayoutForPointer(event, type);
    setDropPreview(null);

    await onCaptureMentorMessage({
      ...payload,
      action_type: "drag",
      target_layout: layout,
      target_section_key: inferSectionByX(layout.x),
    });
  };

  const startBlockTransform = (event: ReactMouseEvent<HTMLButtonElement>, blockId: string, mode: DragKind) => {
    const placed = placedById.get(blockId);
    if (!placed) return;
    event.preventDefault();
    event.stopPropagation();
    setDragState({ blockId, mode, pointerX: event.clientX, pointerY: event.clientY, origin: placed.layout });
  };

  useEffect(() => {
    if (!dragState) return;

    const onMouseMove = (event: MouseEvent) => {
      const dx = snap(event.clientX - dragState.pointerX);
      const dy = snap(event.clientY - dragState.pointerY);

      let next: CanvasLayout;
      if (dragState.mode === "move") {
        next = { ...dragState.origin, x: dragState.origin.x + dx, y: dragState.origin.y + dy };
      } else {
        next = { ...dragState.origin, width: dragState.origin.width + dx, height: dragState.origin.height + dy };
      }

      setDraftLayouts((previous) => ({
        ...previous,
        [dragState.blockId]: clampLayout(next, Math.max(canvasWidth, 980)),
      }));
    };

    const onMouseUp = () => {
      const finalLayout = draftLayoutsRef.current[dragState.blockId] ?? dragState.origin;
      void persistBlockLayout(dragState.blockId, finalLayout);

      setDraftLayouts((previous) => {
        const next = { ...previous };
        delete next[dragState.blockId];
        return next;
      });
      setDragState(null);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp, { once: true });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragState, canvasWidth]);

  const renderSectionColumn = (section: BoardSectionDef) => {
    const sectionBlocks = groupedBySection.get(section.key) ?? [];
    const themeClass = BOARD_SECTION_THEME_CLASS[section.colorTheme ?? ""] ?? "border-t-[var(--shell-accent)]/60";

    return (
      <section key={section.key} className={`rounded-2xl shell-panel p-4 md:p-5 space-y-4 border-t-2 ${themeClass}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold tracking-wide">{section.title}</h3>
            {section.subtitle && <p className="text-xs shell-muted mt-1">{section.subtitle}</p>}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => void handleAdd(section.defaultType, section.key)} className="inline-flex items-center gap-1 rounded-lg border shell-surface-2 px-2 py-1 text-[11px] shell-muted hover:text-[var(--shell-text)] shell-interactive">
              <Plus className="h-3 w-3" />
              {isHu ? "Blokk" : "Block"}
            </button>
            {section.blockId && (
              <button onClick={() => void handleDeleteSection(section.blockId)} className="inline-flex items-center rounded-lg border shell-surface-2 px-1.5 py-1 text-[11px] shell-muted hover:text-red-400 shell-interactive" title={isHu ? "Szekcio torlese" : "Delete section"}>
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {sectionBlocks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--shell-border)]/80 bg-[var(--shell-surface-2)]/70 px-4 py-6 text-xs shell-muted leading-relaxed">
            {isHu ? "Ez a szekcio meg ures. Adj hozza blokkot vagy kerd a mentort." : "This section is empty. Add a block or ask your mentor."}
          </div>
        ) : (
          <div className="space-y-3">
            {sectionBlocks.map((block) => (
              <CanvasBlockCard key={block.id} block={block} selected={selectedBlockIds.includes(block.id)} onToggleSelect={onToggleSelect} onUpdate={handleUpdate} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </section>
    );
  };

  const dropHint = isHu ? "Dobd ide, es mentem a mentor blokkot a board feluletre." : "Drop here and I will save this mentor block onto your board surface.";

  return (
    <div className="relative p-6 md:p-7 max-w-[1500px] mx-auto space-y-4">
      <div className="rounded-2xl shell-panel p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] shell-muted">Workspace Paint v1</p>
            <h2 className="text-lg font-semibold mt-1">{workspace.title}</h2>
            <p className="text-sm shell-muted mt-1">
              {layoutMode === "paint"
                ? isHu
                  ? "Szabadabban rendezheto board felulet, finom snap igazitasokkal."
                  : "Freer board surface with soft snap alignment."
                : isHu
                  ? "Strukturalt board nezet oszlopokkal."
                  : "Structured board view with grouped columns."}
            </p>
          </div>

          <div className="inline-flex items-center rounded-lg border shell-surface-2 p-0.5">
            <button onClick={() => persistLayoutMode("paint")} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs ${layoutMode === "paint" ? "bg-[var(--shell-accent-soft)] text-[var(--shell-text)]" : "shell-muted"}`}>
              <Move className="h-3 w-3" />
              Paint
            </button>
            <button onClick={() => persistLayoutMode("board")} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs ${layoutMode === "board" ? "bg-[var(--shell-accent-soft)] text-[var(--shell-text)]" : "shell-muted"}`}>
              <LayoutGrid className="h-3 w-3" />
              Board
            </button>
          </div>
        </div>
      </div>

      {showSourceDialog && <UploadSourceDialog workspaceId={workspace.id} locale={locale} onCompleted={handleSourceCompleted} onClose={() => setShowSourceDialog(false)} />}

      <div className={`relative rounded-3xl border border-[var(--shell-border)]/85 shell-panel overflow-hidden transition ${mentorDropActive ? "ring-2 ring-[var(--shell-accent)]/65 shell-drop-active" : ""}`} onDragEnter={handleMentorDragEnter} onDragOver={handleMentorDragOver} onDragLeave={handleMentorDragLeave} onDrop={handleMentorDrop}>
        {mentorDropActive && (
          <div className="pointer-events-none absolute top-4 left-4 z-30 rounded-xl border border-dashed border-[var(--shell-accent)] bg-[var(--shell-accent-soft)] px-4 py-2.5 text-sm inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {dropHint}
          </div>
        )}

        {layoutMode === "paint" ? (
          <div ref={canvasRef} className="relative" style={{ minHeight: `${surfaceHeight}px`, background: "radial-gradient(circle at 8% -5%, rgba(255,255,255,0.18), transparent 26%), linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))" }}>
            <div className="absolute inset-0 opacity-[0.22] pointer-events-none" style={{ backgroundSize: `${GRID_SNAP}px ${GRID_SNAP}px`, backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)" }} />
            <div className="absolute inset-x-0 top-0 h-[56px] border-b border-[var(--shell-border)]/55 bg-[var(--shell-surface)]/40 backdrop-blur-sm" />

            {boardSections.map((section, index) => {
              const left = CANVAS_PADDING + index * laneWidth;
              const width = Math.max(180, laneWidth - 10);
              return (
                <div key={section.key} className="absolute top-0 bottom-0 pointer-events-none" style={{ left, width }}>
                  <div className="absolute top-0 left-0 right-0 px-2 py-2.5">
                    <p className="text-[11px] uppercase tracking-[0.14em] shell-muted">{section.title}</p>
                    {section.subtitle && <p className="text-[11px] shell-muted mt-0.5">{section.subtitle}</p>}
                  </div>
                  <div className="absolute top-[58px] bottom-4 left-0 right-0 rounded-2xl border border-dashed border-[var(--shell-border)]/35 bg-[var(--shell-surface-2)]/22" />
                </div>
              );
            })}

            {placedBlocks.map((placed) => (
              <div key={placed.block.id} className={`absolute z-10 ${selectedBlockIds.includes(placed.block.id) ? "z-20" : ""}`} style={{ left: `${placed.layout.x}px`, top: `${placed.layout.y}px`, width: `${placed.layout.width}px`, minHeight: `${placed.layout.height}px` }}>
                <div className="absolute -top-3 left-3 z-20 flex items-center gap-1.5">
                  <button onMouseDown={(event) => startBlockTransform(event, placed.block.id, "move")} className="h-6 inline-flex items-center gap-1 rounded-md border border-[var(--shell-border)]/70 bg-[var(--shell-surface)]/85 px-2 text-[11px] shell-muted hover:text-[var(--shell-text)] shell-interactive cursor-move" title={isHu ? "Blokk mozgatasa" : "Move block"}>
                    <GripVertical className="h-3 w-3" />
                    {isHu ? "Mozgat" : "Move"}
                  </button>
                </div>

                <CanvasBlockCard block={placed.block} selected={selectedBlockIds.includes(placed.block.id)} onToggleSelect={onToggleSelect} onUpdate={handleUpdate} onDelete={handleDelete} className="h-full" />

                <button onMouseDown={(event) => startBlockTransform(event, placed.block.id, "resize")} className="absolute -bottom-2 -right-2 h-5 w-5 rounded-md border border-[var(--shell-border)]/70 bg-[var(--shell-surface)]/85 text-[10px] shell-muted hover:text-[var(--shell-text)] shell-interactive cursor-se-resize" title={isHu ? "Meret modositasa" : "Resize block"}>+</button>
              </div>
            ))}

            {dropPreview && <div className="absolute z-30 rounded-2xl border border-dashed border-[var(--shell-accent)] bg-[var(--shell-accent-soft)]/45 pointer-events-none" style={{ left: `${dropPreview.x}px`, top: `${dropPreview.y}px`, width: `${dropPreview.width}px`, height: `${dropPreview.height}px` }} />}
          </div>
        ) : (
          <div className="p-5 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4">{boardSections.map(renderSectionColumn)}</div>
          </div>
        )}

        <div className="absolute left-4 bottom-4 z-40">
          <div className="relative">
            <button onClick={() => setShowInsertPanel((value) => !value)} disabled={adding} className="h-11 inline-flex items-center gap-2 rounded-xl border shell-surface-2 px-3.5 text-sm text-[var(--shell-text)] shell-interactive shadow-lg">
              <Plus className="h-4 w-4" />
              {adding ? (isHu ? "Hozzaadas..." : "Adding...") : isHu ? "Insert blokk" : "Insert block"}
            </button>

            {showInsertPanel && (
              <div className="absolute left-0 bottom-full mb-2 z-50 w-[440px] max-w-[94vw] rounded-2xl border shell-panel p-3 shadow-2xl space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium">{isHu ? "Block insert" : "Block insert"}</p>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setShowSourceDialog(true)} className="inline-flex items-center gap-1.5 rounded-lg border shell-surface-2 px-2 py-1 text-[11px] shell-muted hover:text-[var(--shell-text)] shell-interactive">
                      <FilePlus2 className="h-3.5 w-3.5" />
                      {t("uploadSource")}
                    </button>
                    <button onClick={() => void handleAdd("board_section")} className="inline-flex items-center gap-1.5 rounded-lg border shell-surface-2 px-2 py-1 text-[11px] shell-muted hover:text-[var(--shell-text)] shell-interactive">
                      <LayoutGrid className="h-3.5 w-3.5" />
                      {isHu ? "Szekcio" : "Section"}
                    </button>
                  </div>
                </div>

                {(["core", "research", "visual", "board"] as InsertCategory[]).map((category) => {
                  const options = groupedInsertOptions.get(category) ?? [];
                  if (options.length === 0) return null;
                  const title = isHu ? INSERT_CATEGORY_META[category].labelHu : INSERT_CATEGORY_META[category].labelEn;

                  return (
                    <div key={category} className="space-y-1.5">
                      <p className="text-[11px] uppercase tracking-[0.12em] shell-muted">{title}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                        {options.map((item) => {
                          const targetSection = boardSections.find((section) => section.defaultType === item.type)?.key ?? boardSections[0]?.key ?? defaultSections[0].key;

                          return (
                            <button key={`${category}-${item.type}`} onClick={() => void handleAdd(item.type, targetSection)} className="w-full rounded-lg border shell-surface-2 px-2.5 py-2 text-left shell-interactive hover:bg-[var(--shell-accent-soft)]">
                              <p className="text-xs text-[var(--shell-text)]">{isHu ? item.labelHu : item.labelEn}</p>
                              <p className="text-[11px] shell-muted mt-0.5">{isHu ? item.descriptionHu : item.descriptionEn}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
