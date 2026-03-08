import { useTranslation } from "@/hooks/useTranslation";
import type { CanvasBlock } from "@/types/canvas";

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

export function ImageAssetBlock({ block }: Props) {
  const { lang } = useTranslation();
  const content = block.content_json as { prompt?: string; url?: string; direction_name?: string } | undefined;

  const emptyLabel =
    lang === "hu"
      ? "Válassz vizuális irányt, és itt jelenik meg az első kép output."
      : "Pick a visual direction and your first generated image will appear here.";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[var(--shell-accent)] text-xs font-medium">
        <span>Image Asset</span>
      </div>

      {content?.direction_name && <p className="text-xs shell-muted font-medium">{content.direction_name}</p>}

      {content?.url ? (
        <img src={content.url} alt={content.direction_name ?? "asset"} className="rounded-xl w-full border border-[var(--shell-border)]" />
      ) : (
        <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-highlight)] h-36 flex items-center justify-center text-xs shell-muted px-4 text-center leading-relaxed">
          {emptyLabel}
        </div>
      )}

      {content?.prompt && <p className="text-xs shell-muted italic leading-relaxed">{content.prompt}</p>}
    </div>
  );
}
