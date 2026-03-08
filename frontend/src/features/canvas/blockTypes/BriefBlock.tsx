import { useTranslation } from "@/hooks/useTranslation";
import type { CanvasBlock } from "@/types/canvas";

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

export function BriefBlock({ block }: Props) {
  const { lang } = useTranslation();
  const content = block.content_json as
    | {
        title?: string;
        objective?: string;
        audience?: string;
        tone?: string;
        key_messages?: string[];
      }
    | undefined;

  const keyMessages = Array.isArray(content?.key_messages) ? content.key_messages : [];

  return (
    <div className="space-y-2.5">
      {content?.title && <p className="text-sm font-medium text-[var(--shell-text)]">{content.title}</p>}
      {content?.objective && (
        <p className="text-xs text-[var(--shell-text)]/90 leading-relaxed whitespace-pre-wrap">
          {content.objective}
        </p>
      )}
      {content?.audience && (
        <p className="text-xs shell-muted">
          {lang === "hu" ? "Célközönség:" : "Audience:"} {content.audience}
        </p>
      )}
      {content?.tone && (
        <p className="text-xs shell-muted">
          {lang === "hu" ? "Hangnem:" : "Tone:"} {content.tone}
        </p>
      )}
      {keyMessages.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wide shell-muted mb-1">
            {lang === "hu" ? "Kulcsüzenetek" : "Key messages"}
          </p>
          <ul className="space-y-1">
            {keyMessages.map((item, index) => (
              <li key={`${item}-${index}`} className="text-xs text-[var(--shell-text)]/88">
                - {item}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!content?.objective && !content?.title && (
        <p className="text-xs shell-muted italic">
          {lang === "hu" ? "A brief tartalma ide kerül." : "Brief content will appear here."}
        </p>
      )}
    </div>
  );
}
