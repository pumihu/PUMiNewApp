import { useTranslation } from "@/hooks/useTranslation";
import type { CanvasBlock } from "@/types/canvas";

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

export function GoalBlock({ block }: Props) {
  const { lang } = useTranslation();
  const content = block.content_json as { goal?: string; success_criteria?: string[] } | undefined;
  const criteria = Array.isArray(content?.success_criteria) ? content.success_criteria : [];

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--shell-text)]/92 leading-relaxed whitespace-pre-wrap">
        {content?.goal ||
          (lang === "hu"
            ? "Itt jelenik meg a konkrét cél."
            : "The concrete goal will appear here.")}
      </p>

      {criteria.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wide shell-muted mb-1">
            {lang === "hu" ? "Sikerkritériumok" : "Success criteria"}
          </p>
          <ul className="space-y-1">
            {criteria.map((item, index) => (
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
