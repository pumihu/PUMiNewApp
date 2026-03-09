import { useState, type DragEvent } from "react";
import { GripVertical, Pin, PinOff } from "lucide-react";

import { useTranslation } from "@/hooks/useTranslation";
import {
  MENTOR_MESSAGE_DND_MIME,
  type MentorGeneratedBlock,
  type MentorMessage,
} from "@/types/mentor";

import { SuggestedActions } from "./SuggestedActions";

interface Props {
  messages: MentorMessage[];
  onAction?: (action: string) => void;
  onPinMessage?: (message: MentorMessage, generatedBlock?: MentorGeneratedBlock) => void;
  onPinAllGenerated?: (message: MentorMessage) => void;
}

export function MentorMessageList({
  messages,
  onAction,
  onPinMessage,
  onPinAllGenerated,
}: Props) {
  const { lang } = useTranslation();
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const emptyText =
    lang === "hu"
      ? "Írj egy kérdést, vagy válassz egy blokkot, és a mentor konkrét javaslatot ad."
      : "Ask a question or select a block, and your mentor will give concrete next moves.";
  const pinLabel = lang === "hu" ? "Pin a vászonra" : "Pin to canvas";
  const pinBlockLabel = lang === "hu" ? "Blokk pinelése" : "Pin block";
  const pinAllLabel = lang === "hu" ? "Összes pinelése" : "Pin all";
  const dragHint = lang === "hu" ? "Húzd a vászonra" : "Drag to canvas";
  const blockCandidateLabel = lang === "hu" ? "Blokk jelölt" : "Block candidate";

  const onDragStart = (
    event: DragEvent<HTMLDivElement>,
    message: MentorMessage,
    generatedBlock?: MentorGeneratedBlock,
  ) => {
    if (message.role !== "assistant" || !message.text.trim()) return;

    event.dataTransfer.setData(
      MENTOR_MESSAGE_DND_MIME,
      JSON.stringify({
        source_message_id: message.id,
        text: message.text,
        generated_block: generatedBlock,
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
        <div className="rounded-xl shell-panel px-3 py-4 text-xs shell-muted text-center leading-relaxed">
          {emptyText}
        </div>
      )}

      {messages.map((msg) => {
        const firstGenerated = msg.generated_blocks?.[0];

        return (
          <div
            key={msg.id}
            className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              draggable={msg.role === "assistant"}
              onDragStart={(event) => onDragStart(event, msg, firstGenerated)}
              onDragEnd={onDragEnd}
              className={`group max-w-[92%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed border transition ${
                msg.role === "user"
                  ? "bg-[var(--shell-accent-soft)] border-[var(--shell-accent)] text-[var(--shell-text)]"
                  : "bg-[var(--shell-highlight)] border-[var(--shell-border)] text-[var(--shell-text)] cursor-grab active:cursor-grabbing"
              } ${draggingId === msg.id ? "scale-[1.01] shadow-lg opacity-80" : ""} ${
                msg.role === "assistant" ? "shell-interactive" : ""
              }`}
            >
              {msg.role === "assistant" && (
                <div className="mb-2 flex items-center justify-end gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                  <button
                    onClick={() => onPinMessage?.(msg, firstGenerated)}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--shell-border)]/70 bg-[var(--shell-surface-2)]/75 px-2 py-1 text-[11px] shell-muted hover:text-[var(--shell-text)] shell-interactive"
                  >
                    <Pin className="h-3 w-3" />
                    {firstGenerated ? pinBlockLabel : pinLabel}
                  </button>
                  {msg.generated_blocks && msg.generated_blocks.length > 1 && (
                    <button
                      onClick={() => onPinAllGenerated?.(msg)}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--shell-border)]/70 bg-[var(--shell-surface-2)]/75 px-2 py-1 text-[11px] shell-muted hover:text-[var(--shell-text)] shell-interactive"
                    >
                      <PinOff className="h-3 w-3" />
                      {pinAllLabel}
                    </button>
                  )}
                  <span
                    className="inline-flex items-center rounded-md border border-[var(--shell-border)]/70 bg-[var(--shell-surface-2)]/75 px-2 py-1 text-[11px] shell-muted"
                    title={dragHint}
                  >
                    <GripVertical className="h-3 w-3" />
                  </span>
                </div>
              )}

              <p className="whitespace-pre-wrap">{msg.text}</p>

              {msg.role === "assistant" && msg.generated_blocks && msg.generated_blocks.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.generated_blocks.map((candidate, index) => (
                    <div
                      key={`${candidate.block_type}-${index}`}
                      draggable
                      onDragStart={(event) => onDragStart(event, msg, candidate)}
                      onDragEnd={onDragEnd}
                      className="rounded-xl border border-[var(--shell-border)]/80 bg-[var(--shell-surface-2)]/78 px-3 py-2 cursor-grab active:cursor-grabbing shell-interactive"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.12em] shell-muted">
                            {blockCandidateLabel}
                          </p>
                          <p className="text-xs text-[var(--shell-text)] mt-0.5">
                            {candidate.title || candidate.block_type}
                          </p>
                          <p className="text-[11px] shell-muted mt-0.5">{candidate.block_type}</p>
                          {candidate.reason && (
                            <p className="text-[11px] shell-muted mt-1 leading-relaxed">
                              {candidate.reason}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => onPinMessage?.(msg, candidate)}
                          className="shrink-0 rounded-md border border-[var(--shell-border)]/70 bg-[var(--shell-surface)]/70 px-2 py-1 text-[11px] shell-muted hover:text-[var(--shell-text)] shell-interactive"
                        >
                          {pinLabel}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {msg.role === "assistant" &&
                msg.suggested_actions &&
                msg.suggested_actions.length > 0 && (
                  <SuggestedActions actions={msg.suggested_actions} onAction={onAction} />
                )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
