import { useTranslation } from "@/hooks/useTranslation";
import type { CanvasBlock } from "@/types/canvas";

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

export function BoardSectionBlock({ block }: Props) {
  const { lang } = useTranslation();
  const content = block.content_json as
    | {
        key?: string;
        subtitle?: string;
        color_theme?: string;
        default_type?: string;
      }
    | undefined;

  return (
    <div className="space-y-2">
      <p className="text-xs shell-muted leading-relaxed">
        {content?.subtitle ||
          (lang === "hu"
            ? "Ez egy board szekció konténer blokk."
            : "This is a board section container block.")}
      </p>
      <div className="grid grid-cols-2 gap-2 text-[11px] shell-muted">
        <p>
          {lang === "hu" ? "Kulcs:" : "Key:"}{" "}
          <span className="text-[var(--shell-text)]/90">{content?.key || "-"}</span>
        </p>
        <p>
          {lang === "hu" ? "Téma:" : "Theme:"}{" "}
          <span className="text-[var(--shell-text)]/90">{content?.color_theme || "-"}</span>
        </p>
        <p className="col-span-2">
          {lang === "hu" ? "Alap blokk:" : "Default block:"}{" "}
          <span className="text-[var(--shell-text)]/90">{content?.default_type || "-"}</span>
        </p>
      </div>
    </div>
  );
}
