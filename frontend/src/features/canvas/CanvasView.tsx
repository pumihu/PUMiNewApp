import { useMemo, useState } from "react";
import { FilePlus2, Plus } from "lucide-react";

import { CanvasBlockCard } from "./CanvasBlockCard";
import { UploadSourceDialog } from "@/features/documents/UploadSourceDialog";
import { useTranslation } from "@/hooks/useTranslation";
import { createBlock } from "@/lib/api";
import type { CanvasBlock, BlockType } from "@/types/canvas";
import type { DocumentSummaryBundle } from "@/types/document";
import type { Workspace } from "@/types/workspace";

const ADDABLE_BLOCKS: {
  type: BlockType;
  key: "note" | "taskList" | "idea" | "source" | "summary" | "creativeBrief" | "imageAsset" | "storyboard";
}[] = [
  { type: "note", key: "note" },
  { type: "task_list", key: "taskList" },
  { type: "idea", key: "idea" },
  { type: "source", key: "source" },
  { type: "summary", key: "summary" },
  { type: "creative_brief", key: "creativeBrief" },
  { type: "image_asset", key: "imageAsset" },
  { type: "storyboard", key: "storyboard" },
];

interface Props {
  workspace: Workspace;
  blocks: CanvasBlock[];
  selectedBlockIds: string[];
  onBlocksChange: (blocks: CanvasBlock[]) => void;
  onToggleSelect: (id: string) => void;
}

export function CanvasView({
  workspace,
  blocks,
  selectedBlockIds,
  onBlocksChange,
  onToggleSelect,
}: Props) {
  const { t, lang } = useTranslation();
  const [showPicker, setShowPicker] = useState(false);
  const [showSourceDialog, setShowSourceDialog] = useState(false);
  const [adding, setAdding] = useState(false);

  const addingLabel = lang === "hu" ? "Hozzaadas..." : "Adding...";
  const emptyCanvasTitle = lang === "hu" ? "A canvas ures." : "Your canvas is empty.";
  const emptyCanvasHint =
    lang === "hu" ? "Adj hozza legalabb egy blokkot az indulashoz." : "Add your first block to get started.";

  const blockLabels = useMemo(
    () => ({
      note: t("note"),
      taskList: t("taskList"),
      idea: t("idea"),
      source: t("source"),
      summary: t("summary"),
      creativeBrief: t("creativeBrief"),
      imageAsset: t("imageAsset"),
      storyboard: t("storyboard"),
    }),
    [t],
  );

  const handleAdd = async (type: BlockType) => {
    setShowPicker(false);
    setAdding(true);

    try {
      const block = await createBlock({
        workspace_id: workspace.id,
        type,
        position: blocks.length,
      });
      onBlocksChange([...blocks, block]);
    } catch (error) {
      console.error(error);
    } finally {
      setAdding(false);
    }
  };

  const handleSourceCompleted = (result: DocumentSummaryBundle) => {
    const byId = new Map<string, CanvasBlock>();

    for (const block of blocks) {
      byId.set(block.id, block);
    }

    byId.set(result.source_block.id, result.source_block);
    byId.set(result.summary_block.id, result.summary_block);

    const merged = [...byId.values()].sort(
      (left, right) => left.position - right.position || left.created_at.localeCompare(right.created_at),
    );

    onBlocksChange(merged);
  };

  const handleUpdate = (updated: CanvasBlock) => {
    onBlocksChange(blocks.map((block) => (block.id === updated.id ? updated : block)));
  };

  const handleDelete = (id: string) => {
    onBlocksChange(blocks.filter((block) => block.id !== id));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="relative mb-6 flex items-center gap-2">
        <button
          onClick={() => setShowPicker((value) => !value)}
          disabled={adding}
          className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition border border-neutral-800 rounded-lg px-3 py-2 hover:border-neutral-600"
        >
          <Plus className="h-4 w-4" />
          {adding ? addingLabel : t("addBlock")}
        </button>

        <button
          onClick={() => setShowSourceDialog(true)}
          className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white transition border border-neutral-700 rounded-lg px-3 py-2 hover:border-neutral-500 bg-neutral-900/70"
        >
          <FilePlus2 className="h-4 w-4" />
          {t("uploadSource")}
        </button>

        {showPicker && (
          <div className="absolute top-full mt-2 left-0 z-20 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-2 w-56">
            {ADDABLE_BLOCKS.map((item) => (
              <button
                key={item.type}
                onClick={() => handleAdd(item.type)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition text-left"
              >
                {blockLabels[item.key]}
              </button>
            ))}
          </div>
        )}
      </div>

      {showSourceDialog && (
        <UploadSourceDialog
          workspaceId={workspace.id}
          locale={lang === "hu" ? "hu" : "en"}
          onCompleted={handleSourceCompleted}
          onClose={() => setShowSourceDialog(false)}
        />
      )}

      {blocks.length === 0 ? (
        <div className="text-center py-20 text-neutral-600">
          <p className="text-sm">{emptyCanvasTitle}</p>
          <p className="text-xs mt-1">{emptyCanvasHint}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {blocks.map((block) => (
            <CanvasBlockCard
              key={block.id}
              block={block}
              selected={selectedBlockIds.includes(block.id)}
              onToggleSelect={onToggleSelect}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
