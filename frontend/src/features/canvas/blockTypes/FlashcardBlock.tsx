import { useTranslation } from "@/hooks/useTranslation";
import type { CanvasBlock } from "@/types/canvas";

interface Flashcard {
  id?: string;
  front?: string;
  back?: string;
}

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

export function FlashcardBlock({ block }: Props) {
  const { lang } = useTranslation();
  const content = block.content_json as { cards?: Flashcard[] } | undefined;
  const cards = Array.isArray(content?.cards) ? content.cards : [];

  return (
    <div className="space-y-3">
      {cards.length === 0 ? (
        <p className="text-xs shell-muted italic">
          {lang === "hu" ? "A flashcardok ide kerülnek." : "Flashcards will appear here."}
        </p>
      ) : (
        cards.map((card, index) => (
          <div key={card.id ?? `${index}`} className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-highlight)] px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-wide shell-muted">
              {lang === "hu" ? "Előlap" : "Front"}
            </p>
            <p className="text-xs text-[var(--shell-text)]">{card.front || "-"}</p>
            <p className="text-[11px] uppercase tracking-wide shell-muted mt-2">
              {lang === "hu" ? "Hátlap" : "Back"}
            </p>
            <p className="text-xs text-[var(--shell-text)]/90">{card.back || "-"}</p>
          </div>
        ))
      )}
    </div>
  );
}
