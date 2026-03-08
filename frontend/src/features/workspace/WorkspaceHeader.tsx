import { BookOpen, ChevronLeft, Layers, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useTranslation } from "@/hooks/useTranslation";
import type { Workspace, WorkspaceMode } from "@/types/workspace";

interface Props {
  workspace: Workspace;
  onModeChange: (mode: WorkspaceMode) => void;
}

export function WorkspaceHeader({ workspace, onModeChange }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const modes: { id: WorkspaceMode; label: string; icon: React.ReactNode }[] = [
    { id: "build", label: t("modeBuild"), icon: <Layers className="h-3.5 w-3.5" /> },
    { id: "learn", label: t("modeLearn"), icon: <BookOpen className="h-3.5 w-3.5" /> },
    { id: "creative", label: t("modeCreative"), icon: <Sparkles className="h-3.5 w-3.5" /> },
  ];

  return (
    <header className="h-[62px] border-b border-[var(--shell-border)] bg-[var(--shell-surface)]/70 backdrop-blur-lg flex items-center justify-between px-4 shrink-0 sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => navigate("/dashboard")}
          className="h-8 w-8 rounded-lg border border-[var(--shell-border)] shell-muted hover:text-[var(--shell-text)] flex items-center justify-center shell-interactive"
          aria-label="Back to dashboard"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{workspace.title}</p>
          <p className="text-[11px] shell-muted">AI Mentor Workspace</p>
        </div>
      </div>

      <div className="flex items-center gap-1 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface-2)] p-1 shell-panel">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition shell-interactive ${
              workspace.mode === mode.id
                ? "bg-[var(--shell-accent-soft)] text-[var(--shell-text)]"
                : "shell-muted hover:text-[var(--shell-text)]"
            }`}
          >
            {mode.icon}
            {mode.label}
          </button>
        ))}
      </div>

      <div className="w-14" />
    </header>
  );
}
