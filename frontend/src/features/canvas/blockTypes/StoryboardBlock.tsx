import { useTranslation } from "@/hooks/useTranslation";
import type { CanvasBlock } from "@/types/canvas";
import type { StoryboardScene } from "@/types/creative";

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

export function StoryboardBlock({ block }: Props) {
  const { lang } = useTranslation();
  const content = block.content_json as { scenes?: StoryboardScene[] } | undefined;
  const scenes = content?.scenes ?? [];

  const emptyText =
    lang === "hu"
      ? "Adj 3-4 jelenetvazlatot, es a mentor segit finomhangolni a ritmust."
      : "Drop 3-4 scene beats here and the mentor will help sharpen pacing and flow.";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[var(--shell-accent)] text-xs font-medium">
        <span>Storyboard</span>
      </div>

      {scenes.length === 0 ? (
        <p className="text-xs shell-muted italic">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {scenes.map((scene, index) => (
            <div key={index} className="border border-[var(--shell-border)] rounded-xl p-3 space-y-1.5 bg-[var(--shell-highlight)]">
              <p className="text-xs font-semibold text-[var(--shell-text)]">
                {index + 1}. {scene.scene_title}
              </p>
              <p className="text-xs shell-muted">
                <span className="text-[var(--shell-muted)]">Camera:</span> {scene.camera_direction}
              </p>
              <p className="text-xs text-[var(--shell-text)]/90 italic">"{scene.voiceover}"</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
