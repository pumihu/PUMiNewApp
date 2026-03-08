import { useTranslation } from "@/hooks/useTranslation";
import type { CanvasBlock } from "@/types/canvas";
import type { SourceBlockContent } from "@/types/document";

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

export function SourceBlock({ block }: Props) {
  const { t, lang } = useTranslation();
  const content = block.content_json as SourceBlockContent | undefined;

  const wordsLabel = lang === "hu" ? "szó" : "words";
  const charsLabel = lang === "hu" ? "karakter" : "chars";
  const noExcerpt = lang === "hu" ? "Adj forrásrészletet a pontosabb mentor kontextushoz." : "Add source context so mentor responses stay grounded.";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[var(--shell-accent)] text-xs font-medium">
        <span>{t("source")}</span>
      </div>

      {content?.name && <p className="text-sm font-medium text-[var(--shell-text)]">{content.name}</p>}

      <div className="flex flex-wrap gap-1.5 text-[11px] shell-muted">
        {typeof content?.word_count === "number" && <span className="shell-chip rounded-full px-2 py-0.5">{content.word_count} {wordsLabel}</span>}
        {typeof content?.char_count === "number" && <span className="shell-chip rounded-full px-2 py-0.5">{content.char_count} {charsLabel}</span>}
        {content?.source_type && <span className="shell-chip rounded-full px-2 py-0.5">{content.source_type}</span>}
      </div>

      {content?.excerpt ? (
        <p className="text-xs shell-muted leading-relaxed whitespace-pre-wrap line-clamp-6">{content.excerpt}</p>
      ) : (
        <p className="text-xs shell-muted italic">{noExcerpt}</p>
      )}
    </div>
  );
}
