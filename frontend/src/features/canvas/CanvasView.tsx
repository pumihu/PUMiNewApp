import { useMemo, useRef, useState, type DragEvent } from "react";
import { FilePlus2, Plus, Sparkles } from "lucide-react";

import { CanvasBlockCard } from "./CanvasBlockCard";
import { UploadSourceDialog } from "@/features/documents/UploadSourceDialog";
import { useTranslation } from "@/hooks/useTranslation";
import { createBlock } from "@/lib/api";
import type { CanvasBlock, BlockType } from "@/types/canvas";
import type { DocumentSummaryBundle } from "@/types/document";
import { MENTOR_MESSAGE_DND_MIME, type MentorCanvasCapturePayload } from "@/types/mentor";
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

type SectionId = "ideas" | "plan" | "sources" | "output";

function resolveSection(block: CanvasBlock): SectionId {
  const content = block.content_json as { section?: string } | undefined;
  if (content?.section === "ideas" || content?.section === "plan" || content?.section === "sources" || content?.section === "output") {
    return content.section;
  }

  if (block.type === "source" || block.type === "summary") return "sources";
  if (block.type === "task_list" || block.type === "creative_brief") return "plan";
  if (block.type === "storyboard" || block.type === "image_asset") return "output";
  if (block.type === "ai_sticky") return "ideas";
  return "ideas";
}

function defaultContentForType(type: BlockType, section: SectionId, lang: "en" | "hu") {
  if (type === "note") {
    return {
      section,
      text: lang === "hu" ? "Rovid, lenyegi jegyzet a kovetkezo lepeshez." : "Capture the sharpest thought that should guide the next step.",
    };
  }

  if (type === "idea") {
    return {
      section,
      text: lang === "hu" ? "Milyen iranyokban eri meg tovabbgondolni?" : "Which directions are worth exploring next?",
    };
  }

  if (type === "task_list") {
    return {
      section,
      tasks: [
        {
          id: crypto.randomUUID(),
          text: lang === "hu" ? "Definiald a kovetkezo merfoldkovet." : "Define the next milestone.",
          done: false,
        },
      ],
    };
  }

  if (type === "source") {
    return {
      section,
      name: lang === "hu" ? "Forras" : "Source",
      excerpt: lang === "hu" ? "Adj hozza szoveges forrast a gyors osszefoglalashoz." : "Add source material for mentor-ready summarization.",
    };
  }

  if (type === "summary") {
    return {
      section,
      text: lang === "hu" ? "Itt gyulik majd a lenyegi osszefoglalo." : "This section will hold the distilled summary.",
      key_points: [],
    };
  }

  if (type === "creative_brief") {
    return {
      section,
      title: lang === "hu" ? "Kreativ brief" : "Creative Brief",
      objective: "",
      audience: "",
      tone: "",
      key_messages: [],
    };
  }

  if (type === "storyboard") {
    return { section, scenes: [] };
  }

  return { section };
}

interface Props {
  workspace: Workspace;
  blocks: CanvasBlock[];
  selectedBlockIds: string[];
  onBlocksChange: (blocks: CanvasBlock[]) => void;
  onToggleSelect: (id: string) => void;
  onCaptureMentorMessage?: (payload: MentorCanvasCapturePayload) => Promise<void> | void;
}

export function CanvasView({
  workspace,
  blocks,
  selectedBlockIds,
  onBlocksChange,
  onToggleSelect,
  onCaptureMentorMessage,
}: Props) {
  const { t, lang } = useTranslation();
  const isHu = lang === "hu";

  const [showPicker, setShowPicker] = useState(false);
  const [showSourceDialog, setShowSourceDialog] = useState(false);
  const [adding, setAdding] = useState(false);
  const [mentorDropActive, setMentorDropActive] = useState(false);
  const dragDepthRef = useRef(0);

  const sections = useMemo(
    () => [
      {
        id: "ideas" as SectionId,
        title: isHu ? "Otletek" : "Ideas",
        hint: isHu ? "Mit akarsz letisztazni?" : "What should become clearer next?",
        defaultType: "idea" as BlockType,
      },
      {
        id: "plan" as SectionId,
        title: isHu ? "Terv" : "Plan",
        hint: isHu ? "Melyik a kovetkezo vegrehajthato lepes?" : "What is the next executable move?",
        defaultType: "task_list" as BlockType,
      },
      {
        id: "sources" as SectionId,
        title: isHu ? "Forrasok" : "Sources",
        hint: isHu ? "Hozz be anyagot, a mentor strukturalt osszefoglalot ad." : "Bring material in, let the mentor summarize it.",
        defaultType: "source" as BlockType,
      },
      {
        id: "output" as SectionId,
        title: isHu ? "Output" : "Output",
        hint: isHu ? "Itt formalodik a vegleges eredmeny." : "This is where the final output takes shape.",
        defaultType: "summary" as BlockType,
      },
    ],
    [isHu],
  );

  const grouped = useMemo(() => {
    const map: Record<SectionId, CanvasBlock[]> = {
      ideas: [],
      plan: [],
      sources: [],
      output: [],
    };

    for (const block of blocks) {
      map[resolveSection(block)].push(block);
    }

    for (const key of Object.keys(map) as SectionId[]) {
      map[key] = map[key].sort(
        (left, right) => left.position - right.position || left.created_at.localeCompare(right.created_at),
      );
    }

    return map;
  }, [blocks]);

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

  const addLabel = isHu ? "Blokk hozzaadas" : "Add block";
  const dropHint = isHu
    ? "Dobd ide, es AI Insight blokkent mentem a canvasra."
    : "Drop here to save this as an AI Insight on your canvas.";

  const hasMentorPayloadType = (event: DragEvent<HTMLElement>) =>
    Array.from(event.dataTransfer.types).includes(MENTOR_MESSAGE_DND_MIME);

  const parseMentorPayload = (event: DragEvent<HTMLElement>): Omit<MentorCanvasCapturePayload, "action_type"> | null => {
    const raw = event.dataTransfer.getData(MENTOR_MESSAGE_DND_MIME);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as { source_message_id?: string; text?: string };
      if (!parsed.source_message_id || !parsed.text) return null;
      return {
        source_message_id: parsed.source_message_id,
        text: parsed.text,
      };
    } catch {
      return null;
    }
  };

  const handleAdd = async (type: BlockType, sectionId?: SectionId) => {
    setShowPicker(false);
    setAdding(true);

    try {
      const block = await createBlock({
        workspace_id: workspace.id,
        type,
        content_json: sectionId ? defaultContentForType(type, sectionId, isHu ? "hu" : "en") : {},
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
    const sourceBlock: CanvasBlock = {
      ...result.source_block,
      content_json: {
        ...(result.source_block.content_json ?? {}),
        section: "sources",
      },
    };

    const summaryBlock: CanvasBlock = {
      ...result.summary_block,
      content_json: {
        ...(result.summary_block.content_json ?? {}),
        section: "sources",
      },
    };

    const byId = new Map<string, CanvasBlock>();
    for (const block of blocks) {
      byId.set(block.id, block);
    }

    byId.set(sourceBlock.id, sourceBlock);
    byId.set(summaryBlock.id, summaryBlock);

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

  const handleMentorDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!hasMentorPayloadType(event)) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setMentorDropActive(true);
  };

  const handleMentorDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!hasMentorPayloadType(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleMentorDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!mentorDropActive && !hasMentorPayloadType(event)) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setMentorDropActive(false);
    }
  };

  const handleMentorDrop = async (event: DragEvent<HTMLDivElement>) => {
    if (!mentorDropActive && !hasMentorPayloadType(event)) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setMentorDropActive(false);

    const payload = parseMentorPayload(event);
    if (!payload || !onCaptureMentorMessage) return;

    await onCaptureMentorMessage({
      ...payload,
      action_type: "drag",
    });
  };

  return (
    <div
      className={`relative p-6 md:p-7 max-w-5xl mx-auto space-y-5 transition ${
        mentorDropActive ? "ring-2 ring-[var(--shell-accent)]/65 rounded-3xl shell-drop-active" : ""
      }`}
      onDragEnter={handleMentorDragEnter}
      onDragOver={handleMentorDragOver}
      onDragLeave={handleMentorDragLeave}
      onDrop={handleMentorDrop}
    >
      {mentorDropActive && (
        <div className="pointer-events-none rounded-2xl border border-dashed border-[var(--shell-accent)] bg-[var(--shell-accent-soft)] px-4 py-3 text-sm inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          {dropHint}
        </div>
      )}

      <div className="rounded-2xl shell-panel p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] shell-muted">Workspace Surface</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{workspace.title}</h2>
            <p className="text-sm shell-muted">
              {isHu
                ? "A mentor itt segit strukturalni, tisztazni es kivitelezni a kovetkezo lepeseket."
                : "Your mentor helps you structure, clarify, and execute the next meaningful step."}
            </p>
          </div>

          <div className="relative flex items-center gap-2">
            <button
              onClick={() => setShowPicker((value) => !value)}
              disabled={adding}
              className="inline-flex items-center gap-2 rounded-xl border shell-surface-2 px-3 py-2 text-sm shell-muted hover:text-[var(--shell-text)] shell-interactive"
            >
              <Plus className="h-4 w-4" />
              {adding ? (isHu ? "Hozzaadas..." : "Adding...") : addLabel}
            </button>

            <button
              onClick={() => setShowSourceDialog(true)}
              className="inline-flex items-center gap-2 rounded-xl border shell-surface-2 px-3 py-2 text-sm text-[var(--shell-text)] shell-interactive"
            >
              <FilePlus2 className="h-4 w-4" />
              {t("uploadSource")}
            </button>

            {showPicker && (
              <div className="absolute right-0 top-full mt-2 z-30 w-60 rounded-xl border shell-panel p-2 shadow-xl">
                {ADDABLE_BLOCKS.map((item) => (
                  <button
                    key={item.type}
                    onClick={() => handleAdd(item.type)}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm shell-muted hover:text-[var(--shell-text)] hover:bg-[var(--shell-accent-soft)] shell-interactive"
                  >
                    {blockLabels[item.key]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showSourceDialog && (
        <UploadSourceDialog
          workspaceId={workspace.id}
          locale={isHu ? "hu" : "en"}
          onCompleted={handleSourceCompleted}
          onClose={() => setShowSourceDialog(false)}
        />
      )}

      <div className="space-y-5">
        {sections.map((section) => {
          const sectionBlocks = grouped[section.id];

          return (
            <section key={section.id} className="rounded-2xl shell-panel p-4 md:p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold tracking-wide">{section.title}</h3>
                  <p className="text-xs shell-muted mt-1">{section.hint}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="shell-chip rounded-full px-2 py-1 text-[11px] shell-muted">{sectionBlocks.length}</span>
                  <button
                    onClick={() => handleAdd(section.defaultType, section.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border shell-surface-2 px-2.5 py-1.5 text-xs shell-muted hover:text-[var(--shell-text)] shell-interactive"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {isHu ? "Uj blokk" : "Add"}
                  </button>
                </div>
              </div>

              {sectionBlocks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--shell-border)]/80 bg-[var(--shell-surface-2)]/70 px-4 py-6 text-xs shell-muted leading-relaxed">
                  {isHu
                    ? "Ez a szekcio meg ures. Adj hozza blokkot vagy kerd a mentort, hogy javasoljon kovetkezo lepest."
                    : "This section is empty for now. Add a block or ask your mentor to suggest the next move."}
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {sectionBlocks.map((block) => (
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
            </section>
          );
        })}
      </div>
    </div>
  );
}

