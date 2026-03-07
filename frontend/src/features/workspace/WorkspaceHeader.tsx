import { BookOpen, Layers, Sparkles } from "lucide-react";
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
    <header className="h-12 border-b border-neutral-800 flex items-center justify-between px-4 shrink-0 bg-neutral-950/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-neutral-500 hover:text-white transition text-sm"
          aria-label="Back to dashboard"
        >
          {"<-"}
        </button>
        <span className="text-sm font-medium text-white truncate">{workspace.title}</span>
      </div>

      <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
              workspace.mode === mode.id ? "bg-white text-black" : "text-neutral-400 hover:text-white"
            }`}
          >
            {mode.icon}
            {mode.label}
          </button>
        ))}
      </div>

      <div className="w-24" />
    </header>
  );
}

