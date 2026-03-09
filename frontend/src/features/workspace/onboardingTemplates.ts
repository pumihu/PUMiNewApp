import type { BlockType, CanvasBlockCreate } from "@/types/canvas";

export type OnboardingIntent = "build" | "learn" | "creative";

export interface OnboardingPayload {
  intent: OnboardingIntent;
  answers: Record<string, string>;
}

type StarterTemplate = Omit<CanvasBlockCreate, "workspace_id">;

function defaultTasks(lang: "en" | "hu"): { id: string; text: string; done: boolean }[] {
  if (lang === "hu") {
    return [
      { id: crypto.randomUUID(), text: "Rogzitsd a kovetkezo konkret lepest.", done: false },
      { id: crypto.randomUUID(), text: "Jelold ki, mivel haladsz ma 25 percet.", done: false },
      { id: crypto.randomUUID(), text: "Kerdezd meg a mentort, mi a legnagyobb kockazat.", done: false },
    ];
  }

  return [
    { id: crypto.randomUUID(), text: "Lock in the next concrete milestone.", done: false },
    { id: crypto.randomUUID(), text: "Pick one 25-minute focus task for today.", done: false },
    { id: crypto.randomUUID(), text: "Ask the mentor to pressure-test the plan.", done: false },
  ];
}

function section(type: BlockType, key: string) {
  return { type, content_json: { section: key, section_key: key } };
}

function pickFirst(...values: Array<string | undefined>): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

export function inferWorkspaceTitle(payload: OnboardingPayload, lang: "en" | "hu"): string {
  const primary = pickFirst(payload.answers.project, payload.answers.topic, payload.answers.format);
  if (primary) {
    return primary.slice(0, 90);
  }

  if (payload.intent === "build") return lang === "hu" ? "Uj projekt" : "New Project";
  if (payload.intent === "learn") return lang === "hu" ? "Tanulasi terv" : "Learning Track";
  return lang === "hu" ? "Kreativ munkater" : "Creative Workspace";
}

export function buildStarterBlocks(payload: OnboardingPayload, lang: "en" | "hu"): StarterTemplate[] {
  const { intent, answers } = payload;
  const goal = pickFirst(answers.goal, answers.outcome, answers.result, answers.why);

  if (intent === "learn") {
    const topic = pickFirst(answers.topic);
    const depth = pickFirst(answers.depth);
    const materials = pickFirst(answers.materials);

    return [
      {
        ...section("note", "overview"),
        title: lang === "hu" ? "Tema" : "Topic",
        content_json: {
          section: "overview",
          section_key: "overview",
          text:
            topic ||
            (lang === "hu"
              ? "Mit szeretnel biztosan erteni?"
              : "What do you want to understand clearly?"),
        },
        position: 0,
      },
      {
        ...section("note", "overview"),
        title: lang === "hu" ? "Mit tudok mar" : "What I Know",
        content_json: {
          section: "overview",
          section_key: "overview",
          text:
            goal ||
            (lang === "hu"
              ? "Rogzitsd, amit mar biztosan tudsz a temarol."
              : "Capture what you already know about this topic."),
        },
        position: 1,
      },
      {
        ...section("lesson", "overview"),
        title: lang === "hu" ? "Mit kell megertenem" : "What I Need to Understand",
        content_json: {
          section: "overview",
          section_key: "overview",
          topic: topic || (lang === "hu" ? "Tanulasi fokusz" : "Learning focus"),
          explanation:
            lang === "hu"
              ? "A mentor itt bontja le a nehez reszeket egyszeru magyarazatra."
              : "Mentor will break down difficult parts into clear explanations.",
          key_points: depth ? [depth] : [],
        },
        position: 2,
      },
      {
        ...section("source", "sources"),
        title: lang === "hu" ? "Forrasok" : "Sources",
        content_json: {
          section: "sources",
          section_key: "sources",
          name: lang === "hu" ? "Elso forras" : "First source",
          excerpt:
            materials ||
            (lang === "hu"
              ? "Adj cikket, jegyzetet vagy dokumentumot a tanulashoz."
              : "Add article, notes, or documents for study context."),
        },
        position: 3,
      },
      {
        ...section("summary", "overview"),
        title: lang === "hu" ? "Kulcsfogalmak" : "Key Concepts",
        content_json: {
          section: "overview",
          section_key: "overview",
          text:
            lang === "hu"
              ? "A legfontosabb fogalmak es kapcsolatuk."
              : "The most important concepts and how they connect.",
          key_points: [],
        },
        position: 4,
      },
      {
        ...section("quiz", "practice"),
        title: lang === "hu" ? "Gyakorlas" : "Practice",
        content_json: {
          section: "practice",
          section_key: "practice",
          questions: [],
        },
        position: 5,
      },
    ];
  }

  if (intent === "creative") {
    const objective = pickFirst(goal, answers.project, answers.format);
    const format = pickFirst(answers.format);
    const mood = pickFirst(answers.mood);

    return [
      {
        ...section("brief", "brief"),
        title: lang === "hu" ? "Objective" : "Objective",
        content_json: {
          section: "brief",
          section_key: "brief",
          title: inferWorkspaceTitle(payload, lang),
          objective,
          audience: answers.audience || "",
          tone: mood || (lang === "hu" ? "Fokuszalt" : "Focused"),
          key_messages: [],
        },
        position: 0,
      },
      {
        ...section("note", "brief"),
        title: lang === "hu" ? "Kozonseg" : "Audience",
        content_json: {
          section: "brief",
          section_key: "brief",
          text: answers.audience || "",
        },
        position: 1,
      },
      {
        ...section("note", "brief"),
        title: lang === "hu" ? "Stilus" : "Style",
        content_json: {
          section: "brief",
          section_key: "brief",
          text:
            mood ||
            (lang === "hu"
              ? "Milyen hangulatot es vizualis nyelvet kovessen a kimenet?"
              : "Define mood and visual language for the output."),
        },
        position: 2,
      },
      {
        ...section("reference_board", "references"),
        title: lang === "hu" ? "Referenciak" : "References",
        content_json: {
          section: "references",
          section_key: "references",
          board_title: lang === "hu" ? "Referencia tabla" : "Reference board",
          objective:
            format ||
            (lang === "hu"
              ? "Gyujts benchmarkeket es stilusreferenciakat."
              : "Collect style references and benchmarks."),
          references: [],
          connector_targets: ["Pinterest", "YouTube", "Instagram", "Canva", "Calendar"],
        },
        position: 3,
      },
      {
        ...section("moodboard", "mood"),
        title: lang === "hu" ? "Koncepciok" : "Concepts",
        content_json: {
          section: "mood",
          section_key: "mood",
          title: "Moodboard",
          direction:
            lang === "hu"
              ? "Rendezd ossze a fo vizualis iranyokat."
              : "Collect the strongest visual directions.",
          items: [],
        },
        position: 4,
      },
      {
        ...section("storyboard", "output"),
        title: lang === "hu" ? "Output" : "Output",
        content_json: {
          section: "output",
          section_key: "output",
          scenes: [],
        },
        position: 5,
      },
    ];
  }

  return [
    {
      ...section("goal", "goal"),
      title: lang === "hu" ? "Goal" : "Goal",
      content_json: {
        section: "goal",
        section_key: "goal",
        goal:
          goal ||
          answers.project ||
          (lang === "hu"
            ? "Mi a legfontosabb eredmeny, amit el akarsz erni?"
            : "What outcome matters most right now?"),
        success_criteria:
          lang === "hu"
            ? ["Merheto eredmeny", "Hatarido", "Tulajdonos"]
            : ["Measurable outcome", "Deadline", "Owner"],
      },
      position: 0,
    },
    {
      ...section("note", "goal"),
      title: lang === "hu" ? "Constraints" : "Constraints",
      content_json: {
        section: "goal",
        section_key: "goal",
        text:
          pickFirst(answers.stage) ||
          (lang === "hu"
            ? "Ido, scope, minoseg es eroforras korlatok."
            : "Time, scope, quality, and resource constraints."),
      },
      position: 1,
    },
    {
      ...section("task_list", "plan"),
      title: lang === "hu" ? "Kovetkezo lepesek" : "Next Steps",
      content_json: { section: "plan", section_key: "plan", tasks: defaultTasks(lang) },
      position: 2,
    },
    {
      ...section("link", "sources"),
      title: lang === "hu" ? "Eroforrasok" : "Resources",
      content_json: {
        section: "sources",
        section_key: "sources",
        title: lang === "hu" ? "Elso referencia" : "First resource",
        url: "",
        summary:
          lang === "hu"
            ? "Melyik dokumentum vagy link tamogatja legjobban a tervet?"
            : "Which link or document best supports this plan?",
        usage_note: "",
      },
      position: 3,
    },
    {
      ...section("critique", "output"),
      title: lang === "hu" ? "Output" : "Output",
      content_json: {
        section: "output",
        section_key: "output",
        strengths: lang === "hu" ? ["Vilagos celirany"] : ["Clear target direction"],
        risks:
          lang === "hu"
            ? ["A terv meg konkretizalando"]
            : ["Plan still needs sharper constraints"],
        improvements:
          lang === "hu"
            ? ["Bontsd tovabbi feladatokra", "Kapcsolj metrikat a kimenethez"]
            : ["Break into clearer tasks", "Attach measurable output criteria"],
      },
      position: 4,
    },
  ];
}
