import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layers, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";

import { ThemeSwitcher } from "@/features/workspace/ThemeSwitcher";
import { useTranslation } from "@/hooks/useTranslation";
import { createWorkspace, listWorkspaces } from "@/lib/api";
import type { Workspace } from "@/types/workspace";

interface Props {
  workspaceId: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function WorkspaceSidebar({ workspaceId, collapsed, onToggleCollapsed }: Props) {
  const navigate = useNavigate();
  const { lang } = useTranslation();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");

  useEffect(() => {
    listWorkspaces().then(setWorkspaces).catch(console.error);
  }, [workspaceId]);

  const createLabel = lang === "hu" ? "Új munkatér" : "New workspace";
  const myWorkspaces = lang === "hu" ? "Munkaterek" : "Workspaces";
  const countLabel = lang === "hu" ? `${workspaces.length} aktív` : `${workspaces.length} active`;

  const handleCreate = async () => {
    if (!title.trim()) return;

    const workspace = await createWorkspace({ title: title.trim(), mode: "build" });
    setTitle("");
    setShowCreate(false);
    setWorkspaces((prev) => [workspace, ...prev]);
    navigate(`/workspace/${workspace.id}`);
  };

  const sidebarToggleTitle = collapsed
    ? lang === "hu"
      ? "Oldalsáv nyitása"
      : "Expand sidebar"
    : lang === "hu"
      ? "Oldalsáv csukása"
      : "Collapse sidebar";

  return (
    <aside
      className={`border-r border-[var(--shell-border)]/70 bg-[var(--shell-surface)]/62 backdrop-blur-xl flex flex-col shrink-0 transition-[width] duration-200 ${
        collapsed ? "w-[58px] sm:w-[64px]" : "w-[196px] lg:w-[212px]"
      }`}
    >
      <div className="px-2.5 py-3 border-b border-[var(--shell-border)]/60 space-y-3">
        <div className="flex items-center justify-between gap-2">
          {!collapsed && (
            <div className="rounded-xl border border-[var(--shell-border)]/70 bg-[var(--shell-surface-2)]/55 px-2.5 py-2 min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.16em] shell-muted">Studio Rail</p>
              <p className="text-xs mt-1 font-medium truncate">{countLabel}</p>
            </div>
          )}
          <button
            onClick={onToggleCollapsed}
            className="h-8 w-8 rounded-lg border border-[var(--shell-border)]/70 flex items-center justify-center shell-muted hover:text-[var(--shell-text)] shell-interactive shrink-0"
            title={sidebarToggleTitle}
            aria-label={sidebarToggleTitle}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && <p className="text-[10px] uppercase tracking-[0.18em] shell-muted">{myWorkspaces}</p>}
          <button
            onClick={() => setShowCreate((prev) => !prev)}
            className="h-7 w-7 rounded-lg border border-[var(--shell-border)]/70 flex items-center justify-center shell-muted hover:text-[var(--shell-text)] shell-interactive"
            title={createLabel}
            aria-label={createLabel}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {showCreate && !collapsed && (
          <div className="space-y-2 rounded-xl border border-[var(--shell-border)]/70 bg-[var(--shell-surface-2)]/65 p-2">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={createLabel}
              className="w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface-2)] px-3 py-1.5 text-xs outline-none focus:border-[var(--shell-accent)] shell-interactive"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="flex-1 rounded-lg bg-[var(--shell-accent-soft)] px-2 py-1.5 text-xs font-medium shell-interactive"
              >
                {lang === "hu" ? "Létrehoz" : "Create"}
              </button>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setTitle("");
                }}
                className="rounded-lg border border-[var(--shell-border)] px-2 py-1.5 text-xs shell-muted shell-interactive"
              >
                {lang === "hu" ? "Mégse" : "Cancel"}
              </button>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {workspaces.map((workspace) => (
          <button
            key={workspace.id}
            onClick={() => navigate(`/workspace/${workspace.id}`)}
            title={workspace.title}
            className={`w-full flex items-center ${collapsed ? "justify-center" : "gap-2"} px-2 py-2 rounded-xl text-sm text-left shell-interactive ${
              workspace.id === workspaceId
                ? "bg-[var(--shell-accent-soft)] text-[var(--shell-text)] border border-[var(--shell-accent)]/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                : "shell-muted hover:text-[var(--shell-text)] hover:bg-[var(--shell-surface-2)]/70"
            }`}
          >
            {!collapsed && (
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  workspace.id === workspaceId ? "bg-[var(--shell-accent)]" : "bg-[var(--shell-border)]"
                }`}
              />
            )}
            <Layers className="h-3.5 w-3.5 shrink-0" />
            {!collapsed && <span className="truncate">{workspace.title}</span>}
          </button>
        ))}
      </nav>

      <div className={`px-2.5 py-3 border-t border-[var(--shell-border)]/60 ${collapsed ? "flex justify-center" : ""}`}>
        <ThemeSwitcher compact />
      </div>
    </aside>
  );
}
