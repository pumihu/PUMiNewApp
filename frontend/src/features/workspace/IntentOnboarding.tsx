import { useMemo, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { useTranslation } from "@/hooks/useTranslation";
import type { OnboardingIntent, OnboardingPayload } from "@/features/workspace/onboardingTemplates";

interface Question {
  id: string;
  titleEn: string;
  titleHu: string;
  placeholderEn: string;
  placeholderHu: string;
  suggestionsEn: string[];
  suggestionsHu: string[];
  optional?: boolean;
}

const QUESTION_SETS: Record<OnboardingIntent, Question[]> = {
  build: [
    {
      id: "project",
      titleEn: "What are you building?",
      titleHu: "Mit epitesz?",
      placeholderEn: "A product, campaign, service...",
      placeholderHu: "Termek, kampany, szolgaltatas...",
      suggestionsEn: ["A landing page", "A SaaS MVP", "A client project"],
      suggestionsHu: ["Landing page", "SaaS MVP", "Ugyfelprojekt"],
    },
    {
      id: "audience",
      titleEn: "Who is it for?",
      titleHu: "Kinek szol?",
      placeholderEn: "Primary user or customer...",
      placeholderHu: "Fo felhasznalo vagy ugyfel...",
      suggestionsEn: ["Early adopters", "B2B teams", "Content creators"],
      suggestionsHu: ["Korai felhasznalok", "B2B csapatok", "Tartalomkeszitok"],
    },
    {
      id: "goal",
      titleEn: "What outcome matters most now?",
      titleHu: "Most mi a legfontosabb eredmeny?",
      placeholderEn: "Launch, validation, revenue, clarity...",
      placeholderHu: "Indulas, validacio, bevetel, tisztazas...",
      suggestionsEn: ["Ship first version", "Validate demand", "Align team"],
      suggestionsHu: ["Elso verzio kiadasa", "Igeny validalasa", "Csapat igazitas"],
    },
    {
      id: "stage",
      titleEn: "What stage are you at?",
      titleHu: "Milyen fazisban vagy?",
      placeholderEn: "Idea, planning, execution...",
      placeholderHu: "Otlet, tervezes, kivitelezes...",
      suggestionsEn: ["Idea", "Planning", "Execution"],
      suggestionsHu: ["Otlet", "Tervezes", "Kivitelezes"],
      optional: true,
    },
  ],
  learn: [
    {
      id: "topic",
      titleEn: "What do you want to understand?",
      titleHu: "Mit szeretnel megerteni?",
      placeholderEn: "Topic, concept, skill...",
      placeholderHu: "Tema, koncepcio, skill...",
      suggestionsEn: ["Prompting systems", "Brand strategy", "Visual storytelling"],
      suggestionsHu: ["Prompting rendszerek", "Brand strategia", "Visual storytelling"],
    },
    {
      id: "why",
      titleEn: "Why does it matter right now?",
      titleHu: "Miert fontos ez most?",
      placeholderEn: "Decision, deadline, project pressure...",
      placeholderHu: "Dontes, hatarido, projekt helyzet...",
      suggestionsEn: ["Upcoming launch", "Client delivery", "Career growth"],
      suggestionsHu: ["Kovetkezo indulas", "Ugyfel delivery", "Karrier lepes"],
    },
    {
      id: "depth",
      titleEn: "How deep do you want to go?",
      titleHu: "Milyen melysegig menjunk?",
      placeholderEn: "Quick overview, practical depth, expert level...",
      placeholderHu: "Gyors attekintes, gyakorlat, expert szint...",
      suggestionsEn: ["Quick overview", "Practical depth", "Deep dive"],
      suggestionsHu: ["Gyors attekintes", "Gyakorlati melyseg", "Melymerules"],
    },
    {
      id: "materials",
      titleEn: "Do you already have materials?",
      titleHu: "Van mar forrasanyagod?",
      placeholderEn: "Articles, notes, links, docs...",
      placeholderHu: "Cikk, jegyzet, link, doksi...",
      suggestionsEn: ["Yes, notes ready", "Some links", "Not yet"],
      suggestionsHu: ["Igen, vannak jegyzetek", "Van nehany link", "Meg nincs"],
      optional: true,
    },
  ],
  creative: [
    {
      id: "project",
      titleEn: "What are you creating?",
      titleHu: "Mit alkotsz?",
      placeholderEn: "Campaign, script, brand concept...",
      placeholderHu: "Kampany, script, brand koncepcio...",
      suggestionsEn: ["Ad campaign", "Brand direction", "Story concept"],
      suggestionsHu: ["Kampany", "Brand irany", "Story koncepcio"],
    },
    {
      id: "audience",
      titleEn: "Who is it for?",
      titleHu: "Kinek szol?",
      placeholderEn: "Audience, buyer, community...",
      placeholderHu: "Kozonseg, vasarlo, kozosseg...",
      suggestionsEn: ["Young founders", "Premium audience", "Social-native users"],
      suggestionsHu: ["Fiatal alapitok", "Premium kozonseg", "Social-native userek"],
    },
    {
      id: "format",
      titleEn: "What platform or format is this for?",
      titleHu: "Melyik platformra vagy formatumra keszul?",
      placeholderEn: "Instagram reel, campaign, landing page, deck...",
      placeholderHu: "Instagram reel, kampany, landing page, deck...",
      suggestionsEn: ["Social short-form", "Campaign concept", "Landing page"],
      suggestionsHu: ["Social rovid format", "Kampany koncepcio", "Landing page"],
    },
    {
      id: "mood",
      titleEn: "What mood or style do you want?",
      titleHu: "Milyen hangulatot vagy stilust szeretnel?",
      placeholderEn: "Bold, cinematic, premium, playful...",
      placeholderHu: "Bator, cinematikus, premium, jatekos...",
      suggestionsEn: ["Bold and premium", "Cinematic", "Warm minimal"],
      suggestionsHu: ["Bator es premium", "Cinematikus", "Meleg minimal"],
      optional: true,
    },
  ],
};

interface Props {
  busy?: boolean;
  onComplete: (payload: OnboardingPayload) => Promise<void> | void;
}

export function IntentOnboarding({ busy = false, onComplete }: Props) {
  const { lang } = useTranslation();

  const [intent, setIntent] = useState<OnboardingIntent | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const isHu = lang === "hu";
  const questions = intent ? QUESTION_SETS[intent] : [];
  const activeQuestion = questions[index];

  const title = isHu
    ? "Mit szeretnel ma tovabbmozditani?"
    : "What would you like to move forward today?";

  const subtitle = isHu
    ? "Indulj egy irannyal. A mentor korad rendezi a workspace-t."
    : "Start with a direction. I'll help shape the workspace around it.";

  const choices = useMemo(
    () => [
      {
        id: "build" as const,
        label: isHu ? "Projekt epites" : "Build a project",
        description: isHu ? "Struktura + kovetkezo lepesek" : "Structure + practical next steps",
      },
      {
        id: "learn" as const,
        label: isHu ? "Tanulas" : "Learn something",
        description: isHu ? "Tisztabb kerdesek + terv" : "Clear questions + a guided plan",
      },
      {
        id: "creative" as const,
        label: isHu ? "Kreativ alkotas" : "Create something",
        description: isHu ? "Brief + output irany" : "Brief + output direction",
      },
    ],
    [isHu],
  );

  const commit = async () => {
    if (!intent) return;
    await onComplete({ intent, answers });
  };

  const skipCurrent = async () => {
    if (!activeQuestion) return;

    if (index < questions.length - 1) {
      setIndex((current) => current + 1);
      return;
    }

    await commit();
  };

  const canContinue =
    !!activeQuestion && ((answers[activeQuestion.id] || "").trim().length > 0 || !!activeQuestion.optional);

  if (intent && !activeQuestion) {
    return null;
  }

  return (
    <div className="min-h-screen shell-app-bg text-[var(--shell-text)] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-3xl rounded-3xl border shell-surface p-8 md:p-10 shadow-[0_20px_80px_rgba(5,8,20,0.35)]">
        {!intent ? (
          <div className="space-y-8">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.2em] shell-muted">PUMi AI Mentor Workspace</p>
              <h1 className="text-3xl md:text-4xl font-semibold leading-tight">{title}</h1>
              <p className="shell-muted text-sm md:text-base max-w-2xl">{subtitle}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {choices.map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => {
                    setIntent(choice.id);
                    setIndex(0);
                  }}
                  className="rounded-2xl border shell-surface-2 p-4 text-left transition hover:translate-y-[-1px] hover:border-[var(--shell-accent)]"
                >
                  <p className="font-medium text-sm">{choice.label}</p>
                  <p className="text-xs shell-muted mt-2">{choice.description}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] shell-muted">
                  {isHu ? "Gyors beallitas" : "Quick setup"}
                </p>
                <h2 className="text-2xl font-semibold mt-1">
                  {isHu ? activeQuestion.titleHu : activeQuestion.titleEn}
                </h2>
              </div>
              <p className="text-xs shell-muted">
                {index + 1} / {questions.length}
              </p>
            </div>

            <div className="space-y-4">
              <textarea
                value={answers[activeQuestion.id] ?? ""}
                onChange={(event) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [activeQuestion.id]: event.target.value,
                  }))
                }
                placeholder={isHu ? activeQuestion.placeholderHu : activeQuestion.placeholderEn}
                className="w-full min-h-[120px] rounded-2xl border shell-surface-2 px-4 py-3 text-sm bg-transparent outline-none focus:border-[var(--shell-accent)]"
              />

              <div className="flex flex-wrap gap-2">
                {(isHu ? activeQuestion.suggestionsHu : activeQuestion.suggestionsEn).map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        [activeQuestion.id]: suggestion,
                      }))
                    }
                    className="rounded-full border shell-surface-2 px-3 py-1.5 text-xs shell-muted hover:text-[var(--shell-text)]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={skipCurrent}
                disabled={busy}
                className="text-xs shell-muted hover:text-[var(--shell-text)] disabled:opacity-50"
              >
                {isHu ? "Kihagyas" : "Skip"}
              </button>

              <div className="flex gap-2">
                {index > 0 && (
                  <button
                    onClick={() => setIndex((current) => current - 1)}
                    disabled={busy}
                    className="rounded-xl border shell-surface-2 px-3 py-2 text-sm shell-muted hover:text-[var(--shell-text)]"
                  >
                    {isHu ? "Vissza" : "Back"}
                  </button>
                )}

                {index < questions.length - 1 ? (
                  <button
                    onClick={() => setIndex((current) => current + 1)}
                    disabled={busy || !canContinue}
                    className="rounded-xl px-4 py-2 text-sm font-medium bg-[var(--shell-accent-soft)] text-[var(--shell-text)] disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {isHu ? "Tovabb" : "Next"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={commit}
                    disabled={busy || !canContinue}
                    className="rounded-xl px-4 py-2 text-sm font-medium bg-[var(--shell-accent-soft)] text-[var(--shell-text)] disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    {busy ? (isHu ? "Epul..." : "Building...") : isHu ? "Workspace inditasa" : "Start workspace"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
