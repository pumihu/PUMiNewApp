import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layers, Plus } from "lucide-react";

import { useTranslation } from "@/hooks/useTranslation";
import { createWorkspace, listWorkspaces } from "@/lib/api";
import type { Workspace } from "@/types/workspace";

interface Props {
  workspaceId: string;
}

export function WorkspaceSidebar({ workspaceId }: Props) {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  useEffect(() => {
    listWorkspaces().then(setWorkspaces).catch(console.error);
  }, []);

  const handleNew = async () => {
    const promptLabel = lang === "hu" ? `${t("workspaceName")}:` : "Workspace name:";
    const title = prompt(promptLabel);
    if (!title?.trim()) return;

    const ws = await createWorkspace({ title: title.trim(), mode: "build" });
    setWorkspaces((prev) => [ws, ...prev]);
    navigate(`/workspace/${ws.id}`);
  };

  return (
    <aside className="w-52 border-r border-neutral-800 flex flex-col bg-neutral-950 shrink-0 overflow-y-auto">
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{t("workspace")}</span>
        <button
          onClick={handleNew}
          className="text-neutral-500 hover:text-white transition"
          title={t("newWorkspace")}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 py-2">
        {workspaces.map((ws) => (
          <button
            key={ws.id}
            onClick={() => navigate(`/workspace/${ws.id}`)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition ${
              ws.id === workspaceId
                ? "bg-neutral-800 text-white"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <Layers className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{ws.title}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
