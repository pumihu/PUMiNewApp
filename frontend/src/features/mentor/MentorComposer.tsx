import { useState } from "react";
import { Send } from "lucide-react";

import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function MentorComposer({ onSend, disabled }: Props) {
  const { t, lang } = useTranslation();
  const [value, setValue] = useState("");

  const helperText =
    lang === "hu"
      ? "Shift+Enter uj sorhoz, Enter kuldeshez"
      : "Shift+Enter for new line, Enter to send";

  const handleSend = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
  };

  return (
    <div className="border-t border-[var(--shell-border)] p-3 space-y-1">
      <div className="flex items-end gap-2 rounded-xl border shell-surface-2 px-3 py-2 shell-interactive">
        <textarea
          className="flex-1 bg-transparent text-sm text-[var(--shell-text)] placeholder-[var(--shell-muted)] resize-none outline-none max-h-32"
          placeholder={t("mentorPlaceholder")}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          rows={1}
          disabled={disabled}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className={`rounded-lg px-2 py-1 transition disabled:opacity-40 shrink-0 ${
            value.trim() && !disabled
              ? "bg-[var(--shell-accent-soft)] text-[var(--shell-text)]"
              : "text-[var(--shell-muted)] hover:text-[var(--shell-text)]"
          }`}
          title={t("mentorSend")}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      <p className="text-[11px] shell-muted px-1">{helperText}</p>
    </div>
  );
}
