import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Layers, Plus, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { createWorkspace, listWorkspaces } from "@/lib/api";
import type { Workspace, WorkspaceMode } from "@/types/workspace";

const MODE_ICON = {
  build: <Layers className="h-4 w-4" />,
  learn: <BookOpen className="h-4 w-4" />,
  creative: <Sparkles className="h-4 w-4" />,
};

const MODE_COLOR: Record<WorkspaceMode, string> = {
  build: "bg-blue-500/10 text-blue-600 border-blue-200",
  learn: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  creative: "bg-violet-500/10 text-violet-600 border-violet-200",
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

  const workspaceHeading = lang === "hu" ? "Munkateruletek" : "Workspaces";
  const workspaceSubtitle = user?.email ?? (lang === "hu" ? "AI mentor munkatered" : "Your AI mentor workspace");
  const creatingLabel = lang === "hu" ? "Letrehozas..." : "Creating...";

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

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{workspaceHeading}</h1>
            <p className="text-neutral-400 text-sm mt-1">{workspaceSubtitle}</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-white text-black hover:bg-neutral-200 gap-2">
            <Plus className="h-4 w-4" />
            {t("newWorkspace")}
          </Button>
        </div>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
              <h2 className="text-lg font-semibold mb-4">{t("newWorkspace")}</h2>
              <input
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:border-white transition"
                placeholder={`${t("workspaceName")}...`}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />

              <div className="flex gap-2 mb-4">
                {(["build", "learn", "creative"] as WorkspaceMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setNewMode(mode)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      newMode === mode
                        ? "bg-white text-black border-white"
                        : "bg-neutral-800 text-neutral-300 border-neutral-700 hover:border-neutral-500"
                    }`}
                  >
                    {MODE_ICON[mode]}
                    {modeLabels[mode]}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-neutral-400">
                  {t("cancel")}
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!newTitle.trim() || creating}
                  className="bg-white text-black hover:bg-neutral-200"
                >
                  {creating ? creatingLabel : t("create")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-neutral-500 text-sm">{t("loading")}</div>
        ) : workspaces.length === 0 ? (
          <div className="text-center py-24 text-neutral-500">
            <Layers className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>{t("noWorkspaces")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((workspace) => (
              <Card
                key={workspace.id}
                className="bg-neutral-900 border-neutral-800 hover:border-neutral-600 transition cursor-pointer"
                onClick={() => navigate(`/workspace/${workspace.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base font-medium text-white line-clamp-2">
                      {workspace.title}
                    </CardTitle>
                    <Badge className={`text-xs ml-2 shrink-0 border ${MODE_COLOR[workspace.mode as WorkspaceMode]}`}>
                      {modeLabels[workspace.mode as WorkspaceMode]}
                    </Badge>
                  </div>
                </CardHeader>
                {workspace.description && (
                  <CardContent className="pt-0">
                    <p className="text-neutral-400 text-xs line-clamp-2">{workspace.description}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
