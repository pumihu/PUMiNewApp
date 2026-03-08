import { useTranslation } from "@/hooks/useTranslation";
import type { CanvasBlock } from "@/types/canvas";

interface Phase {
  id?: string;
  title?: string;
  outcome?: string;
}

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

export function RoadmapBlock({ block }: Props) {
  const { lang } = useTranslation();
  const content = block.content_json as { phases?: Phase[] } | undefined;
  const phases = Array.isArray(content?.phases) ? content.phases : [];

  return (
    <div className="space-y-2.5">
      {phases.length === 0 ? (
        <p className="text-xs shell-muted italic">
          {lang === "hu" ? "A roadmap fázisai ide kerülnek." : "Roadmap phases will appear here."}
        </p>
      ) : (
        phases.map((phase, index) => (
          <div key={phase.id ?? `${index}`} className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-highlight)] px-3 py-2">
            <p className="text-xs font-medium text-[var(--shell-text)]">
              {phase.title || `${lang === "hu" ? "Fázis" : "Phase"} ${index + 1}`}
            </p>
            <p className="text-xs shell-muted mt-0.5">{phase.outcome || "-"}</p>
          </div>
        ))
      )}
    </div>
  );
}
