import { useTranslation } from "@/hooks/useTranslation";
import type { CanvasBlock } from "@/types/canvas";

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

function renderList(title: string, items: string[]) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide shell-muted mb-1">{title}</p>
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="text-xs text-[var(--shell-text)]/88">
            - {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CritiqueBlock({ block }: Props) {
  const { lang } = useTranslation();
  const content = block.content_json as
    | { strengths?: string[]; risks?: string[]; improvements?: string[]; text?: string }
    | undefined;

  const strengths = Array.isArray(content?.strengths) ? content.strengths : [];
  const risks = Array.isArray(content?.risks) ? content.risks : [];
  const improvements = Array.isArray(content?.improvements) ? content.improvements : [];

  return (
    <div className="space-y-3">
      {content?.text && (
        <p className="text-xs shell-muted leading-relaxed whitespace-pre-wrap">{content.text}</p>
      )}
      {renderList(lang === "hu" ? "Erősségek" : "Strengths", strengths)}
      {renderList(lang === "hu" ? "Kockázatok" : "Risks", risks)}
      {renderList(lang === "hu" ? "Fejlesztések" : "Improvements", improvements)}
      {!content?.text && strengths.length === 0 && risks.length === 0 && improvements.length === 0 && (
        <p className="text-xs shell-muted italic">
          {lang === "hu" ? "A kritika blokk tartalma ide kerül." : "Critique content will appear here."}
        </p>
      )}
    </div>
  );
}
