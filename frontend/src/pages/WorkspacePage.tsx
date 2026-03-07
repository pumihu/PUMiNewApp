import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { CanvasView } from "@/features/canvas/CanvasView";
import { MentorPanel } from "@/features/mentor/MentorPanel";
import { WorkspaceHeader } from "@/features/workspace/WorkspaceHeader";
import { WorkspaceSidebar } from "@/features/workspace/WorkspaceSidebar";
import { useTranslation } from "@/hooks/useTranslation";
import { getWorkspace, listBlocks } from "@/lib/api";
import type { CanvasBlock } from "@/types/canvas";
import type { Workspace, WorkspaceMode } from "@/types/workspace";

export default function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { t, lang } = useTranslation();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [blocks, setBlocks] = useState<CanvasBlock[]>([]);
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;

    setLoading(true);
    Promise.all([getWorkspace(workspaceId), listBlocks(workspaceId)])
      .then(([ws, blks]) => {
        setWorkspace(ws);
        setBlocks(blks);
      })
      .catch((error) => {
        console.error(error);
        setWorkspace(null);
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const handleModeChange = (mode: WorkspaceMode) => {
    if (!workspace) return;
    setWorkspace({ ...workspace, mode });
  };

  const handleBlocksChange = (updated: CanvasBlock[]) => {
    setBlocks(updated);
  };

  const toggleBlockSelection = (id: string) => {
    setSelectedBlockIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const notFoundLabel = lang === "hu" ? "Munkaterulet nem talalhato." : "Workspace not found.";

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400 text-sm">
        {t("loading")}
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400 text-sm">
        {notFoundLabel}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      <WorkspaceHeader workspace={workspace} onModeChange={handleModeChange} />

      <div className="flex flex-1 overflow-hidden">
        <WorkspaceSidebar workspaceId={workspace.id} />

        <main className="flex-1 overflow-y-auto">
          <CanvasView
            workspace={workspace}
            blocks={blocks}
            selectedBlockIds={selectedBlockIds}
            onBlocksChange={handleBlocksChange}
            onToggleSelect={toggleBlockSelection}
          />
        </main>

        <MentorPanel workspace={workspace} selectedBlockIds={selectedBlockIds} />
      </div>
    </div>
  );
}
