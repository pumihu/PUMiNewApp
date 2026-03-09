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
    "tÃ¡bla",
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
            { key: "overview", titleEn: "Overview", titleHu: "Attekintes", subtitleEn: "Topic and understanding", subtitleHu: "Tema es megertes", defaultType: "lesson", colorTheme: "violet" },
            { key: "practice", titleEn: "Practice", titleHu: "Gyakorlas", subtitleEn: "Quiz and recall", subtitleHu: "Quiz es visszahivas", defaultType: "quiz", colorTheme: "olive" },
            { key: "sources", titleEn: "Sources", titleHu: "Forrasok", subtitleEn: "Learning materials", subtitleHu: "Tanulasi anyagok", defaultType: "source", colorTheme: "sky" },
            { key: "output", titleEn: "Output", titleHu: "Output", subtitleEn: "Summary and key concepts", subtitleHu: "Osszegzes es kulcsfogalmak", defaultType: "summary", colorTheme: "rose" },
          ]
        : mode === "creative"
          ? [
              { key: "brief", titleEn: "Brief", titleHu: "Brief", subtitleEn: "Objective and audience", subtitleHu: "Cel es kozonseg", defaultType: "brief", colorTheme: "violet" },
              { key: "references", titleEn: "References", titleHu: "Referenciak", subtitleEn: "Reference board", subtitleHu: "Referencia board", defaultType: "reference_board", colorTheme: "olive" },
              { key: "mood", titleEn: "Concepts", titleHu: "Koncepciok", subtitleEn: "Mood and direction", subtitleHu: "Hangulat es irany", defaultType: "moodboard", colorTheme: "sky" },
              { key: "output", titleEn: "Output", titleHu: "Output", subtitleEn: "Storyboard and media", subtitleHu: "Storyboard es media", defaultType: "storyboard", colorTheme: "rose" },
            ]
          : [
              { key: "goal", titleEn: "Goal", titleHu: "Cel", subtitleEn: "Outcome and constraints", subtitleHu: "Eredmeny es korlatok", defaultType: "goal", colorTheme: "violet" },
              { key: "plan", titleEn: "Plan", titleHu: "Terv", subtitleEn: "Steps and execution", subtitleHu: "Lepesek es vegrehajtas", defaultType: "task_list", colorTheme: "olive" },
              { key: "sources", titleEn: "Resources", titleHu: "Eroforrasok", subtitleEn: "Links and references", subtitleHu: "Linkek es referenciak", defaultType: "link", colorTheme: "sky" },
              { key: "output", titleEn: "Output", titleHu: "Output", subtitleEn: "Review and critique", subtitleHu: "Review es kritika", defaultType: "critique", colorTheme: "rose" },
            ];

    return sections.map((section) => ({
      block_type: "board_section",
      title: isHu ? section.titleHu : section.titleEn,
      reason: isHu ? "Mentor altal elokeszitett board szekcio." : "Mentor-prepared board section.",
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
  else if (includesAny(normalized, ["quiz", "kvÃ­z", "kviz", "teszt"])) blockType = "quiz";
  else if (includesAny(normalized, ["flashcard", "kÃ¡rtya", "kartya"])) blockType = "flashcard";
  else if (includesAny(normalized, ["lesson", "explain", "simplify", "magyarÃ¡", "magyaraz", "tanÃ­ts", "tanits"])) blockType = "lesson";
  else if (includesAny(normalized, ["summary", "summarize", "key concept", "Ã¶sszefoglal", "osszefoglal"])) blockType = "summary";
  else if (includesAny(normalized, ["task", "todo", "to-do", "feladat", "teend"])) blockType = "task_list";
  else if (includesAny(normalized, ["roadmap", "milestone", "Ã¼temterv", "utemterv"])) blockType = "roadmap";
  else if (includesAny(normalized, ["goal", "objective", "cÃ©l", "cel"])) blockType = "goal";
  else if (includesAny(normalized, ["critique", "feedback", "review", "kritika"])) blockType = "critique";
  else if (includesAny(normalized, ["storyboard", "scene", "jelenet"])) blockType = "storyboard";
  else if (includesAny(normalized, ["image generation", "generate image", "text-to-image", "kÃ©p", "kep"])) blockType = "image_generation";
  else if (includesAny(normalized, ["copy", "headline", "caption", "tagline", "szÃ¶veg", "szoveg"])) blockType = "copy";
  else if (includesAny(normalized, ["brief", "creative direction"])) blockType = "brief";

  if (!blockType) {
    const hasCreateIntent = includesAny(normalized, [
      "create",
      "make",
      "generate",
      "build",
      "turn this into",
      "kÃ©szÃ­ts",
      "keszits",
      "alakÃ­tsd",
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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);
  }, [workspace.id]);

  useEffect(() => {
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
  }, [initialWelcomeActions, initialWelcomeMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const guidance = useMemo(() => {
    const blockCount = blocks.length;
    const sourceCount = blocks.filter((block) => block.type === "source" || block.type === "summary").length;

    const modeGuidance =
      workspace.mode === "learn"
        ? {
            capabilityLine:
              lang === "hu"
                ? "LEARN mod: magyarazat, egyszerusites, gyakorlas, visszahivas. Lecke, quiz, flashcard, timeline/comparison osszegzes."
                : "LEARN mode: explanation, simplification, practice, and recall. Lessons, quizzes, flashcards, and timeline/comparison summaries.",
            actions:
              lang === "hu"
                ? ["Magyarazd el egyszeruen", "Quiz me", "Keszits flashcardokat", "Keszits timeline osszegzest"]
                : ["Explain simply", "Quiz me", "Make flashcards", "Create timeline summary"],
          }
        : workspace.mode === "creative"
          ? {
              capabilityLine:
                lang === "hu"
                  ? "CREATIVE mod: koncepcio, kreativ irany, storytelling es output. Brief, moodboard, storyboard, copy, image generation."
                  : "CREATIVE mode: concepts, direction, storytelling, and output. Brief, moodboard, storyboard, copy, image generation.",
              actions:
                lang === "hu"
                  ? ["Keszits briefet", "Generalj kreativ iranyokat", "Keszits moodboardot", "Indits storyboardot"]
                  : ["Create brief", "Generate directions", "Create moodboard", "Start storyboard"],
            }
          : {
              capabilityLine:
                lang === "hu"
                  ? "BUILD mod: tervezes, strukturalt vegrehajtas, kritika. Cel, task list, roadmap, critique, resource blokkok."
                  : "BUILD mode: planning, structure, execution, and critique. Goal, task list, roadmap, critique, and resource blocks.",
              actions:
                lang === "hu"
                  ? ["Finomitsd a celt", "Bontsd lepesekre", "Keszits roadmapet", "Kritikald a tervet"]
                  : ["Refine goal", "Break into steps", "Create roadmap", "Critique plan"],
            };

    if (lang === "hu") {
      return {
        blockLine: `${blockCount} blokk van ebben a munkatÃ©rben.`,
        selectedLine:
          selectedBlockIds.length > 0
            ? `${selectedBlockIds.length} blokk van kijelÃ¶lve mentor munkÃ¡hoz.`
            : "VÃ¡lassz egy blokkot, hogy pontosan azon dolgozzunk.",
        sourceLine:
          sourceCount > 0
            ? `${sourceCount} forrÃ¡s/Ã¶sszefoglalÃ³ blokk elÃ©rhetÅ‘ kontextuskÃ©nt.`
            : "Adj hozzÃ¡ forrÃ¡st, Ã©s strukturÃ¡lt Ã¶sszefoglalÃ³t kÃ©szÃ­tek.",
        ...modeGuidance,
      };
    }

    return {
      blockLine: `You have ${blockCount} blocks in this workspace.`,
      selectedLine:
        selectedBlockIds.length > 0
          ? `${selectedBlockIds.length} selected block(s) ready for mentor work.`
          : "Select a block to get precise, context-aware help.",
      sourceLine:
        sourceCount > 0
          ? `${sourceCount} source/summary block(s) available as context.`
          : "Add a source and I will generate a structured summary.",
      ...modeGuidance,
    };
  }, [blocks, lang, selectedBlockIds.length, workspace.mode]);

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
            title: "VÃ¡lassz blokkot",
            prompt: "SegÃ­ts kivÃ¡lasztani a fÃ³kusz blokkot.",
            done: selectedBlockIds.length > 0,
          },
          {
            id: "lesson",
            title: "KÃ©szÃ­ts leckÃ©t",
            prompt: "KÃ©szÃ­ts lesson blokkot ebbÅ‘l.",
            done: hasLearnBlocks,
          },
          {
            id: "board",
            title: "KÃ©szÃ­ts lesson boardot",
            prompt: "KÃ©szÃ­ts 4 szekciÃ³s visual lesson boardot.",
            done: hasBoardSections,
          },
          {
            id: "source",
            title: "Adj hozzÃ¡ forrÃ¡st",
            prompt: "Mutasd meg, milyen forrÃ¡st adjak hozzÃ¡.",
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
            title: "VÃ¡lassz blokkot",
            prompt: "SegÃ­ts kivÃ¡lasztani a fÃ³kusz blokkot.",
            done: selectedBlockIds.length > 0,
          },
          {
            id: "brief",
            title: "KÃ©szÃ­ts briefet",
            prompt: "KÃ©szÃ­ts brief blokkot.",
            done: blocks.some((b) => b.type === "brief" || b.type === "creative_brief"),
          },
          {
            id: "board",
            title: "KÃ©szÃ­ts creative boardot",
            prompt: "Rendezd ezt 4 szekciÃ³s creative boarddÃ¡.",
            done: hasBoardSections,
          },
          {
            id: "media",
            title: "Adj mÃ©dia promptot",
            prompt: "KÃ©szÃ­ts image_generation blokkot.",
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
          title: "VÃ¡lassz blokkot",
          prompt: "SegÃ­ts kivÃ¡lasztani a fÃ³kusz blokkot.",
          done: selectedBlockIds.length > 0,
        },
        {
          id: "goal",
          title: "KÃ©szÃ­ts cÃ©lblokkot",
          prompt: "KÃ©szÃ­ts goal blokkot ebbÅ‘l.",
          done: blocks.some((b) => b.type === "goal") || hasBuildBlocks,
        },
        {
          id: "board",
          title: "KÃ©szÃ­ts build boardot",
          prompt: "Rendezd ezt 4 szekciÃ³s build boarddÃ¡.",
          done: hasBoardSections,
        },
        {
          id: "pin",
          title: "Pinelj mentor insightot",
          prompt: "Adj rÃ¶vid insightot, amit pinelni tudok.",
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
        text: resp.text,
        timestamp: Date.now(),
        suggested_actions: resp.suggested_actions,
        generated_blocks: generatedBlocks,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const fallbackText =
        lang === "hu"
          ? "Nem sikerÃ¼lt kapcsolÃ³dni a mentorhoz. PrÃ³bÃ¡ld Ãºjra."
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

  return (
    <aside className="w-[360px] border-l border-[var(--shell-border)] bg-[var(--shell-surface)]/78 backdrop-blur-xl flex flex-col shrink-0">
      <div className="h-[62px] border-b border-[var(--shell-border)] flex items-center justify-between px-4 shrink-0">
        <div>
          <p className="text-sm font-medium flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--shell-accent)] animate-pulse" />
            {t("mentorPanelTitle")}
          </p>
          <p className="text-[11px] shell-muted">{workspace.title}</p>
        </div>
        <span className="text-[10px] uppercase tracking-[0.14em] shell-muted">{workspace.mode}</span>
      </div>

      <div className="px-4 py-3 border-b border-[var(--shell-border)] space-y-3">
        <div className="rounded-xl shell-panel p-3 space-y-2">
          <p className="text-xs flex items-center gap-2">
            <Compass className="h-3.5 w-3.5" /> {guidance.blockLine}
          </p>
          <p className="text-xs shell-muted">{guidance.selectedLine}</p>
          <p className="text-xs shell-muted">{guidance.sourceLine}</p>
          <p className="text-xs shell-muted">{guidance.capabilityLine}</p>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.12em] shell-muted">
            {lang === "hu" ? "KijelÃ¶lt blokkok" : "Selected blocks"}
          </p>
          {selectedBlocks.length > 0 ? (
            selectedBlocks.map((block) => (
              <p key={block.id} className="text-xs text-[var(--shell-text)]/88">
                â€¢ {block.title || (lang === "hu" ? "KijelÃ¶lt blokk" : "Selected block")}
              </p>
            ))
          ) : (
            <p className="text-xs shell-muted">
              {lang === "hu" ? "Nincs kijelÃ¶lt blokk." : "No block selected yet."}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          {guidance.actions.map((action) => (
            <button
              key={action}
              onClick={() => void handleSend(action)}
              className="rounded-lg border shell-surface-2 px-3 py-1.5 text-left text-[11px] shell-muted hover:text-[var(--shell-text)] shell-interactive"
            >
              {action}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-[var(--shell-border)]/70 bg-[var(--shell-surface-2)]/65 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.12em] shell-muted">Guided start</p>
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
                className={`w-full rounded-lg border px-2.5 py-2 text-left text-xs shell-interactive ${
                  step.done
                    ? "border-[var(--shell-border)]/55 bg-[var(--shell-highlight)] text-[var(--shell-muted)]"
                    : "border-[var(--shell-border)] bg-transparent text-[var(--shell-text)]"
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

