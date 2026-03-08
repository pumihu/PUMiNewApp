import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";

import { CanvasView } from "@/features/canvas/CanvasView";
import { MentorPanel } from "@/features/mentor/MentorPanel";
import { WorkspaceHeader } from "@/features/workspace/WorkspaceHeader";
import { WorkspaceSidebar } from "@/features/workspace/WorkspaceSidebar";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { createBlock, getWorkspace, listBlocks } from "@/lib/api";
import type { CanvasBlock } from "@/types/canvas";
import type { MentorCanvasCapturePayload, SuggestedAction } from "@/types/mentor";
import type { Workspace, WorkspaceMode } from "@/types/workspace";

interface WorkspaceLocationState {
  mentorWelcome?: string;
  mentorWelcomeActions?: SuggestedAction[];
}

export default function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const location = useLocation();
  const { t, lang } = useTranslation();
  const { toast } = useToast();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [blocks, setBlocks] = useState<CanvasBlock[]>([]);
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const mentorWelcome = useMemo(() => {
    const state = (location.state as WorkspaceLocationState | null) ?? null;
    return state?.mentorWelcome;
  }, [location.state]);

  const mentorWelcomeActions = useMemo(() => {
    const state = (location.state as WorkspaceLocationState | null) ?? null;
    return state?.mentorWelcomeActions ?? [];
  }, [location.state]);

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

  const toggleBlockSelection = (id: string) => {
    setSelectedBlockIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleCaptureMentorMessage = async (payload: MentorCanvasCapturePayload) => {
    if (!workspace) return;

    try {
      const nextPosition =
        blocks.length === 0 ? 0 : Math.max(...blocks.map((block) => block.position)) + 1;

      const created = await createBlock({
        workspace_id: workspace.id,
        type: "ai_sticky",
        title: "AI Insight",
        position: nextPosition,
        content_json: {
          section: "ideas",
          text: payload.text,
          source_message_id: payload.source_message_id,
          created_from: "mentor",
          created_at: new Date().toISOString(),
          action_type: payload.action_type,
        },
      });

      setBlocks((prev) =>
        [...prev, created].sort(
          (left, right) => left.position - right.position || left.created_at.localeCompare(right.created_at),
        ),
      );

      toast({
        description: lang === "hu" ? "Mentve a canvasra: AI Insight." : "Saved to canvas: AI Insight.",
      });
    } catch (error) {
      console.error(error);
      toast({
        description:
          lang === "hu"
            ? "Nem sikerult elmenteni a canvasra."
            : "Could not save this to canvas.",
        variant: "destructive",
      });
    }
  };

  const notFoundLabel = lang === "hu" ? "Munkaterulet nem talalhato." : "Workspace not found.";

  if (loading) {
    return (
      <div className="min-h-screen shell-app-bg text-[var(--shell-text)] flex items-center justify-center text-sm">
        {t("loading")}
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen shell-app-bg text-[var(--shell-text)] flex items-center justify-center text-sm">
        {notFoundLabel}
      </div>
    );
  }

  return (
    <div className="min-h-screen shell-app-bg text-[var(--shell-text)] flex flex-col">
      <WorkspaceHeader workspace={workspace} onModeChange={handleModeChange} />

      <div className="flex flex-1 overflow-hidden">
        <WorkspaceSidebar workspaceId={workspace.id} />

        <main className="flex-1 overflow-y-auto">
          <CanvasView
            workspace={workspace}
            blocks={blocks}
            selectedBlockIds={selectedBlockIds}
            onBlocksChange={setBlocks}
            onToggleSelect={toggleBlockSelection}
            onCaptureMentorMessage={handleCaptureMentorMessage}
          />
        </main>

        <MentorPanel
          workspace={workspace}
          blocks={blocks}
          selectedBlockIds={selectedBlockIds}
          initialWelcomeMessage={mentorWelcome}
          initialWelcomeActions={mentorWelcomeActions}
          onCaptureMentorMessage={handleCaptureMentorMessage}
        />
      </div>
    </div>
  );
}
