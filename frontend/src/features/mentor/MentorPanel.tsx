import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Compass, Sparkles } from "lucide-react";

import { MentorComposer } from "./MentorComposer";
import { MentorMessageList } from "./MentorMessageList";
import { useTranslation } from "@/hooks/useTranslation";
import { mentorChat } from "@/lib/api";
import type { CanvasBlock } from "@/types/canvas";
import type {
  MentorCanvasCapturePayload,
  MentorGeneratedBlock,
  MentorMessage,
  SuggestedAction,
} from "@/types/mentor";
import type { Workspace } from "@/types/workspace";

interface Props {
  workspace: Workspace;
  blocks: CanvasBlock[];
  selectedBlockIds: string[];
  initialWelcomeMessage?: string;
  initialWelcomeActions?: SuggestedAction[];
  onCaptureMentorMessage?: (payload: MentorCanvasCapturePayload) => Promise<void> | void;
}

const MENTOR_SESSION_STORAGE_PREFIX = "pumi_mentor_session_v2";
const MENTOR_SESSION_MAX_MESSAGES = 180;

function mentorSessionStorageKey(workspaceId: string): string {
  return `${MENTOR_SESSION_STORAGE_PREFIX}:${workspaceId}`;
}

function normalizeMentorMessage(raw: unknown): MentorMessage | null {
  if (!raw || typeof raw !== "object") return null;

  const candidate = raw as Partial<MentorMessage>;
  if (candidate.role !== "user" && candidate.role !== "assistant") return null;
  if (typeof candidate.id !== "string" || !candidate.id) return null;
  if (typeof candidate.text !== "string") return null;

  const timestamp =
    typeof candidate.timestamp === "number" && Number.isFinite(candidate.timestamp)
      ? candidate.timestamp
      : Date.now();

  const suggested_actions = Array.isArray(candidate.suggested_actions)
    ? candidate.suggested_actions.filter(
        (item): item is SuggestedAction =>
          !!item &&
          typeof item === "object" &&
          typeof (item as SuggestedAction).label === "string" &&
          typeof (item as SuggestedAction).action === "string",
      )
    : undefined;

  const generated_blocks = Array.isArray(candidate.generated_blocks)
    ? candidate.generated_blocks.filter(
        (item): item is MentorGeneratedBlock =>
          !!item &&
          typeof item === "object" &&
          typeof (item as MentorGeneratedBlock).block_type === "string",
      )
    : undefined;

  return {
    id: candidate.id,
    role: candidate.role,
    text: candidate.text,
    timestamp,
    suggested_actions,
    generated_blocks,
  };
}

function loadMentorSession(workspaceId: string): MentorMessage[] {
  try {
    const raw = localStorage.getItem(mentorSessionStorageKey(workspaceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const normalized = parsed
      .map(normalizeMentorMessage)
      .filter((item): item is MentorMessage => item !== null);

    const byId = new Map<string, MentorMessage>();
    for (const message of normalized) {
      byId.set(message.id, message);
    }

    return [...byId.values()]
      .sort((left, right) => left.timestamp - right.timestamp)
      .slice(-MENTOR_SESSION_MAX_MESSAGES);
  } catch (error) {
    console.warn("[mentor] failed to load persisted session", error);
    return [];
  }
}

function includesAny(input: string, terms: string[]): boolean {
  return terms.some((term) => input.includes(term));
}

function inferFallbackGeneratedBlocks(
  message: string,
  mode: Workspace["mode"],
  locale: "en" | "hu",
): MentorGeneratedBlock[] {
  const normalized = message.toLowerCase();
  const seed = message.trim().slice(0, 220);
  const isHu = locale === "hu";

  const boardRequest = includesAny(normalized, [
    "board",
    "visual lesson board",
    "classroom summary board",
    "study board",
    "4 section",
    "4-section",
    "organize this into",
    "tabla",
    "tábla",
  ]);
  const boardSpecificBlockRequest = includesAny(normalized, [
    "moodboard",
    "mood board",
    "reference board",
    "gif block",
    "sticker block",
    "link block",
    "pdf reference",
  ]);

  if (boardRequest && !boardSpecificBlockRequest) {
    const sections =
      mode === "learn"
        ? [
            { key: "overview", titleEn: "Overview", titleHu: "Áttekintés", subtitleEn: "Topic and understanding", subtitleHu: "Téma és megértés", defaultType: "lesson", colorTheme: "violet" },
            { key: "practice", titleEn: "Practice", titleHu: "Gyakorlás", subtitleEn: "Quiz and recall", subtitleHu: "Kvíz és visszahívás", defaultType: "quiz", colorTheme: "olive" },
            { key: "sources", titleEn: "Sources", titleHu: "Források", subtitleEn: "Learning materials", subtitleHu: "Tanulási anyagok", defaultType: "source", colorTheme: "sky" },
            { key: "output", titleEn: "Output", titleHu: "Output", subtitleEn: "Summary and key concepts", subtitleHu: "Összegzés és kulcsfogalmak", defaultType: "summary", colorTheme: "rose" },
          ]
        : mode === "creative"
          ? [
              { key: "brief", titleEn: "Brief", titleHu: "Brief", subtitleEn: "Objective and audience", subtitleHu: "Cél és közönség", defaultType: "brief", colorTheme: "violet" },
              { key: "references", titleEn: "References", titleHu: "Referenciák", subtitleEn: "Reference board", subtitleHu: "Referencia board", defaultType: "reference_board", colorTheme: "olive" },
              { key: "mood", titleEn: "Concepts", titleHu: "Koncepciók", subtitleEn: "Mood and direction", subtitleHu: "Hangulat és irány", defaultType: "moodboard", colorTheme: "sky" },
              { key: "output", titleEn: "Output", titleHu: "Output", subtitleEn: "Storyboard and media", subtitleHu: "Storyboard és média", defaultType: "storyboard", colorTheme: "rose" },
            ]
          : [
              { key: "goal", titleEn: "Goal", titleHu: "Cél", subtitleEn: "Outcome and constraints", subtitleHu: "Eredmény és korlátok", defaultType: "goal", colorTheme: "violet" },
              { key: "plan", titleEn: "Plan", titleHu: "Terv", subtitleEn: "Steps and execution", subtitleHu: "Lépések és végrehajtás", defaultType: "task_list", colorTheme: "olive" },
              { key: "sources", titleEn: "Resources", titleHu: "Erőforrások", subtitleEn: "Links and references", subtitleHu: "Linkek és referenciák", defaultType: "link", colorTheme: "sky" },
              { key: "output", titleEn: "Output", titleHu: "Output", subtitleEn: "Review and critique", subtitleHu: "Review és kritika", defaultType: "critique", colorTheme: "rose" },
            ];

    return sections.map((section) => ({
      block_type: "board_section",
      title: isHu ? section.titleHu : section.titleEn,
      reason: isHu ? "Mentor által előkészített board szekció." : "Mentor-prepared board section.",
      content_json: {
        key: section.key,
        subtitle: isHu ? section.subtitleHu : section.subtitleEn,
        color_theme: section.colorTheme,
        default_type: section.defaultType,
      },
    }));
  }

  const timelineRequested = includesAny(normalized, ["timeline", "chronology", "idovonal"]);
  const comparisonRequested = includesAny(normalized, ["comparison", "compare", "osszehasonlit"]);

  let blockType: MentorGeneratedBlock["block_type"] | null = null;
  if (includesAny(normalized, ["moodboard", "mood board", "inspiration board"])) blockType = "moodboard";
  else if (includesAny(normalized, ["reference board", "pinterest-style board", "resource board"])) blockType = "reference_board";
  else if (includesAny(normalized, ["gif", "gif block"])) blockType = "gif";
  else if (includesAny(normalized, ["sticker", "emoji marker", "emoji block"])) blockType = "sticker";
  else if (includesAny(normalized, ["link block", "resource link", "insert link", "add link"])) blockType = "link";
  else if (includesAny(normalized, ["pdf reference", "pdf block", "document reference", "citation block"])) blockType = "pdf_reference";
  else if (includesAny(normalized, ["source block", "source material", "forras blokk"])) blockType = "source";
  else if (includesAny(normalized, ["quiz", "kvíz", "kviz", "teszt"])) blockType = "quiz";
  else if (includesAny(normalized, ["flashcard", "kártya", "kartya"])) blockType = "flashcard";
  else if (includesAny(normalized, ["lesson", "explain", "simplify", "magyará", "magyaraz", "taníts", "tanits"])) blockType = "lesson";
  else if (includesAny(normalized, ["summary", "summarize", "key concept", "összefoglal", "osszefoglal"])) blockType = "summary";
  else if (includesAny(normalized, ["task", "todo", "to-do", "feladat", "teend"])) blockType = "task_list";
  else if (includesAny(normalized, ["roadmap", "milestone", "ütemterv", "utemterv"])) blockType = "roadmap";
  else if (includesAny(normalized, ["goal", "objective", "cél", "cel"])) blockType = "goal";
  else if (includesAny(normalized, ["critique", "feedback", "review", "kritika"])) blockType = "critique";
  else if (includesAny(normalized, ["storyboard", "scene", "jelenet"])) blockType = "storyboard";
  else if (includesAny(normalized, ["image generation", "generate image", "text-to-image", "kép", "kep"])) blockType = "image_generation";
  else if (includesAny(normalized, ["copy", "headline", "caption", "tagline", "szöveg", "szoveg"])) blockType = "copy";
  else if (includesAny(normalized, ["brief", "creative direction"])) blockType = "brief";

  if (!blockType) {
    const hasCreateIntent = includesAny(normalized, [
      "create",
      "make",
      "generate",
      "build",
      "turn this into",
      "készíts",
      "keszits",
      "alakítsd",
      "alakitsd",
    ]);
    if (!hasCreateIntent) return [];
    blockType = mode === "learn" ? "lesson" : mode === "creative" ? "brief" : "task_list";
  }

  if (blockType === "source") {
    return [
      {
        block_type: "source",
        title: isHu ? "Tanulasi forras" : "Study Source",
        reason: isHu ? "Mentor altal javasolt forras blokk." : "Mentor-suggested source block.",
        content_json: {
          section: "sources",
          name: isHu ? "Forras" : "Source",
          excerpt: seed,
          source_type: "text",
        },
      },
    ];
  }

  if (blockType === "summary") {
    return [
      {
        block_type: "summary",
        title: timelineRequested
          ? isHu ? "Idovonal osszegzes" : "Timeline Summary"
          : comparisonRequested
            ? isHu ? "Osszehasonlito osszegzes" : "Comparison Summary"
            : isHu ? "Mentor osszegzes" : "Mentor Summary",
        reason: isHu ? "Mentor altal letrehozott osszegzes blokk." : "Mentor-generated summary block.",
        content_json: {
          section: "sources",
          text: seed,
          summary_kind: timelineRequested ? "timeline" : comparisonRequested ? "comparison" : "summary",
          key_points: timelineRequested
            ? isHu ? ["1. pont: kontextus", "2. pont: fordulopont", "3. pont: eredmeny"] : ["T1: context", "T2: turning point", "T3: result"]
            : comparisonRequested
              ? isHu ? ["A dimenzio", "B dimenzio", "C dimenzio"] : ["Dimension A", "Dimension B", "Dimension C"]
              : isHu ? ["Fo allitas", "Kritikus kockazat", "Kovetkezo lepes"] : ["Main claim", "Critical risk", "Next step"],
        },
      },
    ];
  }

  if (blockType === "moodboard") {
    return [{ block_type: "moodboard", title: "Moodboard", reason: isHu ? "Mentor altal letrehozott moodboard blokk." : "Mentor-generated moodboard block.", content_json: { section: "output", title: "Moodboard", direction: seed, items: [] } }];
  }

  if (blockType === "reference_board") {
    return [{ block_type: "reference_board", title: "Reference Board", reason: isHu ? "Mentor altal letrehozott referencia board blokk." : "Mentor-generated reference board block.", content_json: { section: "sources", board_title: "Reference Board", objective: seed, references: [], connector_targets: ["Pinterest", "YouTube", "Instagram", "Canva", "Calendar"] } }];
  }

  if (blockType === "gif") {
    return [{ block_type: "gif", title: isHu ? "GIF jelzo" : "GIF Tone Marker", reason: isHu ? "Mentor altal letrehozott GIF blokk." : "Mentor-generated GIF block.", content_json: { section: "output", url: "", purpose: seed, placement_note: "" } }];
  }

  if (blockType === "sticker") {
    return [{ block_type: "sticker", title: isHu ? "Sticker jelzo" : "Sticker Marker", reason: isHu ? "Mentor altal letrehozott sticker blokk." : "Mentor-generated sticker block.", content_json: { section: "output", emoji: "*", label: isHu ? "Jelzes" : "Signal", meaning: seed, action_signal: "" } }];
  }

  if (blockType === "link") {
    return [{ block_type: "link", title: isHu ? "Referencia link" : "Resource Link", reason: isHu ? "Mentor altal letrehozott link blokk." : "Mentor-generated link block.", content_json: { section: "sources", title: isHu ? "Referencia link" : "Resource Link", url: "", summary: seed, usage_note: "" } }];
  }

  if (blockType === "pdf_reference") {
    return [{ block_type: "pdf_reference", title: isHu ? "PDF referencia" : "PDF Reference", reason: isHu ? "Mentor altal letrehozott PDF referencia blokk." : "Mentor-generated PDF reference block.", content_json: { section: "sources", title: isHu ? "PDF referencia" : "PDF Reference", url: "", pages: "", excerpt: seed, why_it_matters: "" } }];
  }

  if (blockType === "image_generation") {
    return [{ block_type: "image_generation", title: isHu ? "Media generalas" : "Media Generation", reason: isHu ? "Elokeszitett generalasi blokk. Futtatas kesobb kotheto be." : "Prepared generation block. Provider execution can be wired later.", content_json: { section: "output", prompt: message.trim(), reference_input: "", generation_modes: ["text-to-image", "image-to-image", "text-to-video", "image-to-video"], selected_mode: "text-to-image", status: isHu ? "Elokeszitve, meg nem futtatott." : "Prepared, not executed yet." } }];
  }

  if (blockType === "brief") {
    return [{ block_type: "brief", title: "Brief", reason: isHu ? "Mentor altal javasolt brief blokk." : "Mentor-suggested brief block.", content_json: { section: "ideas", objective: seed, audience: isHu ? "Elsodleges celcsoport" : "Primary audience", tone: isHu ? "Tiszta, fokuszalt" : "Clear, focused", key_messages: [] } }];
  }

  if (blockType === "task_list") {
    return [
      {
        block_type: "task_list",
        title: isHu ? "Mentor feladatlista" : "Mentor Task List",
        reason: isHu ? "Mentor altal bontott kovetkezo lepesek." : "Mentor-generated execution steps.",
        content_json: {
          section: "plan",
          tasks: [
            { id: crypto.randomUUID(), text: isHu ? "Hatarozd meg a scope-ot" : "Define scope", done: false },
            { id: crypto.randomUUID(), text: isHu ? "Bontsd 3 feladatra" : "Break into 3 tasks", done: false },
            { id: crypto.randomUUID(), text: isHu ? "Kerj tervkritikat a mentortol" : "Request mentor critique", done: false },
          ],
        },
      },
    ];
  }

  return [{ block_type: blockType, title: isHu ? "Mentor blokk" : "Mentor Block", reason: isHu ? "Mentor altal elokeszitett blokk." : "Mentor-prepared block.", content_json: { section: "ideas", text: seed } }];
}

function conciseGeneratedMessage(generatedBlocks: MentorGeneratedBlock[], locale: "en" | "hu"): string {
  if (generatedBlocks.length === 0) {
    return locale === "hu" ? "Készen állok a következő blokkra." : "Ready for the next block.";
  }
  if (generatedBlocks.length === 1) {
    const block = generatedBlocks[0];
    return locale === "hu"
      ? `Kész: ${block.title || block.block_type}. Helyezd a vászonra.`
      : `Ready: ${block.title || block.block_type}. Place it on canvas.`;
  }
  return locale === "hu"
    ? `Kész: ${generatedBlocks.length} blokk jelölt. Válassz és helyezd őket a vászonra.`
    : `Ready: ${generatedBlocks.length} block candidates. Select and place them on canvas.`;
}

function buildRefinePrompt(candidate: MentorGeneratedBlock, locale: "en" | "hu"): string {
  const label = candidate.title || candidate.block_type;
  if (locale === "hu") {
    return `Finomítsd ezt a(z) ${label} blokkot: legyen tömörebb, konkrétabb és használhatóbb.`;
  }
  return `Refine this ${label} block to be tighter, more concrete, and more usable.`;
}

function contextualActions(
  mode: Workspace["mode"],
  locale: "en" | "hu",
  selectedBlockType?: CanvasBlock["type"],
  latestGeneratedType?: MentorGeneratedBlock["block_type"],
): string[] {
  const selected = selectedBlockType ?? latestGeneratedType;

  if (mode === "learn") {
    if (selected === "lesson") {
      return locale === "hu"
        ? ["Quiz me on this", "Készíts flashcardokat", "Egyszerűsítsd ezt", "Emeld ki a kulcsfogalmakat"]
        : ["Quiz me on this", "Make flashcards", "Simplify this", "Extract key concepts"];
    }
    if (selected === "summary" || selected === "source") {
      return locale === "hu"
        ? ["Készíts lesson blokkot", "Készíts 3 kérdéses quizt", "Készíts flashcardokat", "Ossz ki gyakorló feladatot"]
        : ["Create lesson block", "Make a 3-question quiz", "Create flashcards", "Give me a practice task"];
    }
    return locale === "hu"
      ? ["Magyarázd el egyszerűen", "Készíts lesson blokkot", "Quiz me", "Készíts flashcardokat"]
      : ["Explain simply", "Create lesson block", "Quiz me", "Make flashcards"];
  }

  if (mode === "creative") {
    if (selected === "brief") {
      return locale === "hu"
        ? ["Készíts storyboardot", "Generálj irányokat", "Készíts image generation blokkot", "Adj copy ötleteket"]
        : ["Create storyboard", "Generate directions", "Create image generation block", "Generate copy ideas"];
    }
    if (selected === "storyboard") {
      return locale === "hu"
        ? ["Adj copy ötleteket", "Készíts image generation blokkot", "Finomítsd a jeleneteket", "Készíts rövid briefet"]
        : ["Generate copy ideas", "Create image generation block", "Refine scenes", "Create short brief"];
    }
    return locale === "hu"
      ? ["Készíts briefet", "Készíts storyboardot", "Készíts image generation blokkot", "Generálj irányokat"]
      : ["Create brief", "Create storyboard", "Create image generation block", "Generate directions"];
  }

  if (selected === "roadmap") {
    return locale === "hu"
      ? ["Bontsd feladatokra", "Kritikáld ezt a tervet", "Finomítsd a következő lépéseket", "Adj kockázatkezelést"]
      : ["Turn into tasks", "Critique this plan", "Refine next steps", "Add risk mitigation"];
  }
  if (selected === "critique") {
    return locale === "hu"
      ? ["Készíts javított task listát", "Frissítsd a roadmapet", "Sorold a top 3 javítást", "Adj végrehajtási sorrendet"]
      : ["Create revised task list", "Update roadmap", "List top 3 fixes", "Set execution order"];
  }
  return locale === "hu"
    ? ["Bontsd lépésekre", "Készíts roadmapet", "Kritikáld ezt", "Rendezd végrehajtható feladatokra"]
    : ["Turn this into tasks", "Create roadmap", "Critique this", "Make it execution-ready"];
}

export function MentorPanel({
  workspace,
  blocks,
  selectedBlockIds,
  initialWelcomeMessage,
  initialWelcomeActions = [],
  onCaptureMentorMessage,
}: Props) {
  const { t, lang } = useTranslation();

  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const storageKey = useMemo(() => mentorSessionStorageKey(workspace.id), [workspace.id]);

  useEffect(() => {
    setSessionHydrated(false);
    const restored = loadMentorSession(workspace.id);
    setMessages(restored);
    setSessionHydrated(true);
  }, [workspace.id]);

  useEffect(() => {
    if (!sessionHydrated) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(messages.slice(-MENTOR_SESSION_MAX_MESSAGES)),
      );
    } catch (error) {
      console.warn("[mentor] failed to persist session", error);
    }
  }, [messages, sessionHydrated, storageKey]);

  useEffect(() => {
    if (!sessionHydrated) return;
    if (!initialWelcomeMessage) return;
    setMessages((prev) => {
      if (prev.length > 0) return prev;
      return [
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: initialWelcomeMessage,
          timestamp: Date.now(),
          suggested_actions: initialWelcomeActions,
        },
      ];
    });
  }, [initialWelcomeActions, initialWelcomeMessage, sessionHydrated]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const guidance = useMemo(() => {
    const blockCount = blocks.length;
    const sourceCount = blocks.filter((block) => block.type === "source" || block.type === "summary").length;
    const selectedPrimary = blocks.find((block) => selectedBlockIds.includes(block.id));
    const latestGenerated = [...messages]
      .reverse()
      .find((message) => message.role === "assistant" && message.generated_blocks && message.generated_blocks.length > 0)
      ?.generated_blocks?.[0];

    const capabilityLine =
      workspace.mode === "learn"
        ? lang === "hu"
          ? "LEARN mód: lecke, kvíz, flashcard és tanulási transzformációk."
          : "LEARN mode: lessons, quizzes, flashcards, and learning transforms."
        : workspace.mode === "creative"
          ? lang === "hu"
            ? "CREATIVE mód: brief, storyboard, image generation és kreatív transzformációk."
            : "CREATIVE mode: brief, storyboard, image generation, and creative transforms."
          : lang === "hu"
            ? "BUILD mód: task list, roadmap, critique és végrehajtási transzformációk."
            : "BUILD mode: task lists, roadmaps, critique, and execution transforms.";

    const actions = contextualActions(
      workspace.mode,
      lang === "hu" ? "hu" : "en",
      selectedPrimary?.type,
      latestGenerated?.block_type,
    );

    if (lang === "hu") {
      return {
        blockLine: `${blockCount} blokk van ebben a munkatérben.`,
        selectedLine:
          selectedBlockIds.length > 0
            ? `${selectedBlockIds.length} blokk van kijelölve mentor munkához.`
            : "Válassz blokkot a kontextus alapú műveletekhez.",
        sourceLine:
          sourceCount > 0
            ? `${sourceCount} forrás/összefoglaló blokk elérhető kontextusként.`
            : "Adj hozzá forrást, és objektumot készítek belőle.",
        capabilityLine,
        actions,
      };
    }

    return {
      blockLine: `You have ${blockCount} blocks in this workspace.`,
      selectedLine:
        selectedBlockIds.length > 0
          ? `${selectedBlockIds.length} selected block(s) ready for mentor transforms.`
          : "Select a block for context-aware object generation.",
      sourceLine:
        sourceCount > 0
          ? `${sourceCount} source/summary block(s) available as context.`
          : "Add a source and I will convert it into working objects.",
      capabilityLine,
      actions,
    };
  }, [blocks, lang, messages, selectedBlockIds, workspace.mode]);

  const selectedBlocks = useMemo(
    () => blocks.filter((block) => selectedBlockIds.includes(block.id)).slice(0, 3),
    [blocks, selectedBlockIds],
  );

  const tutorial = useMemo(() => {
    const hasSticky = blocks.some((block) => block.type === "ai_sticky");
    const hasSourceContext = blocks.some((block) => block.type === "source" || block.type === "summary");
    const hasBoardSections = blocks.some((block) => block.type === "board_section");
    const hasBuildBlocks = blocks.some((block) =>
      block.type === "goal" || block.type === "task_list" || block.type === "roadmap",
    );
    const hasLearnBlocks = blocks.some((block) =>
      block.type === "lesson" || block.type === "quiz" || block.type === "flashcard",
    );
    const hasCreativeBlocks = blocks.some((block) =>
      block.type === "brief" ||
      block.type === "creative_brief" ||
      block.type === "storyboard" ||
      block.type === "image_generation" ||
      block.type === "copy",
    );

    if (workspace.mode === "learn") {
      if (lang === "hu") {
        return [
          {
            id: "select",
            title: "Válassz blokkot",
            prompt: "Segíts kiválasztani a fókusz blokkot.",
            done: selectedBlockIds.length > 0,
          },
          {
            id: "lesson",
            title: "Készíts leckét",
            prompt: "Készíts lesson blokkot ebből.",
            done: hasLearnBlocks,
          },
          {
            id: "board",
            title: "Készíts lesson boardot",
            prompt: "Készíts 4 szekciós visual lesson boardot.",
            done: hasBoardSections,
          },
          {
            id: "source",
            title: "Adj hozzá forrást",
            prompt: "Mutasd meg, milyen forrást adjak hozzá.",
            done: hasSourceContext,
          },
        ] as const;
      }

      return [
        {
          id: "select",
          title: "Select a block",
          prompt: "Help me choose the learning focus block.",
          done: selectedBlockIds.length > 0,
        },
        {
          id: "lesson",
          title: "Create lesson",
          prompt: "Create a lesson block from this.",
          done: hasLearnBlocks,
        },
        {
          id: "board",
          title: "Create lesson board",
          prompt: "Create a 4-section visual lesson board.",
          done: hasBoardSections,
        },
        {
          id: "source",
          title: "Add source",
          prompt: "Guide me to add source material.",
          done: hasSourceContext,
        },
      ] as const;
    }

    if (workspace.mode === "creative") {
      if (lang === "hu") {
        return [
          {
            id: "select",
            title: "Válassz blokkot",
            prompt: "Segíts kiválasztani a fókusz blokkot.",
            done: selectedBlockIds.length > 0,
          },
          {
            id: "brief",
            title: "Készíts briefet",
            prompt: "Készíts brief blokkot.",
            done: blocks.some((b) => b.type === "brief" || b.type === "creative_brief"),
          },
          {
            id: "board",
            title: "Készíts creative boardot",
            prompt: "Rendezd ezt 4 szekciós creative boarddá.",
            done: hasBoardSections,
          },
          {
            id: "media",
            title: "Adj média promptot",
            prompt: "Készíts image_generation blokkot.",
            done: blocks.some((b) => b.type === "image_generation") || hasCreativeBlocks,
          },
        ] as const;
      }

      return [
        {
          id: "select",
          title: "Select a block",
          prompt: "Help me choose the focus block.",
          done: selectedBlockIds.length > 0,
        },
        {
          id: "brief",
          title: "Create brief",
          prompt: "Create a brief block for this direction.",
          done: blocks.some((b) => b.type === "brief" || b.type === "creative_brief"),
        },
        {
          id: "board",
          title: "Create creative board",
          prompt: "Organize this into a 4-section creative board.",
          done: hasBoardSections,
        },
        {
          id: "media",
          title: "Add media block",
          prompt: "Create an image generation block with prompt.",
          done: blocks.some((b) => b.type === "image_generation") || hasCreativeBlocks,
        },
      ] as const;
    }

    if (lang === "hu") {
      return [
        {
          id: "select",
          title: "Válassz blokkot",
          prompt: "Segíts kiválasztani a fókusz blokkot.",
          done: selectedBlockIds.length > 0,
        },
        {
          id: "goal",
          title: "Készíts célblokkot",
          prompt: "Készíts goal blokkot ebből.",
          done: blocks.some((b) => b.type === "goal") || hasBuildBlocks,
        },
        {
          id: "board",
          title: "Készíts build boardot",
          prompt: "Rendezd ezt 4 szekciós build boarddá.",
          done: hasBoardSections,
        },
        {
          id: "pin",
          title: "Pinelj mentor insightot",
          prompt: "Adj rövid insightot, amit pinelni tudok.",
          done: hasSticky,
        },
      ] as const;
    }

    return [
      {
        id: "select",
        title: "Select a block",
        prompt: "Help me choose the focus block.",
        done: selectedBlockIds.length > 0,
      },
      {
        id: "goal",
        title: "Create goal block",
        prompt: "Create a goal block from this.",
        done: blocks.some((b) => b.type === "goal") || hasBuildBlocks,
      },
      {
        id: "board",
        title: "Create build board",
        prompt: "Organize this into a 4-section build board.",
        done: hasBoardSections,
      },
      {
        id: "pin",
        title: "Pin mentor insight",
        prompt: "Give one short insight I should pin to canvas.",
        done: hasSticky,
      },
    ] as const;
  }, [blocks, lang, selectedBlockIds.length, workspace.mode]);

  const tutorialDoneCount = tutorial.filter((step) => step.done).length;

  const handleSend = async (text: string) => {
    const userMsg: MentorMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setThinking(true);

    try {
      const locale = lang === "hu" ? "hu" : "en";
      const resp = await mentorChat({
        workspace_id: workspace.id,
        message: text,
        locale,
        selected_block_ids: selectedBlockIds,
        mode: workspace.mode,
      });

      const generatedBlocks =
        resp.generated_blocks && resp.generated_blocks.length > 0
          ? resp.generated_blocks
          : inferFallbackGeneratedBlocks(text, workspace.mode, locale);

      const assistantMsg: MentorMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: generatedBlocks.length > 0 ? conciseGeneratedMessage(generatedBlocks, locale) : resp.text,
        timestamp: Date.now(),
        suggested_actions: resp.suggested_actions,
        generated_blocks: generatedBlocks,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const fallbackText =
        lang === "hu"
          ? "Nem sikerült kapcsolódni a mentorhoz. Próbáld újra."
          : "Sorry, I could not connect to the mentor. Please try again.";

      const errMsg: MentorMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: fallbackText,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setThinking(false);
    }
  };

  const handlePinMessage = async (message: MentorMessage, generatedBlock?: MentorGeneratedBlock) => {
    if (!onCaptureMentorMessage || message.role !== "assistant" || !message.text.trim()) return;

    await onCaptureMentorMessage({
      source_message_id: message.id,
      text: message.text,
      action_type: "pin",
      generated_block: generatedBlock ?? message.generated_blocks?.[0],
    });
  };

  const handlePinAllGenerated = async (message: MentorMessage) => {
    if (!onCaptureMentorMessage || message.role !== "assistant") return;
    const generated = message.generated_blocks ?? [];
    if (generated.length === 0) return;

    for (const block of generated) {
      await onCaptureMentorMessage({
        source_message_id: message.id,
        text: message.text,
        action_type: "pin",
        generated_block: block,
      });
    }
  };

  const handlePlaceGenerated = async (
    message: MentorMessage,
    generatedBlock?: MentorGeneratedBlock,
  ) => {
    await handlePinMessage(message, generatedBlock);
  };

  const handleRefineGenerated = (message: MentorMessage, generatedBlock: MentorGeneratedBlock) => {
    const locale = lang === "hu" ? "hu" : "en";
    void handleSend(
      `${buildRefinePrompt(generatedBlock, locale)}\n${locale === "hu" ? "Forrás üzenet:" : "Source message:"} ${message.text}`,
    );
  };

  return (
    <aside className="w-[348px] xl:w-[360px] border-l border-[var(--shell-border)]/70 bg-[var(--shell-surface)]/72 backdrop-blur-xl flex flex-col shrink-0">
      <div className="h-[60px] border-b border-[var(--shell-border)]/70 flex items-center justify-between px-4 shrink-0">
        <div>
          <p className="text-sm font-medium flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--shell-accent)] animate-pulse" />
            {t("mentorPanelTitle")}
          </p>
          <p className="text-[11px] shell-muted truncate max-w-[190px]">{workspace.title}</p>
        </div>
        <span className="rounded-md border border-[var(--shell-border)]/70 bg-[var(--shell-surface-2)]/70 px-2 py-1 text-[10px] uppercase tracking-[0.12em] shell-muted">
          {workspace.mode}
        </span>
      </div>

      <div className="px-4 py-3 border-b border-[var(--shell-border)]/70 space-y-3">
        <div className="rounded-2xl shell-panel-strong p-3 space-y-2">
          <p className="text-xs flex items-center gap-2 text-[var(--shell-text)]/90">
            <Compass className="h-3.5 w-3.5" /> {guidance.blockLine}
          </p>
          <p className="text-xs shell-muted">{guidance.selectedLine}</p>
          <p className="text-xs shell-muted">{guidance.sourceLine}</p>
          <p className="text-xs shell-muted">{guidance.capabilityLine}</p>
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] uppercase tracking-[0.12em] shell-muted">
            {lang === "hu" ? "Kijelolt blokkok" : "Selected blocks"}
          </p>
          {selectedBlocks.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedBlocks.map((block) => (
                <span
                  key={block.id}
                  className="rounded-md border border-[var(--shell-border)]/70 bg-[var(--shell-surface-2)]/65 px-2 py-1 text-[11px] text-[var(--shell-text)]/88"
                >
                  {block.title || (lang === "hu" ? "Kijelolt blokk" : "Selected block")}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs shell-muted">
              {lang === "hu" ? "Valassz egy blokkot a celzott mentor akciokhoz." : "Select a block to unlock targeted mentor actions."}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {guidance.actions.map((action) => (
            <button
              key={action}
              onClick={() => void handleSend(action)}
              className="rounded-lg border shell-surface-2 px-2.5 py-1.5 text-left text-[11px] shell-muted hover:text-[var(--shell-text)] shell-interactive leading-snug"
            >
              {action}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-[var(--shell-border)]/70 bg-[var(--shell-surface-2)]/55 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.12em] shell-muted">
              {lang === "hu" ? "Mentor guide" : "Mentor guide"}
            </p>
            <p className="text-[11px] shell-muted">
              {tutorialDoneCount}/{tutorial.length}
            </p>
          </div>

          <div className="space-y-1.5">
            {tutorial.map((step) => (
              <button
                key={step.id}
                disabled={step.done}
                onClick={() => void handleSend(step.prompt)}
                className={`w-full rounded-xl border px-2.5 py-2 text-left text-xs shell-interactive ${
                  step.done
                    ? "border-[var(--shell-border)]/55 bg-[var(--shell-highlight)] text-[var(--shell-muted)]"
                    : "border-[var(--shell-border)] bg-[var(--shell-surface)]/30 text-[var(--shell-text)]"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  {step.done ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--shell-accent)]" />
                  )}
                  {step.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <MentorMessageList
        messages={messages}
        onAction={(action) => {
          void handleSend(action);
        }}
        onPinMessage={(message, generatedBlock) => {
          void handlePinMessage(message, generatedBlock);
        }}
        onPinAllGenerated={(message) => {
          void handlePinAllGenerated(message);
        }}
        onPlaceMessage={(message, generatedBlock) => {
          void handlePlaceGenerated(message, generatedBlock);
        }}
        onRefineGenerated={(message, generatedBlock) => {
          handleRefineGenerated(message, generatedBlock);
        }}
      />

      {thinking && (
        <div className="px-4 pb-2">
          <div className="inline-flex items-center gap-2 text-xs shell-muted">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            {lang === "hu" ? "A mentor dolgozik..." : "Mentor is thinking..."}
          </div>
        </div>
      )}

      <div ref={bottomRef} />

      <MentorComposer onSend={handleSend} disabled={thinking} />
    </aside>
  );
}





