import { useTranslation } from "@/hooks/useTranslation";
import type { SuggestedAction } from "@/types/mentor";

interface Props {
  actions: SuggestedAction[];
  onAction?: (action: string) => void;
}

export function SuggestedActions({ actions, onAction }: Props) {
  const { t } = useTranslation();

  if (!actions.length) return null;

  return (
    <div className="mt-2.5">
      <p className="text-[11px] uppercase tracking-wide shell-muted mb-1">{t("suggestedActions")}</p>
      <div className="flex flex-wrap gap-1.5">
        {actions.map((action, index) => (
          <button
            key={`${action.action}-${index}`}
            onClick={() => onAction?.(action.action)}
            className="text-xs rounded-full shell-chip px-2.5 py-1 shell-muted hover:text-[var(--shell-text)] shell-interactive"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
