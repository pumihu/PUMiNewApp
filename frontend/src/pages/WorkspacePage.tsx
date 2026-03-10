import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";

import { CanvasSurface } from "@/features/canvas/CanvasSurface";
import { MentorPanel } from "@/features/mentor/MentorPanel";
import { WorkspaceHeader } from "@/features/workspace/WorkspaceHeader";
import { WorkspaceSidebar } from "@/features/workspace/WorkspaceSidebar";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { createBlock, getWorkspace, listBlocks, updateWorkspace } from "@/lib/api";
import type { BlockType, CanvasBlock } from "@/types/canvas";
import type { MentorCanvasCapturePayload, SuggestedAction } from "@/types/mentor";
import type { Workspace, WorkspaceMode } from "@/types/workspace";

interface WorkspaceLocationState {
  mentorWelcome?: string;
  mentorWelcomeActions?: SuggestedAction[];
}

interface CanvasLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

function normalizeBlocks(blocks: CanvasBlock[]): CanvasBlock[] {
  const byId = new Map<string, CanvasBlock>();
  for (const block of blocks) {
    byId.set(block.id, block);
  }

  return [...byId.values()].sort(
    (left, right) =>
      left.position - right.position ||
      left.created_at.localeCompare(right.created_at) ||
      left.id.localeCompare(right.id),
  );
}

function resolveMentorSection(blockType: BlockType): "ideas" | "plan" | "sources" | "output" {
  if (blockType === "board_section") return "ideas";
  if (blockType === "source" || blockType === "summary" || blockType === "link" || blockType === "pdf_reference") return "sources";
  if (
    blockType === "task_list" ||
    blockType === "roadmap" ||
    blockType === "quiz" ||
    blockType === "flashcard"
  ) {
    return "plan";
  }
  if (
    blockType === "storyboard" ||
    blockType === "image_asset" ||
    blockType === "image" ||
    blockType === "gif" ||
    blockType === "sticker" ||
    blockType === "moodboard" ||
    blockType === "reference_board" ||
    blockType === "image_generation" ||
    blockType === "copy" ||
    blockType === "critique"
  ) {
    return "output";
  }
  return "ideas";
}

function defaultMentorLayout(blockType: BlockType, existingCount: number): CanvasLayout {
  const col = existingCount % 3;
  const row = Math.floor(existingCount / 3);
  const x = 48 + col * 320;
  const y = 72 + row * 260;

  if (blockType === "ai_sticky") return { x, y, width: 260, height: 200 };
  if (blockType === "task_list" || blockType === "quiz") return { x, y, width: 320, height: 250 };
  if (blockType === "moodboard" || blockType === "reference_board") return { x, y, width: 360, height: 290 };
  if (blockType === "storyboard" || blockType === "image_generation") return { x, y, width: 380, height: 300 };
  return { x, y, width: 310, height: 230 };
}

export default function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const location = useLocation();
  const { t, lang } = useTranslation();
  const { toast } = useToast();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [blocks, setBlocks] = useState<CanvasBlock[]>([]);
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [mentorOpen, setMentorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const blocksRef = useRef<CanvasBlock[]>([]);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => {
    const stored = localStorage.getItem("pumi_workspace_sidebar_collapsed");
    if (stored === "0") {
      setSidebarCollapsed(false);
      return;
    }
    if (stored === "1") {
      setSidebarCollapsed(true);
      return;
    }
    setSidebarCollapsed(true);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1279px)");
    const apply = () => {
      const compact = media.matches;
      setIsCompactLayout(compact);
      if (!compact) {
        setMentorOpen(false);
      }
    };

    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

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
        const normalized = normalizeBlocks(blks);
        blocksRef.current = normalized;
        setBlocks(normalized);
      })
      .catch((error) => {
        console.error(error);
        setWorkspace(null);
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    setSelectedBlockIds((previous) =>
      previous.filter((id) => blocks.some((block) => block.id === id)),
    );
  }, [blocks]);

  const handleModeChange = async (mode: WorkspaceMode) => {
    if (!workspace) return;
    const previous = workspace;
    setWorkspace({ ...workspace, mode });
    try {
      const updated = await updateWorkspace(workspace.id, { mode });
      setWorkspace(updated);
    } catch (error) {
      console.error(error);
      setWorkspace(previous);
      toast({
        description:
          lang === "hu"
            ? "Nem sikerült menteni a módváltást."
            : "Could not save mode change.",
        variant: "destructive",
      });
    }
  };

  const handleSidebarToggle = () => {
    setSidebarCollapsed((previous) => {
      const next = !previous;
      localStorage.setItem("pumi_workspace_sidebar_collapsed", next ? "1" : "0");
      return next;
    });
  };

  const handleCaptureMentorMessage = async (payload: MentorCanvasCapturePayload) => {
    if (!workspace) return;

    try {
      const nextPosition =
        blocksRef.current.length === 0
          ? 0
          : Math.max(...blocksRef.current.map((block) => block.position)) + 1;

      const generated = payload.generated_block;
      const blockType: BlockType = generated?.block_type ?? "ai_sticky";
      const blockTitle = generated?.title ?? "AI Insight";
      const section = payload.target_section_key ?? resolveMentorSection(blockType);
      const layout = payload.target_layout ?? defaultMentorLayout(blockType, blocksRef.current.length);
      const sourceContent =
        generated?.content_json && typeof generated.content_json === "object"
          ? generated.content_json
          : { text: payload.text };

      const sourceText = (sourceContent as { text?: unknown }).text;
      const baseMentorMeta = {
        source_message_id: payload.source_message_id,
        created_from: "mentor",
        created_at: new Date().toISOString(),
        action_type: payload.action_type,
        generated_block_type: generated?.block_type ?? null,
        generated_reason: generated?.reason ?? null,
      };

      const contentJson =
        blockType === "board_section"
          ? {
              ...sourceContent,
              ...baseMentorMeta,
            }
          : {
              section,
              section_key: section,
              ...sourceContent,
              layout,
              text: typeof sourceText === "string" && sourceText.trim() ? sourceText : payload.text,
              ...baseMentorMeta,
            };

      const created = await createBlock({
        workspace_id: workspace.id,
        type: blockType,
        title: blockTitle,
        position: nextPosition,
        content_json: contentJson,
      });

      const next = normalizeBlocks([...blocksRef.current, created]);
      blocksRef.current = next;
      setBlocks(next);

      toast({
        description:
          lang === "hu" ? `Mentve a vászonra: ${blockTitle}.` : `Saved to canvas: ${blockTitle}.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        description:
          lang === "hu" ? "Nem sikerült elmenteni a vászonra." : "Could not save this to canvas.",
        variant: "destructive",
      });
    }
  };

  const notFoundLabel = lang === "hu" ? "A munkatér nem található." : "Workspace not found.";
  const showSidebar = !isCompactLayout || !sidebarCollapsed;

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
      <WorkspaceHeader
        workspace={workspace}
        onModeChange={handleModeChange}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={handleSidebarToggle}
        showMentorToggle={isCompactLayout}
        mentorOpen={mentorOpen}
        onToggleMentor={() => setMentorOpen((value) => !value)}
      />

      <div className="flex flex-1 overflow-hidden gap-0">
        {showSidebar ? (
          <WorkspaceSidebar
            workspaceId={workspace.id}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={handleSidebarToggle}
          />
        ) : null}

        <main className="flex-1 min-w-0 overflow-hidden">
          <CanvasSurface
            workspace={workspace}
            blocks={blocks}
            selectedBlockIds={selectedBlockIds}
            onBlocksChange={(next) => {
              const normalized = normalizeBlocks(next);
              blocksRef.current = normalized;
              setBlocks(normalized);
            }}
            onSelectionChange={setSelectedBlockIds}
            onCaptureMentorMessage={handleCaptureMentorMessage}
          />
        </main>

        {!isCompactLayout ? (
          <MentorPanel
            workspace={workspace}
            blocks={blocks}
            selectedBlockIds={selectedBlockIds}
            initialWelcomeMessage={mentorWelcome}
            initialWelcomeActions={mentorWelcomeActions}
            onCaptureMentorMessage={handleCaptureMentorMessage}
          />
        ) : null}
      </div>

      {isCompactLayout && mentorOpen ? (
        <div className="fixed inset-0 top-[60px] z-40">
          <button
            onClick={() => setMentorOpen(false)}
            className="absolute inset-0 bg-black/28 backdrop-blur-[1px]"
            aria-label={lang === "hu" ? "Mentor panel bezárása" : "Close mentor panel"}
          />
          <div className="absolute right-0 top-0 h-full w-full sm:w-[380px] max-w-full">
            <MentorPanel
              workspace={workspace}
              blocks={blocks}
              selectedBlockIds={selectedBlockIds}
              initialWelcomeMessage={mentorWelcome}
              initialWelcomeActions={mentorWelcomeActions}
              onCaptureMentorMessage={handleCaptureMentorMessage}
              className="h-full w-full max-w-full shadow-2xl"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
