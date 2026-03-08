import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Layers, Plus, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { IntentOnboarding } from "@/features/workspace/IntentOnboarding";
import { ThemeSwitcher } from "@/features/workspace/ThemeSwitcher";
import {
  buildStarterBlocks,
  inferWorkspaceTitle,
  type OnboardingPayload,
} from "@/features/workspace/onboardingTemplates";
import { useTranslation } from "@/hooks/useTranslation";
import { createBlock, createWorkspace, listWorkspaces } from "@/lib/api";
import type { SuggestedAction } from "@/types/mentor";
import type { Workspace, WorkspaceMode } from "@/types/workspace";

const MODE_ICON = {
  build: <Layers className="h-4 w-4" />,
  learn: <BookOpen className="h-4 w-4" />,
  creative: <Sparkles className="h-4 w-4" />,
};

const MODE_COLOR: Record<WorkspaceMode, string> = {
  build: "bg-[var(--shell-accent-soft)] text-[var(--shell-text)] border-[var(--shell-border)]",
  learn: "bg-[var(--shell-accent-soft)] text-[var(--shell-text)] border-[var(--shell-border)]",
  creative: "bg-[var(--shell-accent-soft)] text-[var(--shell-text)] border-[var(--shell-border)]",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { t, lang } = useTranslation();
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMode, setNewMode] = useState<WorkspaceMode>("build");

  useEffect(() => {
    listWorkspaces()
      .then(setWorkspaces)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const modeLabels = useMemo<Record<WorkspaceMode, string>>(
    () => ({
      build: t("modeBuild"),
      learn: t("modeLearn"),
      creative: t("modeCreative"),
    }),
    [t],
  );

  const isHu = lang === "hu";

  const creatingLabel = isHu ? "Letrehozas..." : "Creating...";

  const handleCreate = async () => {
    if (!newTitle.trim()) return;

    setCreating(true);
    try {
      const ws = await createWorkspace({ title: newTitle.trim(), mode: newMode });
      setWorkspaces((prev) => [ws, ...prev]);
      setShowCreate(false);
      setNewTitle("");
      navigate(`/workspace/${ws.id}`);
    } catch (error) {
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const handleOnboardingComplete = async (payload: OnboardingPayload) => {
    setCreating(true);
    try {
      const locale: "en" | "hu" = isHu ? "hu" : "en";
      const title = inferWorkspaceTitle(payload, locale);
      const description =
        payload.answers.goal ||
        payload.answers.project ||
        payload.answers.topic ||
        payload.answers.why ||
        payload.answers.format ||
        undefined;
      const ws = await createWorkspace({
        title,
        mode: payload.intent,
        description,
      });

      const starterBlocks = buildStarterBlocks(payload, locale);
      for (const [index, block] of starterBlocks.entries()) {
        await createBlock({
          workspace_id: ws.id,
          type: block.type,
          title: block.title,
          content_json: block.content_json,
          position: index,
        });
      }

      const welcome = isHu
        ? payload.intent === "learn"
          ? "Elokeszitettem egy indulostrukturat a tanulasi celodhoz. Finomitsuk egyutt."
          : payload.intent === "creative"
            ? "Elokeszitettem egy indulostrukturat a kreativ munkadhoz. Finomitsuk egyutt."
            : "Elokeszitettem egy indulostrukturat a projektedhez. Finomitsuk egyutt."
        : payload.intent === "learn"
          ? "I set up an initial workspace based on what you want to learn. We can refine it together."
          : payload.intent === "creative"
            ? "I set up an initial workspace for your creative direction. We can refine it together."
            : "I created a starting structure for your project. Let's refine it together.";

      const mentorWelcomeActions: SuggestedAction[] = isHu
        ? [
            { label: "Cel finomitasa", action: "Finomitsuk a celblokkot." },
            { label: "Otletek bovitese", action: "Bovitsuk az otleteket 5 eros irannyal." },
            { label: "Feladatlista", action: "Forditsuk ezt vegrehajthato feladatokka." },
            { label: "Brief keszites", action: "Keszits rovid briefet a jelenlegi blokkok alapjan." },
            { label: "Forras hozzaadasa", action: "Mutasd meg, milyen forrast erdemes eloszor betolteni." },
          ]
        : [
            { label: "Refine the goal", action: "Refine the goal block to be specific and testable." },
            { label: "Expand ideas", action: "Expand ideas into five strong directions." },
            { label: "Turn into tasks", action: "Turn this structure into executable tasks." },
            { label: "Create a brief", action: "Create a concise brief from the current blocks." },
            { label: "Add source material", action: "Show me the best first source material to add." },
          ];

      navigate(`/workspace/${ws.id}`, {
        state: { mentorWelcome: welcome, mentorWelcomeActions },
      });
    } catch (error) {
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen shell-app-bg text-[var(--shell-text)] flex items-center justify-center">{t("loading")}</div>;
  }

  if (workspaces.length === 0) {
    return <IntentOnboarding busy={creating} onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen shell-app-bg text-[var(--shell-text)]">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.2em] shell-muted">PUMi Studio</p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              {isHu ? "AI Mentor Workspace" : "AI Mentor Workspace"}
            </h1>
            <p className="shell-muted text-sm md:text-base">
              {user?.email ?? (isHu ? "Valassz munkateret vagy indits egy uj iranyt." : "Pick a workspace or start a new guided direction.")}
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full md:w-[360px]">
            <ThemeSwitcher />
            <Button
              onClick={() => setShowCreate(true)}
              className="h-11 rounded-xl bg-[var(--shell-accent-soft)] text-[var(--shell-text)] hover:opacity-90 gap-2"
            >
              <Plus className="h-4 w-4" />
              {t("newWorkspace")}
            </Button>
          </div>
        </div>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border shell-surface p-6 shadow-2xl">
              <h2 className="text-lg font-semibold mb-4">{t("newWorkspace")}</h2>
              <input
                className="w-full rounded-xl border shell-surface-2 px-3 py-2 text-sm bg-transparent mb-3 outline-none focus:border-[var(--shell-accent)]"
                placeholder={`${t("workspaceName")}...`}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />

              <div className="grid grid-cols-3 gap-2 mb-4">
                {(["build", "learn", "creative"] as WorkspaceMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setNewMode(mode)}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                      newMode === mode
                        ? "bg-[var(--shell-accent-soft)] border-[var(--shell-accent)]"
                        : "shell-surface-2"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {MODE_ICON[mode]}
                      {modeLabels[mode]}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowCreate(false)} className="shell-muted">
                  {t("cancel")}
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!newTitle.trim() || creating}
                  className="bg-[var(--shell-accent-soft)] text-[var(--shell-text)]"
                >
                  {creating ? creatingLabel : t("create")}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {workspaces.map((workspace) => (
            <Card
              key={workspace.id}
              className="border shell-surface cursor-pointer hover:translate-y-[-1px] transition"
              onClick={() => navigate(`/workspace/${workspace.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-medium line-clamp-2 text-[var(--shell-text)]">{workspace.title}</CardTitle>
                  <Badge className={`text-xs border ${MODE_COLOR[workspace.mode as WorkspaceMode]}`}>
                    {modeLabels[workspace.mode as WorkspaceMode]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs shell-muted line-clamp-3">
                  {workspace.description || (isHu ? "Nyisd meg es folytasd ott, ahol abbahagytad." : "Open and continue where you left off.")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
