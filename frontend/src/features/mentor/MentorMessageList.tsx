import { useTranslation } from "@/hooks/useTranslation";
import type { MentorMessage } from "@/types/mentor";

import { SuggestedActions } from "./SuggestedActions";

interface Props {
  messages: MentorMessage[];
  onAction?: (action: string) => void;
}

export function MentorMessageList({ messages, onAction }: Props) {
  const { lang } = useTranslation();

  const emptyText =
    lang === "hu"
      ? "Kerdezz barmit a mentorodtol ezen a munkateren."
      : "Ask your mentor anything about this workspace.";

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
      {messages.length === 0 && <div className="text-xs text-neutral-600 text-center pt-8">{emptyText}</div>}
      {messages.map((msg) => (
        <div key={msg.id} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
          <div
            className={`max-w-[85%] rounded-xl px-3 py-2.5 text-sm leading-relaxed ${
              msg.role === "user" ? "bg-white text-black" : "bg-neutral-800 text-neutral-100"
            }`}
          >
            <p className="whitespace-pre-wrap">{msg.text}</p>
            {msg.role === "assistant" && msg.suggested_actions && msg.suggested_actions.length > 0 && (
              <SuggestedActions actions={msg.suggested_actions} onAction={onAction} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
