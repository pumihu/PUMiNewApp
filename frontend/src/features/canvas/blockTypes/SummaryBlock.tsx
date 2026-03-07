import { useTranslation } from "@/hooks/useTranslation";
import type { CanvasBlock } from "@/types/canvas";
import type { SummaryBlockContent } from "@/types/document";

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

export function SummaryBlock({ block }: Props) {
  const { t, lang } = useTranslation();
  const content = block.content_json as SummaryBlockContent | undefined;
  const keyPoints = Array.isArray(content?.key_points) ? content?.key_points : [];
  const suggested = Array.isArray(content?.suggested_next_actions) ? content?.suggested_next_actions : [];

  const noContent = lang === "hu" ? "Nincs tartalom." : "No content yet.";
  const keyPointsLabel = lang === "hu" ? "Kulcspontok" : "Key points";
  const nextActionsLabel = lang === "hu" ? "Javasolt kovetkezo lepesek" : "Suggested next actions";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
        <span>{t("summary")}</span>
      </div>

      {content?.text ? (
        <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{content.text}</p>
      ) : (
        <p className="text-xs text-neutral-600 italic">{noContent}</p>
      )}

      {keyPoints.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wide text-neutral-500 mb-1">{keyPointsLabel}</p>
          <ul className="space-y-1.5">
            {keyPoints.map((point, index) => (
              <li key={`${point}-${index}`} className="text-xs text-neutral-300 leading-relaxed flex gap-2">
                <span className="text-emerald-400">-</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {suggested.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wide text-neutral-500 mb-1">{nextActionsLabel}</p>
          <ul className="space-y-1.5">
            {suggested.map((item, index) => (
              <li key={`${item}-${index}`} className="text-xs text-neutral-300 leading-relaxed flex gap-2">
                <span className="text-neutral-500">{index + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
