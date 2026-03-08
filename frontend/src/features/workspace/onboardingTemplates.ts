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

  if (payload.intent === "build") return lang === "hu" ? "Uj projekt" : "New Project";
  if (payload.intent === "learn") return lang === "hu" ? "Tanulasi terv" : "Learning Track";
  return lang === "hu" ? "Kreativ workspace" : "Creative Workspace";
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
        title: lang === "hu" ? "Tanulasi cel" : "Learning Goal",
        content_json: {
          section: "ideas",
          text:
            topic ||
            (lang === "hu"
              ? "Mit szeretnel biztosan erteni 1-2 heten belul?"
              : "What do you want to truly understand in the next 1-2 weeks?"),
        },
        position: 0,
      },
      {
        ...section("note", "ideas"),
        title: lang === "hu" ? "Miert most" : "Why Now",
        content_json: {
          section: "ideas",
          text:
            goal ||
            (lang === "hu"
              ? "Milyen donteshez kell ez a tudas?"
              : "What decision or deadline makes this important now?"),
        },
        position: 1,
      },
      {
        ...section("note", "plan"),
        title: lang === "hu" ? "Melyseg" : "Depth",
        content_json: {
          section: "plan",
          text:
            depth ||
            (lang === "hu"
              ? "Valassz: gyors attekintes vagy mely gyakorlat."
              : "Choose: quick overview or deeper practical mastery."),
        },
        position: 2,
      },
      {
        ...section("task_list", "plan"),
        title: lang === "hu" ? "Tanulasi terv" : "Study Plan",
        content_json: { section: "plan", tasks: defaultTasks(lang) },
        position: 3,
      },
      {
        ...section("source", "sources"),
        title: lang === "hu" ? "Forrasok" : "Sources",
        content_json: {
          section: "sources",
          name: lang === "hu" ? "Elso forras" : "First Source",
          excerpt:
            materials ||
            (lang === "hu"
              ? "Adj hozza egy cikket, jegyzetet vagy videot, es osszefoglalom neked."
              : "Add an article, note, or transcript and I will summarize it for you."),
        },
        position: 4,
      },
      {
        ...section("summary", "output"),
        title: lang === "hu" ? "Tanulasi output" : "Learning Output",
        content_json: {
          section: "output",
          text:
            lang === "hu"
              ? "Itt lesz a legfontosabb tanulsag es kovetkezo lepes."
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
        title: lang === "hu" ? "Kreativ brief" : "Creative Brief",
        content_json: {
          section: "ideas",
          title: inferWorkspaceTitle(payload, lang),
          objective,
          audience: answers.audience || "",
          tone: mood || (lang === "hu" ? "Friss, fokuszalt" : "Focused, evocative"),
          key_messages: [],
        },
        position: 0,
      },
      {
        ...section("idea", "ideas"),
        title: lang === "hu" ? "Iranyok" : "Directions",
        content_json: {
          section: "ideas",
          text:
            lang === "hu"
              ? "Gyujts 3 eros kreativ iranyt."
              : "Capture three strong creative directions.",
        },
        position: 1,
      },
      {
        ...section("task_list", "plan"),
        title: lang === "hu" ? "Produkciorend" : "Production Steps",
        content_json: { section: "plan", tasks: defaultTasks(lang) },
        position: 2,
      },
      {
        ...section("source", "sources"),
        title: lang === "hu" ? "Inspiracio" : "Inspiration Sources",
        content_json: {
          section: "sources",
          name: format || (lang === "hu" ? "Moodboard forras" : "Moodboard Source"),
          excerpt:
            lang === "hu"
              ? "Tegyel be referenciaszoveget vagy koncepcio anyagot."
              : "Drop reference material or concept notes here.",
        },
        position: 3,
      },
      {
        ...section("storyboard", "output"),
        title: lang === "hu" ? "Elso storyboard" : "First Storyboard",
        content_json: { section: "output", scenes: [] },
        position: 4,
      },
      {
        ...section("summary", "output"),
        title: lang === "hu" ? "Output osszegzes" : "Output Summary",
        content_json: {
          section: "output",
          text:
            lang === "hu"
              ? "A mentor itt fogja osszefoglalni az aktualis kreativ iranyt."
              : "The mentor will summarize your current creative direction here.",
        },
        position: 5,
      },
    ];
  }

  return [
    {
      ...section("note", "ideas"),
      title: lang === "hu" ? "Projekt cel" : "Project Goal",
      content_json: {
        section: "ideas",
        text:
          goal ||
          answers.project ||
          (lang === "hu"
            ? "Mi a legfontosabb eredmeny, amit el akarsz erni?"
            : "What outcome matters most right now?"),
      },
      position: 0,
    },
    {
      ...section("note", "ideas"),
      title: lang === "hu" ? "Kinek epul" : "Audience",
      content_json: { section: "ideas", text: answers.audience || "" },
      position: 1,
    },
    {
      ...section("idea", "ideas"),
      title: lang === "hu" ? "Otletek" : "Ideas",
      content_json: {
        section: "ideas",
        text:
          lang === "hu"
            ? "Ird ide a legerosebb otleteket es hipotiziseket."
            : "Capture strongest ideas and assumptions here.",
      },
      position: 2,
    },
    {
      ...section("task_list", "plan"),
      title: lang === "hu" ? "Kovetkezo lepesek" : "Next Steps",
      content_json: { section: "plan", tasks: defaultTasks(lang) },
      position: 3,
    },
    {
      ...section("source", "sources"),
      title: lang === "hu" ? "Forrasok" : "Sources",
      content_json: {
        section: "sources",
        name: lang === "hu" ? "Kutatasi forras" : "Research Source",
        excerpt:
          lang === "hu"
            ? "Adj hozza forrasanyagot es a mentor strukturalt osszefoglalot keszit."
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
            ? "Itt fog kialakulni a vegleges output es dontesi osszefoglalo."
            : "This is where your final output and decision summary will evolve.",
      },
      position: 5,
    },
  ];
}
