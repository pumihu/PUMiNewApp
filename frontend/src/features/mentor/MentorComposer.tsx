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
      ? "Shift+Enter uj sorhoz - Enter kuldeshez"
      : "Shift+Enter for new line - Enter to send";

  const handleSend = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
  };

  return (
    <div className="border-t border-neutral-800 p-3">
      <div className="flex items-end gap-2 bg-neutral-800 rounded-xl px-3 py-2">
        <textarea
          className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 resize-none outline-none max-h-32"
          placeholder={t("mentorPlaceholder")}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={1}
          disabled={disabled}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="text-neutral-400 hover:text-white transition disabled:opacity-40 shrink-0 pb-0.5"
          title={t("mentorSend")}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-neutral-600 mt-1.5 px-1">{helperText}</p>
    </div>
  );
}
