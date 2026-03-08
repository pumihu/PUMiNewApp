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
      { id: crypto.randomUUID(), text: "Rögzítsd a következő konkrét lépést.", done: false },
      { id: crypto.randomUUID(), text: "Jelöld ki, mivel haladsz ma 25 percet.", done: false },
      { id: crypto.randomUUID(), text: "Kérdezd meg a mentort, mi a legnagyobb kockázat.", done: false },
    ];
  }

  return [
    { id: crypto.randomUUID(), text: "Lock in the next concrete milestone.", done: false },
    { id: crypto.randomUUID(), text: "Pick one 25-minute focus task for today.", done: false },
    { id: crypto.randomUUID(), text: "Ask the mentor to pressure-test the plan.", done: false },
  ];
}

function section(type: BlockType, fallback: "ideas" | "plan" | "sources" | "output") {
  return { type, content_json: { section: fallback } };
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

  if (payload.intent === "build") return lang === "hu" ? "Új projekt" : "New Project";
  if (payload.intent === "learn") return lang === "hu" ? "Tanulási terv" : "Learning Track";
  return lang === "hu" ? "Kreatív munkatér" : "Creative Workspace";
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
        ...section("note", "ideas"),
        title: lang === "hu" ? "Tanulási cél" : "Learning Goal",
        content_json: {
          section: "ideas",
          text:
            topic ||
            (lang === "hu"
              ? "Mit szeretnél biztosan érteni 1-2 héten belül?"
              : "What do you want to truly understand in the next 1-2 weeks?"),
        },
        position: 0,
      },
      {
        ...section("note", "ideas"),
        title: lang === "hu" ? "Miért most" : "Why Now",
        content_json: {
          section: "ideas",
          text:
            goal ||
            (lang === "hu"
              ? "Milyen döntéshez kell ez a tudás?"
              : "What decision or deadline makes this important now?"),
        },
        position: 1,
      },
      {
        ...section("note", "plan"),
        title: lang === "hu" ? "Mélység" : "Depth",
        content_json: {
          section: "plan",
          text:
            depth ||
            (lang === "hu"
              ? "Válassz: gyors áttekintés vagy mély gyakorlat."
              : "Choose: quick overview or deeper practical mastery."),
        },
        position: 2,
      },
      {
        ...section("task_list", "plan"),
        title: lang === "hu" ? "Tanulási terv" : "Study Plan",
        content_json: { section: "plan", tasks: defaultTasks(lang) },
        position: 3,
      },
      {
        ...section("source", "sources"),
        title: lang === "hu" ? "Források" : "Sources",
        content_json: {
          section: "sources",
          name: lang === "hu" ? "Első forrás" : "First Source",
          excerpt:
            materials ||
            (lang === "hu"
              ? "Adj hozzá egy cikket, jegyzetet vagy videót, és összefoglalom neked."
              : "Add an article, note, or transcript and I will summarize it for you."),
        },
        position: 4,
      },
      {
        ...section("summary", "output"),
        title: lang === "hu" ? "Tanulási output" : "Learning Output",
        content_json: {
          section: "output",
          text:
            lang === "hu"
              ? "Itt lesz a legfontosabb tanulság és következő lépés."
              : "This is where your key takeaways and next step will live.",
          key_points: [],
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
        ...section("creative_brief", "ideas"),
        title: lang === "hu" ? "Kreatív brief" : "Creative Brief",
        content_json: {
          section: "ideas",
          title: inferWorkspaceTitle(payload, lang),
          objective,
          audience: answers.audience || "",
          tone: mood || (lang === "hu" ? "Friss, fókuszált" : "Focused, evocative"),
          key_messages: [],
        },
        position: 0,
      },
      {
        ...section("idea", "ideas"),
        title: lang === "hu" ? "Irányok" : "Directions",
        content_json: {
          section: "ideas",
          text:
            lang === "hu"
              ? "Gyűjts 3 erős kreatív irányt."
              : "Capture three strong creative directions.",
        },
        position: 1,
      },
      {
        ...section("task_list", "plan"),
        title: lang === "hu" ? "Produkciós rend" : "Production Steps",
        content_json: { section: "plan", tasks: defaultTasks(lang) },
        position: 2,
      },
      {
        ...section("source", "sources"),
        title: lang === "hu" ? "Inspiráció" : "Inspiration Sources",
        content_json: {
          section: "sources",
          name: format || (lang === "hu" ? "Moodboard forrás" : "Moodboard Source"),
          excerpt:
            lang === "hu"
              ? "Tegyél be referenciaszöveget vagy koncepció anyagot."
              : "Drop reference material or concept notes here.",
        },
        position: 3,
      },
      {
        ...section("storyboard", "output"),
        title: lang === "hu" ? "Első storyboard" : "First Storyboard",
        content_json: { section: "output", scenes: [] },
        position: 4,
      },
      {
        ...section("summary", "output"),
        title: lang === "hu" ? "Output összegzés" : "Output Summary",
        content_json: {
          section: "output",
          text:
            lang === "hu"
              ? "A mentor itt fogja összefoglalni az aktuális kreatív irányt."
              : "The mentor will summarize your current creative direction here.",
        },
        position: 5,
      },
    ];
  }

  return [
    {
      ...section("note", "ideas"),
      title: lang === "hu" ? "Projekt cél" : "Project Goal",
      content_json: {
        section: "ideas",
        text:
          goal ||
          answers.project ||
          (lang === "hu"
            ? "Mi a legfontosabb eredmény, amit el akarsz érni?"
            : "What outcome matters most right now?"),
      },
      position: 0,
    },
    {
      ...section("note", "ideas"),
      title: lang === "hu" ? "Kinek épül" : "Audience",
      content_json: { section: "ideas", text: answers.audience || "" },
      position: 1,
    },
    {
      ...section("idea", "ideas"),
      title: lang === "hu" ? "Ötletek" : "Ideas",
      content_json: {
        section: "ideas",
        text:
          lang === "hu"
            ? "Írd ide a legerősebb ötleteket és hipotéziseket."
            : "Capture strongest ideas and assumptions here.",
      },
      position: 2,
    },
    {
      ...section("task_list", "plan"),
      title: lang === "hu" ? "Következő lépések" : "Next Steps",
      content_json: { section: "plan", tasks: defaultTasks(lang) },
      position: 3,
    },
    {
      ...section("source", "sources"),
        title: lang === "hu" ? "Források" : "Sources",
      content_json: {
        section: "sources",
        name: lang === "hu" ? "Kutatási forrás" : "Research Source",
        excerpt:
          lang === "hu"
            ? "Adj hozzá forrásanyagot és a mentor strukturált összefoglalót készít."
            : "Add source material and the mentor will generate a structured summary.",
      },
      position: 4,
    },
    {
      ...section("summary", "output"),
      title: lang === "hu" ? "Output" : "Output",
      content_json: {
        section: "output",
        text:
          lang === "hu"
            ? "Itt fog kialakulni a végleges output és döntési összefoglaló."
            : "This is where your final output and decision summary will evolve.",
      },
      position: 5,
    },
  ];
}
