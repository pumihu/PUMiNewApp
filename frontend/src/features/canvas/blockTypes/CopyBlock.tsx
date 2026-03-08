import { useTranslation } from "@/hooks/useTranslation";
import type { CanvasBlock } from "@/types/canvas";

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

export function CopyBlock({ block }: Props) {
  const { lang } = useTranslation();
  const content = block.content_json as
    | { channel?: string; text?: string; variations?: string[] }
    | undefined;
  const variations = Array.isArray(content?.variations) ? content.variations : [];

  return (
    <div className="space-y-2.5">
      {content?.channel && (
        <p className="text-[11px] uppercase tracking-wide shell-muted">{content.channel}</p>
      )}

      <p className="text-sm text-[var(--shell-text)]/90 leading-relaxed whitespace-pre-wrap">
        {content?.text ||
          (lang === "hu"
            ? "A mentor copy javaslata ide kerül."
            : "Mentor copy draft will appear here.")}
      </p>

      {variations.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wide shell-muted mb-1">
            {lang === "hu" ? "Variációk" : "Variations"}
          </p>
          <ul className="space-y-1">
            {variations.map((item, index) => (
              <li key={`${item}-${index}`} className="text-xs text-[var(--shell-text)]/88">
                - {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
