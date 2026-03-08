import { useMemo, useState } from "react";
import { CheckSquare, X } from "lucide-react";

import { useTranslation } from "@/hooks/useTranslation";
import { deleteBlock } from "@/lib/api";
import type { BlockType, CanvasBlock } from "@/types/canvas";
import { AiStickyBlock } from "./blockTypes/AiStickyBlock";
import { CreativeBriefBlock } from "./blockTypes/CreativeBriefBlock";
import { IdeaBlock } from "./blockTypes/IdeaBlock";
import { ImageAssetBlock } from "./blockTypes/ImageAssetBlock";
import { NoteBlock } from "./blockTypes/NoteBlock";
import { SourceBlock } from "./blockTypes/SourceBlock";
import { StoryboardBlock } from "./blockTypes/StoryboardBlock";
import { SummaryBlock } from "./blockTypes/SummaryBlock";
import { TaskListBlock } from "./blockTypes/TaskListBlock";

interface Props {
  block: CanvasBlock;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onUpdate: (updated: CanvasBlock) => void;
  onDelete: (id: string) => void;
}

function BlockBody({
  block,
  onUpdate,
}: {
  block: CanvasBlock;
  onUpdate: (u: CanvasBlock) => void;
}) {
  switch (block.type) {
    case "note":
      return <NoteBlock block={block} onUpdate={onUpdate} />;
    case "task_list":
      return <TaskListBlock block={block} onUpdate={onUpdate} />;
    case "idea":
      return <IdeaBlock block={block} onUpdate={onUpdate} />;
    case "ai_sticky":
      return <AiStickyBlock block={block} onUpdate={onUpdate} />;
    case "source":
      return <SourceBlock block={block} onUpdate={onUpdate} />;
    case "summary":
      return <SummaryBlock block={block} onUpdate={onUpdate} />;
    case "creative_brief":
      return <CreativeBriefBlock block={block} onUpdate={onUpdate} />;
    case "image_asset":
      return <ImageAssetBlock block={block} onUpdate={onUpdate} />;
    case "storyboard":
      return <StoryboardBlock block={block} onUpdate={onUpdate} />;
    default:
      return <p className="text-xs shell-muted">Unknown block type.</p>;
  }
}

export function CanvasBlockCard({ block, selected, onToggleSelect, onUpdate, onDelete }: Props) {
  const { t, lang } = useTranslation();
  const [deleting, setDeleting] = useState(false);

  const blockTypeLabels: Record<BlockType, string> = useMemo(
    () => ({
      note: t("note"),
      task_list: t("taskList"),
      source: t("source"),
      summary: t("summary"),
      idea: t("idea"),
      ai_sticky: lang === "hu" ? "AI Insight" : "AI Insight",
      creative_brief: t("creativeBrief"),
      image_asset: t("imageAsset"),
      storyboard: t("storyboard"),
    }),
    [lang, t],
  );

  const confirmDeleteLabel = lang === "hu" ? "Toroljuk ezt a blokkot?" : "Delete this block?";
  const selectHint = lang === "hu" ? "Blokk kijelolese mentor kontextushoz" : "Select for mentor context";

  const handleDelete = async () => {
    if (!confirm(confirmDeleteLabel)) return;

    setDeleting(true);
    try {
      await deleteBlock(block.id);
      onDelete(block.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <article
      className={`relative rounded-2xl border p-4 transition shell-interactive ${
        selected
          ? "border-[var(--shell-accent)] bg-[var(--shell-accent-soft)] shadow-[0_0_0_1px_var(--shell-accent)]"
          : block.type === "ai_sticky"
            ? "ai-sticky-card hover:border-[var(--shell-accent)]/60"
            : "border-[var(--shell-border)] bg-[var(--shell-surface-2)] hover:border-[var(--shell-accent)]/60"
      }`}
    >
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => onToggleSelect(block.id)}
            className={`transition ${selected ? "text-[var(--shell-text)]" : "shell-muted hover:text-[var(--shell-text)]"}`}
            title={selectHint}
          >
            <CheckSquare className="h-3.5 w-3.5" />
          </button>
          <span className="text-[11px] uppercase tracking-[0.14em] shell-muted">{blockTypeLabels[block.type]}</span>
          {block.title && <span className="text-xs text-[var(--shell-text)] truncate">{block.title}</span>}
        </div>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="shell-muted hover:text-red-400 transition"
          title={t("deleteBlock")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      <BlockBody block={block} onUpdate={onUpdate} />
    </article>
  );
}
