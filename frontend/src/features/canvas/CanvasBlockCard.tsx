import { useMemo, useState } from "react";
import { CheckSquare, X } from "lucide-react";

import { useTranslation } from "@/hooks/useTranslation";
import { deleteBlock } from "@/lib/api";
import type { BlockType, CanvasBlock } from "@/types/canvas";
import { AiStickyBlock } from "./blockTypes/AiStickyBlock";
import { BoardSectionBlock } from "./blockTypes/BoardSectionBlock";
import { BriefBlock } from "./blockTypes/BriefBlock";
import { CopyBlock } from "./blockTypes/CopyBlock";
import { CritiqueBlock } from "./blockTypes/CritiqueBlock";
import { CreativeBriefBlock } from "./blockTypes/CreativeBriefBlock";
import { FlashcardBlock } from "./blockTypes/FlashcardBlock";
import { GoalBlock } from "./blockTypes/GoalBlock";
import { IdeaBlock } from "./blockTypes/IdeaBlock";
import { ImageAssetBlock } from "./blockTypes/ImageAssetBlock";
import { ImageBlock } from "./blockTypes/ImageBlock";
import { ImageGenerationBlock } from "./blockTypes/ImageGenerationBlock";
import { LessonBlock } from "./blockTypes/LessonBlock";
import { LinkBlock } from "./blockTypes/LinkBlock";
import { MoodboardBlock } from "./blockTypes/MoodboardBlock";
import { NoteBlock } from "./blockTypes/NoteBlock";
import { PdfReferenceBlock } from "./blockTypes/PdfReferenceBlock";
import { QuizBlock } from "./blockTypes/QuizBlock";
import { ReferenceBoardBlock } from "./blockTypes/ReferenceBoardBlock";
import { RoadmapBlock } from "./blockTypes/RoadmapBlock";
import { StickerBlock } from "./blockTypes/StickerBlock";
import { SourceBlock } from "./blockTypes/SourceBlock";
import { StoryboardBlock } from "./blockTypes/StoryboardBlock";
import { SummaryBlock } from "./blockTypes/SummaryBlock";
import { TaskListBlock } from "./blockTypes/TaskListBlock";
import { GifBlock } from "./blockTypes/GifBlock";

interface Props {
  block: CanvasBlock;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onUpdate: (updated: CanvasBlock) => void;
  onDelete: (id: string) => void;
  className?: string;
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
    case "link":
      return <LinkBlock block={block} onUpdate={onUpdate} />;
    case "idea":
      return <IdeaBlock block={block} onUpdate={onUpdate} />;
    case "ai_sticky":
      return <AiStickyBlock block={block} onUpdate={onUpdate} />;
    case "source":
      return <SourceBlock block={block} onUpdate={onUpdate} />;
    case "pdf_reference":
      return <PdfReferenceBlock block={block} onUpdate={onUpdate} />;
    case "summary":
      return <SummaryBlock block={block} onUpdate={onUpdate} />;
    case "creative_brief":
      return <CreativeBriefBlock block={block} onUpdate={onUpdate} />;
    case "image_asset":
      return <ImageAssetBlock block={block} onUpdate={onUpdate} />;
    case "image":
      return <ImageBlock block={block} onUpdate={onUpdate} />;
    case "gif":
      return <GifBlock block={block} onUpdate={onUpdate} />;
    case "sticker":
      return <StickerBlock block={block} onUpdate={onUpdate} />;
    case "moodboard":
      return <MoodboardBlock block={block} onUpdate={onUpdate} />;
    case "reference_board":
      return <ReferenceBoardBlock block={block} onUpdate={onUpdate} />;
    case "storyboard":
      return <StoryboardBlock block={block} onUpdate={onUpdate} />;
    case "lesson":
      return <LessonBlock block={block} onUpdate={onUpdate} />;
    case "quiz":
      return <QuizBlock block={block} onUpdate={onUpdate} />;
    case "flashcard":
      return <FlashcardBlock block={block} onUpdate={onUpdate} />;
    case "goal":
      return <GoalBlock block={block} onUpdate={onUpdate} />;
    case "roadmap":
      return <RoadmapBlock block={block} onUpdate={onUpdate} />;
    case "critique":
      return <CritiqueBlock block={block} onUpdate={onUpdate} />;
    case "brief":
      return <BriefBlock block={block} onUpdate={onUpdate} />;
    case "image_generation":
      return <ImageGenerationBlock block={block} onUpdate={onUpdate} />;
    case "copy":
      return <CopyBlock block={block} onUpdate={onUpdate} />;
    case "board_section":
      return <BoardSectionBlock block={block} onUpdate={onUpdate} />;
    default:
      return <p className="text-xs shell-muted">Unknown block type.</p>;
  }
}

export function CanvasBlockCard({ block, selected, onToggleSelect, onUpdate, onDelete, className }: Props) {
  const { t, lang } = useTranslation();
  const [deleting, setDeleting] = useState(false);

  const blockTypeLabels: Record<BlockType, string> = useMemo(
    () => ({
      note: t("note"),
      task_list: t("taskList"),
      link: lang === "hu" ? "Link" : "Link",
      source: t("source"),
      pdf_reference: lang === "hu" ? "PDF referencia" : "PDF Reference",
      summary: t("summary"),
      idea: t("idea"),
      ai_sticky: "AI Insight",
      creative_brief: t("creativeBrief"),
      image_asset: t("imageAsset"),
      image: lang === "hu" ? "Kep" : "Image",
      gif: "GIF",
      sticker: lang === "hu" ? "Emoji / Sticker" : "Emoji / Sticker",
      moodboard: "Moodboard",
      reference_board: lang === "hu" ? "Reference Board" : "Reference Board",
      storyboard: t("storyboard"),
      lesson: lang === "hu" ? "Lecke" : "Lesson",
      quiz: lang === "hu" ? "Kvíz" : "Quiz",
      flashcard: lang === "hu" ? "Flashcard" : "Flashcards",
      goal: lang === "hu" ? "Cél" : "Goal",
      roadmap: "Roadmap",
      critique: lang === "hu" ? "Kritika" : "Critique",
      brief: "Brief",
      image_generation: lang === "hu" ? "Képgenerálás" : "Image Generation",
      copy: lang === "hu" ? "Szöveg" : "Copy",
      board_section: lang === "hu" ? "Board szekció" : "Board Section",
    }),
    [lang, t],
  );

  const confirmDeleteLabel = lang === "hu" ? "Töröljük ezt a blokkot?" : "Delete this block?";
  const selectHint =
    lang === "hu"
      ? "Blokk kijelölése mentor kontextushoz"
      : "Select for mentor context";

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
      className={`relative rounded-2xl border p-4 transition shell-interactive ${className ?? ""} ${
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
            className={`transition ${
              selected ? "text-[var(--shell-text)]" : "shell-muted hover:text-[var(--shell-text)]"
            }`}
            title={selectHint}
          >
            <CheckSquare className="h-3.5 w-3.5" />
          </button>
          <span className="text-[11px] uppercase tracking-[0.14em] shell-muted">
            {blockTypeLabels[block.type]}
          </span>
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
