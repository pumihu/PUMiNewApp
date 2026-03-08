import { useTranslation } from "@/hooks/useTranslation";
import type { CanvasBlock } from "@/types/canvas";

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

export function LessonBlock({ block }: Props) {
  const { lang } = useTranslation();
  const content = block.content_json as
    | { topic?: string; explanation?: string; key_points?: string[] }
    | undefined;

  const keyPoints = Array.isArray(content?.key_points) ? content.key_points : [];

  return (
    <div className="space-y-3">
      {content?.topic && <p className="text-xs shell-muted">{content.topic}</p>}

      <p className="text-sm text-[var(--shell-text)]/90 leading-relaxed whitespace-pre-wrap">
        {content?.explanation ||
          (lang === "hu"
            ? "A lecke szövege ide kerül."
            : "Lesson explanation will appear here.")}
      </p>

      {keyPoints.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wide shell-muted mb-1">
            {lang === "hu" ? "Kulcspontok" : "Key points"}
          </p>
          <ul className="space-y-1">
            {keyPoints.map((item, index) => (
              <li key={`${item}-${index}`} className="text-xs text-[var(--shell-text)]/88 flex gap-2">
                <span className="shell-muted">{index + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
