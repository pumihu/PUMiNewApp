import { useMemo, useState } from "react";
import { CheckSquare, X } from "lucide-react";

import { useTranslation } from "@/hooks/useTranslation";
import { deleteBlock } from "@/lib/api";
import type { BlockType, CanvasBlock } from "@/types/canvas";
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
      return <p className="text-xs text-neutral-500">Unknown block type.</p>;
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
      creative_brief: t("creativeBrief"),
      image_asset: t("imageAsset"),
      storyboard: t("storyboard"),
    }),
    [t],
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
    <div
      className={`relative rounded-xl border p-4 transition group ${
        selected ? "border-white bg-neutral-800" : "border-neutral-800 bg-neutral-900 hover:border-neutral-700"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleSelect(block.id)}
            className={`transition ${selected ? "text-white" : "text-neutral-600 hover:text-neutral-400"}`}
            title={selectHint}
          >
            <CheckSquare className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{blockTypeLabels[block.type]}</span>
          {block.title && <span className="text-xs text-neutral-300 font-medium">- {block.title}</span>}
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-neutral-700 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
          title={t("deleteBlock")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <BlockBody block={block} onUpdate={onUpdate} />
    </div>
  );
}
