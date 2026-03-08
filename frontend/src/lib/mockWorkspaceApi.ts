import type { CanvasBlock, CanvasBlockCreate, CanvasBlockPatch } from "@/types/canvas";
import type {
  DocumentSummarizeRequest,
  DocumentSummaryBundle,
  DocumentUploadRequest,
  SourceDocument,
} from "@/types/document";
import type { MentorChatRequest, MentorChatResponse, MentorGeneratedBlock } from "@/types/mentor";
import type { Workspace, WorkspaceCreate, WorkspaceUpdate } from "@/types/workspace";

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
  link: "Link",
  source: "Source",
  pdf_reference: "PDF Reference",
  summary: "Summary",
  idea: "Idea",
  ai_sticky: "AI Insight",
  creative_brief: "Creative brief",
  image_asset: "Image asset",
  image: "Image",
  gif: "GIF",
  sticker: "Emoji / Sticker",
  moodboard: "Moodboard",
  reference_board: "Reference Board",
  storyboard: "Storyboard",
  lesson: "Lesson",
  quiz: "Quiz",
  flashcard: "Flashcards",
  goal: "Goal",
  roadmap: "Roadmap",
  critique: "Critique",
  brief: "Brief",
  image_generation: "Image Generation",
  copy: "Copy",
  board_section: "Board Section",
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

function includesAny(input: string, terms: string[]): boolean {
  return terms.some((term) => input.includes(term));
}

function blockPreview(block: CanvasBlock): string {
  const content = (block.content_json ?? {}) as Record<string, unknown>;
  const textLike = [
    content.text,
    content.excerpt,
    content.summary_preview,
    content.objective,
    content.goal,
  ].find((value) => typeof value === "string" && value.trim().length > 0);

  return typeof textLike === "string" ? textLike.slice(0, 140) : "";
}

function inferRequestedBlockType(message: string, mode: MentorChatRequest["mode"]): MentorGeneratedBlock["block_type"] | null {
  const normalized = message.toLowerCase();

  const explicitChecks: Array<{ blockType: MentorGeneratedBlock["block_type"]; terms: string[] }> = [
    { blockType: "source", terms: ["source block", "source material", "learning material", "study source", "forras blokk"] },
    { blockType: "moodboard", terms: ["moodboard", "mood board", "inspiration board", "visual direction board"] },
    { blockType: "reference_board", terms: ["reference board", "pinterest-style board", "resource board"] },
    { blockType: "gif", terms: ["gif", "gif block"] },
    { blockType: "sticker", terms: ["sticker", "emoji marker", "emoji block"] },
    { blockType: "link", terms: ["link block", "resource link", "insert link", "add link"] },
    { blockType: "pdf_reference", terms: ["pdf reference", "pdf block", "document reference", "citation block"] },
    { blockType: "quiz", terms: ["quiz", "kvÃƒÂ­z", "kviz", "3-question", "3 question", "teszt"] },
    { blockType: "flashcard", terms: ["flashcard", "flash card", "kartya", "kÃƒÂ¡rtya"] },
    { blockType: "lesson", terms: ["lesson", "explain", "simplify", "magyarÃƒÂ¡", "magyaraz", "tanÃƒÂ­ts", "tanits"] },
    { blockType: "summary", terms: ["summary", "summarize", "key concept", "timeline", "comparison", "compare", "ÃƒÂ¶sszefoglal", "osszefoglal"] },
    { blockType: "task_list", terms: ["task list", "tasks", "to-do", "todo", "feladat", "teend", "steps"] },
    { blockType: "goal", terms: ["goal", "objective", "cÃƒÂ©l", "cel"] },
    { blockType: "roadmap", terms: ["roadmap", "timeline", "milestone", "utemterv", "ÃƒÂ¼temterv"] },
    { blockType: "critique", terms: ["critique", "review", "feedback", "kritika", "criticize"] },
    { blockType: "brief", terms: ["brief", "creative brief", "creative direction", "direction block"] },
    { blockType: "storyboard", terms: ["storyboard", "scene", "jelenet", "shot list"] },
    {
      blockType: "image_generation",
      terms: ["image generation", "generate image", "text-to-image", "image prompt", "visual prompt", "kÃƒÂ©p", "kep"],
    },
    { blockType: "copy", terms: ["copy", "headline", "tagline", "caption", "ad copy", "szÃƒÂ¶veg", "szoveg"] },
  ];

  for (const check of explicitChecks) {
    if (includesAny(normalized, check.terms)) {
      return check.blockType;
    }
  }

  const blockIntent =
    includesAny(normalized, ["create", "make", "generate", "build", "turn this into", "kÃƒÂ©szÃƒÂ­ts", "keszits", "alakÃƒÂ­tsd", "alakitsd"]);
  if (!blockIntent) {
    return null;
  }

  if (mode === "learn") return "lesson";
  if (mode === "creative") return "brief";
  return "task_list";
}

function makeTasks(topic: string): Array<{ id: string; text: string; done: boolean }> {
  return [
    { id: makeId(), text: `Define scope for: ${topic}`, done: false },
    { id: makeId(), text: "Break the work into 3 executable steps", done: false },
    { id: makeId(), text: "Ask mentor for critique before execution", done: false },
  ];
}

function createGeneratedBlock(
  req: MentorChatRequest,
  selectedBlocks: CanvasBlock[],
): MentorGeneratedBlock | null {
  const blockType = inferRequestedBlockType(req.message, req.mode);
  if (!blockType) return null;

  const contextSeed = selectedBlocks.map(blockPreview).find(Boolean) || req.message.trim();
  const locale = req.locale;

  if (blockType === "lesson") {
    return {
      block_type: "lesson",
      title: locale === "hu" ? "Gyors lecke" : "Quick Lesson",
      reason: locale === "hu" ? "Mentor ÃƒÂ¡ltal lÃƒÂ©trehozott tanulÃƒÂ¡si blokk." : "Mentor-generated learning block.",
      content_json: {
        section: "ideas",
        topic: req.message.trim(),
        explanation:
          locale === "hu"
            ? `${contextSeed.slice(0, 220)}. Kezdd az alapfogalommal, majd menj tovÃƒÂ¡bb gyakorlati pÃƒÂ©ldÃƒÂ¡kkal.`
            : `${contextSeed.slice(0, 220)}. Start from fundamentals, then move to practical examples.`,
        key_points:
          locale === "hu"
            ? ["Alapfogalom", "MiÃƒÂ©rt fontos most", "Tipikus hiba"]
            : ["Core concept", "Why it matters now", "Common pitfall"],
      },
    };
  }

  if (blockType === "quiz") {
    return {
      block_type: "quiz",
      title: locale === "hu" ? "GyakorlÃƒÂ³ kvÃƒÂ­z" : "Practice Quiz",
      reason: locale === "hu" ? "Mentor ÃƒÂ¡ltal lÃƒÂ©trehozott gyakorlÃƒÂ³ kÃƒÂ©rdÃƒÂ©sek." : "Mentor-generated practice questions.",
      content_json: {
        section: "plan",
        questions: [
          {
            id: makeId(),
            question: locale === "hu" ? `Mi a legfontosabb cÃƒÂ©l ebben: ${contextSeed.slice(0, 60)}?` : `What is the primary goal in: ${contextSeed.slice(0, 60)}?`,
            options:
              locale === "hu"
                ? ["Gyors indulÃƒÂ¡s", "KockÃƒÂ¡zatcsÃƒÂ¶kkentÃƒÂ©s", "TanulÃƒÂ¡si visszajelzÃƒÂ©s"]
                : ["Fast launch", "Risk reduction", "Learning feedback"],
            correct_index: 1,
            explanation: locale === "hu" ? "A cÃƒÂ©l tisztÃƒÂ¡zÃƒÂ¡sa csÃƒÂ¶kkenti a hibÃƒÂ¡s irÃƒÂ¡nyt." : "Clarifying the goal reduces wrong direction.",
          },
          {
            id: makeId(),
            question: locale === "hu" ? "Mi legyen a kÃƒÂ¶vetkezÃ…â€˜ lÃƒÂ©pÃƒÂ©s?" : "What should happen next?",
            options:
              locale === "hu"
                ? ["Feladatok bontÃƒÂ¡sa", "TÃƒÂ©ma lezÃƒÂ¡rÃƒÂ¡sa", "Minden ÃƒÂºjrakezdÃƒÂ©se"]
                : ["Break into tasks", "Close the topic", "Restart from zero"],
            correct_index: 0,
            explanation: locale === "hu" ? "A blokk cÃƒÂ©lja vÃƒÂ©grehajthatÃƒÂ³ haladÃƒÂ¡s." : "The block aims for executable progress.",
          },
          {
            id: makeId(),
            question: locale === "hu" ? "Mivel validÃƒÂ¡lod az eredmÃƒÂ©nyt?" : "How will you validate the outcome?",
            options:
              locale === "hu"
                ? ["MÃƒÂ©rÃ…â€˜szÃƒÂ¡m", "MegÃƒÂ©rzÃƒÂ©s", "VÃƒÂ©letlen"]
                : ["Metric", "Gut feeling", "Chance"],
            correct_index: 0,
            explanation: locale === "hu" ? "A mÃƒÂ©rÃ…â€˜szÃƒÂ¡m teszi ellenÃ…â€˜rizhetÃ…â€˜vÃƒÂ© a munkÃƒÂ¡t." : "A metric makes progress testable.",
          },
        ],
      },
    };
  }

  if (blockType === "flashcard") {
    return {
      block_type: "flashcard",
      title: locale === "hu" ? "Flashcard csomag" : "Flashcard Set",
      reason: locale === "hu" ? "Mentor ÃƒÂ¡ltal lÃƒÂ©trehozott ismÃƒÂ©tlÃ…â€˜kÃƒÂ¡rtyÃƒÂ¡k." : "Mentor-generated recall cards.",
      content_json: {
        section: "plan",
        cards: [
          { id: makeId(), front: locale === "hu" ? "Fogalom" : "Concept", back: contextSeed.slice(0, 120) },
          { id: makeId(), front: locale === "hu" ? "MiÃƒÂ©rt fontos?" : "Why it matters", back: locale === "hu" ? "IrÃƒÂ¡nyt ad a dÃƒÂ¶ntÃƒÂ©sekhez." : "It drives better decisions." },
          { id: makeId(), front: locale === "hu" ? "Tipikus hiba" : "Common mistake", back: locale === "hu" ? "HomÃƒÂ¡lyos cÃƒÂ©lmeghatÃƒÂ¡rozÃƒÂ¡s." : "Vague goal definition." },
        ],
      },
    };
  }

  if (blockType === "source") {
    return {
      block_type: "source",
      title: locale === "hu" ? "Tanulasi forras" : "Study Source",
      reason: locale === "hu" ? "Mentor altal letrehozott forras blokk." : "Mentor-generated source block.",
      content_json: {
        section: "sources",
        name: locale === "hu" ? "Forras" : "Source",
        excerpt: contextSeed.slice(0, 320),
        source_type: "text",
      },
    };
  }

  if (blockType === "summary") {
    const timelineRequested = includesAny(req.message.toLowerCase(), ["timeline", "chronology", "idovonal"]);
    const comparisonRequested = includesAny(req.message.toLowerCase(), ["comparison", "compare", "osszehasonlit"]);
    return {
      block_type: "summary",
      title: timelineRequested
        ? locale === "hu" ? "Idovonal osszegzes" : "Timeline Summary"
        : comparisonRequested
          ? locale === "hu" ? "Osszehasonlito osszegzes" : "Comparison Summary"
          : locale === "hu" ? "Mentor ÃƒÂ¶sszegzÃƒÂ©s" : "Mentor Summary",
      reason: locale === "hu" ? "Mentor ÃƒÂ¡ltal sÃ…Â±rÃƒÂ­tett ÃƒÂ¶sszefoglalÃƒÂ³." : "Mentor-compressed summary.",
      content_json: {
        section: "sources",
        text: contextSeed.slice(0, 320),
        summary_kind: timelineRequested ? "timeline" : comparisonRequested ? "comparison" : "summary",
        key_points:
          timelineRequested
            ? locale === "hu"
              ? ["1. pont: kontextus", "2. pont: fordulopont", "3. pont: eredmeny"]
              : ["T1: context", "T2: turning point", "T3: result"]
            : comparisonRequested
              ? locale === "hu"
                ? ["A dimenzio", "B dimenzio", "C dimenzio"]
                : ["Dimension A", "Dimension B", "Dimension C"]
              : locale === "hu"
                ? ["FÃ…â€˜ ÃƒÂ¡llÃƒÂ­tÃƒÂ¡s", "Kritikus kockÃƒÂ¡zat", "KÃƒÂ¶vetkezÃ…â€˜ lÃƒÂ©pÃƒÂ©s"]
                : ["Main claim", "Critical risk", "Next step"],
      },
    };
  }

  if (blockType === "moodboard") {
    return {
      block_type: "moodboard",
      title: "Moodboard",
      reason: locale === "hu" ? "Mentor altal letrehozott moodboard blokk." : "Mentor-generated moodboard block.",
      content_json: {
        section: "output",
        title: "Moodboard",
        direction: contextSeed.slice(0, 220),
        items: [],
      },
    };
  }

  if (blockType === "reference_board") {
    return {
      block_type: "reference_board",
      title: "Reference Board",
      reason:
        locale === "hu"
          ? "Mentor altal letrehozott referencia board blokk."
          : "Mentor-generated reference board block.",
      content_json: {
        section: "sources",
        board_title: "Reference Board",
        objective: contextSeed.slice(0, 220),
        references: [],
        connector_targets: ["Pinterest", "YouTube", "Instagram", "Canva", "Calendar"],
      },
    };
  }

  if (blockType === "gif") {
    return {
      block_type: "gif",
      title: locale === "hu" ? "GIF hangulatjelzo" : "GIF Tone Marker",
      reason: locale === "hu" ? "Mentor altal letrehozott GIF blokk." : "Mentor-generated GIF block.",
      content_json: {
        section: "output",
        url: "",
        purpose: contextSeed.slice(0, 180),
        placement_note: "",
      },
    };
  }

  if (blockType === "sticker") {
    return {
      block_type: "sticker",
      title: locale === "hu" ? "Sticker jelzo" : "Sticker Marker",
      reason: locale === "hu" ? "Mentor altal letrehozott sticker blokk." : "Mentor-generated sticker block.",
      content_json: {
        section: "output",
        emoji: "*",
        label: locale === "hu" ? "Jelzes" : "Signal",
        meaning: contextSeed.slice(0, 160),
        action_signal: "",
      },
    };
  }

  if (blockType === "link") {
    return {
      block_type: "link",
      title: locale === "hu" ? "Referencia link" : "Resource Link",
      reason: locale === "hu" ? "Mentor altal letrehozott link blokk." : "Mentor-generated link block.",
      content_json: {
        section: "sources",
        title: locale === "hu" ? "Referencia link" : "Resource Link",
        url: "",
        summary: contextSeed.slice(0, 220),
        usage_note: "",
      },
    };
  }

  if (blockType === "pdf_reference") {
    return {
      block_type: "pdf_reference",
      title: locale === "hu" ? "PDF referencia" : "PDF Reference",
      reason:
        locale === "hu"
          ? "Mentor altal letrehozott PDF referencia blokk."
          : "Mentor-generated PDF reference block.",
      content_json: {
        section: "sources",
        title: locale === "hu" ? "PDF referencia" : "PDF Reference",
        url: "",
        pages: "",
        excerpt: contextSeed.slice(0, 220),
        why_it_matters: "",
      },
    };
  }

  if (blockType === "goal") {
    return {
      block_type: "goal",
      title: locale === "hu" ? "MunkacÃƒÂ©l" : "Working Goal",
      reason: locale === "hu" ? "Mentor ÃƒÂ¡ltal tisztÃƒÂ¡zott cÃƒÂ©lblokk." : "Mentor-refined goal block.",
      content_json: {
        section: "ideas",
        goal: contextSeed.slice(0, 180),
        success_criteria:
          locale === "hu"
            ? ["MÃƒÂ©rhetÃ…â€˜ eredmÃƒÂ©ny", "HatÃƒÂ¡ridÃ…â€˜", "Tulajdonos"]
            : ["Measurable outcome", "Deadline", "Owner"],
      },
    };
  }

  if (blockType === "task_list") {
    return {
      block_type: "task_list",
      title: locale === "hu" ? "Mentor feladatlista" : "Mentor Task List",
      reason: locale === "hu" ? "Mentor ÃƒÂ¡ltal bontott lÃƒÂ©pÃƒÂ©sek." : "Mentor-generated execution steps.",
      content_json: {
        section: "plan",
        tasks: makeTasks(contextSeed.slice(0, 70)),
      },
    };
  }

  if (blockType === "roadmap") {
    return {
      block_type: "roadmap",
      title: locale === "hu" ? "Roadmap vÃƒÂ¡zlat" : "Roadmap Outline",
      reason: locale === "hu" ? "Mentor ÃƒÂ¡ltal felÃƒÂ©pÃƒÂ­tett ÃƒÂ¼temezÃƒÂ©s." : "Mentor-structured timeline.",
      content_json: {
        section: "plan",
        phases:
          locale === "hu"
            ? [
                { id: makeId(), title: "1. FÃƒÂ¡zis", outcome: "CÃƒÂ©l pontosÃƒÂ­tÃƒÂ¡sa" },
                { id: makeId(), title: "2. FÃƒÂ¡zis", outcome: "Feladatok vÃƒÂ©grehajtÃƒÂ¡sa" },
                { id: makeId(), title: "3. FÃƒÂ¡zis", outcome: "EredmÃƒÂ©ny validÃƒÂ¡lÃƒÂ¡sa" },
              ]
            : [
                { id: makeId(), title: "Phase 1", outcome: "Clarify goal" },
                { id: makeId(), title: "Phase 2", outcome: "Execute key tasks" },
                { id: makeId(), title: "Phase 3", outcome: "Validate outcome" },
              ],
      },
    };
  }

  if (blockType === "critique") {
    return {
      block_type: "critique",
      title: locale === "hu" ? "Mentor kritika" : "Mentor Critique",
      reason: locale === "hu" ? "Mentor ÃƒÂ¡ltal kÃƒÂ©szÃƒÂ­tett kritikai blokk." : "Mentor-generated critique block.",
      content_json: {
        section: "output",
        strengths: locale === "hu" ? ["VilÃƒÂ¡gos irÃƒÂ¡ny"] : ["Clear direction"],
        risks: locale === "hu" ? ["A sikerkritÃƒÂ©rium mÃƒÂ©g homÃƒÂ¡lyos"] : ["Success criteria still vague"],
        improvements:
          locale === "hu"
            ? ["Tedd mÃƒÂ©rhetÃ…â€˜vÃƒÂ© a cÃƒÂ©lt", "Kapcsolj hatÃƒÂ¡ridÃ…â€˜t a feladatokhoz"]
            : ["Make the goal measurable", "Add deadlines to tasks"],
      },
    };
  }

  if (blockType === "storyboard") {
    return {
      block_type: "storyboard",
      title: locale === "hu" ? "Storyboard vÃƒÂ¡zlat" : "Storyboard Draft",
      reason: locale === "hu" ? "Mentor ÃƒÂ¡ltal lÃƒÂ©trehozott jelenetsor." : "Mentor-generated scene flow.",
      content_json: {
        section: "output",
        scenes: [
          { scene_title: locale === "hu" ? "NyitÃƒÂ³ kÃƒÂ©p" : "Opening Shot", camera_direction: locale === "hu" ? "KÃƒÂ¶zelÃƒÂ­tÃƒÂ©s" : "Push-in", voiceover: contextSeed.slice(0, 120) },
          { scene_title: locale === "hu" ? "Konfliktus" : "Conflict", camera_direction: locale === "hu" ? "KÃƒÂ©zi kamera" : "Handheld", voiceover: locale === "hu" ? "Mutasd meg a fÃ…â€˜ akadÃƒÂ¡lyt." : "Show the primary tension." },
          { scene_title: locale === "hu" ? "FeloldÃƒÂ¡s" : "Resolution", camera_direction: locale === "hu" ? "TotÃƒÂ¡l" : "Wide", voiceover: locale === "hu" ? "ZÃƒÂ¡rd egy egyÃƒÂ©rtelmÃ…Â± ÃƒÂ­gÃƒÂ©rettel." : "Close with a clear promise." },
        ],
      },
    };
  }

  if (blockType === "image_generation") {
    return {
      block_type: "image_generation",
      title: locale === "hu" ? "MÃƒÂ©dia generÃƒÂ¡lÃƒÂ¡s" : "Media Generation",
      reason:
        locale === "hu"
          ? "ElÃ…â€˜kÃƒÂ©szÃƒÂ­tett generÃƒÂ¡lÃƒÂ¡si blokk (provider integrÃƒÂ¡ciÃƒÂ³ nÃƒÂ©lkÃƒÂ¼l)."
          : "Prepared generation block (without provider integration yet).",
      content_json: {
        section: "output",
        prompt: req.message.trim(),
        reference_input: "",
        generation_modes: ["text-to-image", "image-to-image", "text-to-video", "image-to-video"],
        selected_mode: "text-to-image",
        status: locale === "hu" ? "ElÃ…â€˜kÃƒÂ©szÃƒÂ­tve, futtatÃƒÂ¡s mÃƒÂ©g nincs bekÃƒÂ¶tve." : "Prepared, execution is not wired yet.",
        output_preview_url: "",
      },
    };
  }

  if (blockType === "copy") {
    return {
      block_type: "copy",
      title: locale === "hu" ? "Copy blokk" : "Copy Block",
      reason: locale === "hu" ? "Mentor ÃƒÂ¡ltal kÃƒÂ©szÃƒÂ­tett szÃƒÂ¶vegirÃƒÂ¡nyok." : "Mentor-generated copy directions.",
      content_json: {
        section: "output",
        channel: locale === "hu" ? "KampÃƒÂ¡ny" : "Campaign",
        text: contextSeed.slice(0, 220),
        variations:
          locale === "hu"
            ? ["RÃƒÂ¶vid, direkt vÃƒÂ¡ltozat", "Ãƒâ€°rzelmi hangvÃƒÂ©telÃ…Â± vÃƒÂ¡ltozat", "CselekvÃƒÂ©sre ÃƒÂ¶sztÃƒÂ¶nzÃ…â€˜ vÃƒÂ¡ltozat"]
            : ["Short direct variant", "Emotional variant", "Action-oriented variant"],
      },
    };
  }

  if (blockType === "brief") {
    return {
      block_type: "brief",
      title: locale === "hu" ? "KreatÃƒÂ­v brief" : "Creative Brief",
      reason: locale === "hu" ? "Mentor ÃƒÂ¡ltal lÃƒÂ©trehozott brief blokk." : "Mentor-generated brief block.",
      content_json: {
        section: "ideas",
        objective: req.message.trim(),
        audience: locale === "hu" ? "ElsÃ…â€˜dleges cÃƒÂ©lcsoport" : "Primary audience",
        tone: locale === "hu" ? "Tiszta, prÃƒÂ©mium, fÃƒÂ³kuszÃƒÂ¡lt" : "Clear, premium, focused",
        key_messages:
          locale === "hu"
            ? ["EgyÃƒÂ©rtelmÃ…Â± ÃƒÂ­gÃƒÂ©ret", "KonkrÃƒÂ©t elÃ…â€˜ny", "ErÃ…â€˜s CTA"]
            : ["Clear promise", "Concrete benefit", "Strong CTA"],
      },
    };
  }

  return null;
}

function isBoardRequest(message: string): boolean {
  const normalized = message.toLowerCase();
  if (
    includesAny(normalized, [
      "moodboard",
      "mood board",
      "reference board",
      "gif block",
      "sticker block",
      "link block",
      "pdf reference",
    ])
  ) {
    return false;
  }
  return includesAny(normalized, [
    "board",
    "visual lesson board",
    "classroom summary board",
    "study board",
    "4-section",
    "4 section",
    "organize this into",
    "tÃƒÂ¡bla",
    "tabla",
  ]);
}

function createBoardSectionsForMode(
  mode: MentorChatRequest["mode"],
  locale: "en" | "hu",
): MentorGeneratedBlock[] {
  const sections =
    mode === "learn"
      ? [
          { key: "overview", titleEn: "Overview", titleHu: "ÃƒÂttekintÃƒÂ©s", subtitleEn: "Topic scope and context", subtitleHu: "TÃƒÂ©ma ÃƒÂ©s kontextus", defaultType: "lesson" as const, colorTheme: "violet" },
          { key: "concepts", titleEn: "Key Concepts", titleHu: "Kulcsfogalmak", subtitleEn: "Distilled concepts", subtitleHu: "LÃƒÂ©nyegi fogalmak", defaultType: "summary" as const, colorTheme: "sky" },
          { key: "practice", titleEn: "Practice", titleHu: "GyakorlÃƒÂ¡s", subtitleEn: "Quiz and recall", subtitleHu: "KvÃƒÂ­z ÃƒÂ©s visszahÃƒÂ­vÃƒÂ¡s", defaultType: "quiz" as const, colorTheme: "olive" },
          { key: "sources", titleEn: "Sources", titleHu: "ForrÃƒÂ¡sok", subtitleEn: "Source material", subtitleHu: "ForrÃƒÂ¡sanyagok", defaultType: "source" as const, colorTheme: "rose" },
        ]
      : mode === "creative"
        ? [
            { key: "brief", titleEn: "Brief", titleHu: "Brief", subtitleEn: "Objective and audience", subtitleHu: "CÃƒÂ©l ÃƒÂ©s cÃƒÂ©lcsoport", defaultType: "brief" as const, colorTheme: "violet" },
            { key: "directions", titleEn: "Directions", titleHu: "IrÃƒÂ¡nyok", subtitleEn: "Concept directions", subtitleHu: "KoncepciÃƒÂ³s irÃƒÂ¡nyok", defaultType: "copy" as const, colorTheme: "olive" },
            { key: "storyboard", titleEn: "Storyboard", titleHu: "Storyboard", subtitleEn: "Scene structure", subtitleHu: "JelenetstruktÃƒÂºra", defaultType: "storyboard" as const, colorTheme: "sky" },
            { key: "media", titleEn: "Media", titleHu: "MÃƒÂ©dia", subtitleEn: "Image and video prompts", subtitleHu: "KÃƒÂ©p- ÃƒÂ©s videÃƒÂ³ promptok", defaultType: "image_generation" as const, colorTheme: "rose" },
          ]
        : [
            { key: "goal", titleEn: "Goal", titleHu: "CÃƒÂ©l", subtitleEn: "Outcome definition", subtitleHu: "EredmÃƒÂ©nydefinÃƒÂ­ciÃƒÂ³", defaultType: "goal" as const, colorTheme: "violet" },
            { key: "plan", titleEn: "Plan", titleHu: "Terv", subtitleEn: "Tasks and milestones", subtitleHu: "Feladatok ÃƒÂ©s mÃƒÂ©rfÃƒÂ¶ldkÃƒÂ¶vek", defaultType: "task_list" as const, colorTheme: "olive" },
            { key: "execution", titleEn: "Execution", titleHu: "VÃƒÂ©grehajtÃƒÂ¡s", subtitleEn: "Roadmap and progress", subtitleHu: "Roadmap ÃƒÂ©s haladÃƒÂ¡s", defaultType: "roadmap" as const, colorTheme: "sky" },
            { key: "review", titleEn: "Review", titleHu: "Review", subtitleEn: "Critique and decisions", subtitleHu: "Kritika ÃƒÂ©s dÃƒÂ¶ntÃƒÂ©sek", defaultType: "critique" as const, colorTheme: "rose" },
          ];

  return sections.map((section) => ({
    block_type: "board_section",
    title: locale === "hu" ? section.titleHu : section.titleEn,
    reason: locale === "hu" ? "Mentor ÃƒÂ¡ltal elÃ…â€˜kÃƒÂ©szÃƒÂ­tett board szekciÃƒÂ³." : "Mentor-prepared board section.",
    content_json: {
      key: section.key,
      subtitle: locale === "hu" ? section.subtitleHu : section.subtitleEn,
      color_theme: section.colorTheme,
      default_type: section.defaultType,
    },
  }));
}

function modeSuggestedActions(locale: "en" | "hu", mode: MentorChatRequest["mode"]): Array<{ label: string; action: string }> {
  if (mode === "learn") {
    return locale === "hu"
      ? [
          { label: "Magyarazd el egyszeruen", action: "Magyarazd el egyszeruen ezt a temat." },
          { label: "Keszits lecket", action: "Keszits lesson blokkot ebbol." },
          { label: "Quiz me", action: "Keszits 3 kerdeses quiz blokkot." },
          { label: "Keszits flashcardokat", action: "Keszits flashcard blokkot ebbol." },
          { label: "Keszits timeline osszegzest", action: "Keszits timeline jellegu summary blokkot errol." },
        ]
      : [
          { label: "Explain simply", action: "Explain this topic simply." },
          { label: "Create lesson", action: "Create a lesson block from this." },
          { label: "Quiz me", action: "Create a 3-question quiz block." },
          { label: "Make flashcards", action: "Create a flashcard block from this." },
          { label: "Create timeline summary", action: "Create a timeline-style summary block for this topic." },
        ];
  }

  if (mode === "creative") {
    return locale === "hu"
      ? [
          { label: "Keszits briefet", action: "Keszits brief blokkot ebbol." },
          { label: "Generalj kreativ iranyokat", action: "Generalj 3 kreativ iranyt ehhez." },
          { label: "Keszits moodboardot", action: "Keszits moodboard blokkot ehhez." },
          { label: "Indits storyboardot", action: "Keszits storyboard blokkot ehhez." },
          { label: "Adj kep promptot", action: "Keszits media generalas blokkot prompttal." },
        ]
      : [
          { label: "Create brief", action: "Create a brief block from this." },
          { label: "Generate directions", action: "Generate three creative directions." },
          { label: "Create moodboard", action: "Create a moodboard block for this concept." },
          { label: "Start storyboard", action: "Create a storyboard block for this concept." },
          { label: "Add image prompt", action: "Create a media generation block with prompt." },
        ];
  }

  return locale === "hu"
    ? [
        { label: "Finomitsd a celt", action: "Keszits goal blokkot konkret sikerkriteriumokkal." },
        { label: "Bontsd lepesekre", action: "Bontsd ezt vegrehajthato task listara." },
        { label: "Keszits roadmapet", action: "Keszits roadmap blokkot 3 fazissal." },
        { label: "Kritikald a tervet", action: "Keszits critique blokkot a fo kockazatokrol." },
        { label: "Rendezd boardba", action: "Rendezd ezt strukturalt build boardda." },
      ]
    : [
        { label: "Refine goal", action: "Create a goal block from this with measurable criteria." },
        { label: "Break into steps", action: "Break this into an executable task list block." },
        { label: "Create roadmap", action: "Create a roadmap block with 3 phases." },
        { label: "Critique plan", action: "Create a critique block with risks and improvements." },
        { label: "Organize blocks", action: "Organize this into a structured build board." },
      ];
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

  updateWorkspace(workspaceId: string, patch: WorkspaceUpdate): Workspace {
    const store = readStore();
    const index = store.workspaces.findIndex((item) => item.id === workspaceId);
    if (index < 0) {
      throw new Error("Workspace not found");
    }

    const previous = store.workspaces[index];
    const next: Workspace = {
      ...previous,
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.mode !== undefined ? { mode: patch.mode } : {}),
      updated_at: nowIso(),
    };

    store.workspaces[index] = next;
    writeStore(store);
    return next;
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
    const mergedContent =
      data.content_json !== undefined &&
      data.content_json !== null &&
      typeof data.content_json === "object" &&
      !Array.isArray(data.content_json) &&
      previous.content_json &&
      typeof previous.content_json === "object" &&
      !Array.isArray(previous.content_json)
        ? { ...(previous.content_json as Record<string, unknown>), ...(data.content_json as Record<string, unknown>) }
        : data.content_json;

    const updated: CanvasBlock = {
      ...previous,
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.content_json !== undefined ? { content_json: mergedContent } : {}),
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
    const boardGenerated = isBoardRequest(req.message)
      ? createBoardSectionsForMode(req.mode, req.locale)
      : [];
    const singleGenerated = createGeneratedBlock(req, selected);
    const generatedBlocks =
      boardGenerated.length > 0
        ? boardGenerated
        : singleGenerated
          ? [singleGenerated]
          : [];

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

    const modeBehavior =
      req.mode === "learn"
        ? req.locale === "hu"
          ? "LEARN modban magyarazatot, gyakorlast, quizt, flashcardot es timeline osszegzest adok."
          : "In LEARN mode I focus on explanation, practice, quizzes, flashcards, and timeline/comparison summaries."
        : req.mode === "creative"
          ? req.locale === "hu"
            ? "CREATIVE modban briefet, kreativ iranyokat, moodboardot, storyboardot es media blokkokat adok."
            : "In CREATIVE mode I prioritize brief, directions, moodboard, storyboard, copy, and media blocks."
          : req.locale === "hu"
            ? "BUILD modban cel, lepesek, roadmap, kritika es resource blokkokra fokuszalok."
            : "In BUILD mode I prioritize goals, execution steps, roadmaps, critique, and resource blocks.";

    const generatedLine =
      generatedBlocks.length > 0
        ? req.locale === "hu"
          ? generatedBlocks.length > 1
            ? ` ElÃ…â€˜kÃƒÂ©szÃƒÂ­tettem ${generatedBlocks.length} board szekciÃƒÂ³ blokkjelÃƒÂ¶ltet, pineld Ã…â€˜ket a vÃƒÂ¡szonra.`
            : ` ElÃ…â€˜kÃƒÂ©szÃƒÂ­tettem egy ${generatedBlocks[0].block_type} blokkjelÃƒÂ¶ltet, pineld a vÃƒÂ¡szonra.`
          : generatedBlocks.length > 1
            ? ` I prepared ${generatedBlocks.length} board section candidates. Pin them to canvas.`
            : ` I prepared one ${generatedBlocks[0].block_type} block candidate. Pin it to canvas.`
        : "";

    return {
      text: `${baseText} ${modeBehavior}${generatedLine} ${
        req.locale === "hu" ? "Mondd, mi legyen a kovetkezo blokk." : "Tell me which block to generate next."
      }`,
      suggested_actions: modeSuggestedActions(req.locale, req.mode),
      generated_blocks: generatedBlocks,
      tool_results: [],
      language: req.locale,
    };
  },
};

