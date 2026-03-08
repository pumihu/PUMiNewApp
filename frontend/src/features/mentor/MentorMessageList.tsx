import { useState, type DragEvent } from "react";
import { GripVertical, Pin } from "lucide-react";

import { useTranslation } from "@/hooks/useTranslation";
import { MENTOR_MESSAGE_DND_MIME, type MentorMessage } from "@/types/mentor";

import { SuggestedActions } from "./SuggestedActions";

interface Props {
  messages: MentorMessage[];
  onAction?: (action: string) => void;
  onPinMessage?: (message: MentorMessage) => void;
}

export function MentorMessageList({ messages, onAction, onPinMessage }: Props) {
  const { lang } = useTranslation();
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const emptyText =
    lang === "hu"
      ? "Irj egy kerdest, vagy valassz egy blokkot, es a mentor konkret javaslatot ad."
      : "Ask a question or select a block, and your mentor will give concrete next moves.";
  const pinLabel = lang === "hu" ? "Pin a canvasra" : "Pin to canvas";
  const dragHint = lang === "hu" ? "Huzd a canvasra" : "Drag to canvas";

  const onDragStart = (event: DragEvent<HTMLDivElement>, message: MentorMessage) => {
    if (message.role !== "assistant" || !message.text.trim()) return;

    event.dataTransfer.setData(
      MENTOR_MESSAGE_DND_MIME,
      JSON.stringify({
        source_message_id: message.id,
        text: message.text,
      }),
    );
    event.dataTransfer.setData("text/plain", message.text);
    event.dataTransfer.effectAllowed = "copy";
    setDraggingId(message.id);
  };

  const onDragEnd = () => setDraggingId(null);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.length === 0 && (
        <div className="rounded-xl shell-panel px-3 py-4 text-xs shell-muted text-center leading-relaxed">{emptyText}</div>
      )}

      {messages.map((msg) => (
        <div key={msg.id} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
          <div
            draggable={msg.role === "assistant"}
            onDragStart={(event) => onDragStart(event, msg)}
            onDragEnd={onDragEnd}
            className={`group max-w-[92%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed border transition ${
              msg.role === "user"
                ? "bg-[var(--shell-accent-soft)] border-[var(--shell-accent)] text-[var(--shell-text)]"
                : "bg-[var(--shell-highlight)] border-[var(--shell-border)] text-[var(--shell-text)] cursor-grab active:cursor-grabbing"
            } ${draggingId === msg.id ? "scale-[1.01] shadow-lg opacity-80" : ""} ${msg.role === "assistant" ? "shell-interactive" : ""}`}
          >
            {msg.role === "assistant" && (
              <div className="mb-2 flex items-center justify-end gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                <button
                  onClick={() => onPinMessage?.(msg)}
                  className="inline-flex items-center gap-1 rounded-full shell-chip px-2 py-0.5 text-[11px] shell-muted hover:text-[var(--shell-text)] shell-interactive"
                >
                  <Pin className="h-3 w-3" />
                  {pinLabel}
                </button>
                <span
                  className="inline-flex items-center rounded-full shell-chip px-2 py-0.5 text-[11px] shell-muted"
                  title={dragHint}
                >
                  <GripVertical className="h-3 w-3" />
                </span>
              </div>
            )}

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
