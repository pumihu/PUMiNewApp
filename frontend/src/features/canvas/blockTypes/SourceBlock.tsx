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

  const wordsLabel = lang === "hu" ? "szo" : "words";
  const charsLabel = lang === "hu" ? "karakter" : "chars";
  const noExcerpt = lang === "hu" ? "Nincs forras reszlet." : "No source excerpt available.";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-blue-400 text-xs font-medium">
        <span>{t("source")}</span>
      </div>

      {content?.name && <p className="text-sm font-medium text-neutral-200">{content.name}</p>}

      <div className="flex flex-wrap gap-2 text-[11px] text-neutral-500">
        {typeof content?.word_count === "number" && <span>{content.word_count} {wordsLabel}</span>}
        {typeof content?.char_count === "number" && <span>{content.char_count} {charsLabel}</span>}
        {content?.source_type && <span>{content.source_type}</span>}
      </div>

      {content?.excerpt ? (
        <p className="text-xs text-neutral-400 leading-relaxed whitespace-pre-wrap line-clamp-6">{content.excerpt}</p>
      ) : (
        <p className="text-xs text-neutral-600 italic">{noExcerpt}</p>
      )}
    </div>
  );
}
