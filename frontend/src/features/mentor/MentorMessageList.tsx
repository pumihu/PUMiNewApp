import { useMemo, useState, type DragEvent } from "react";
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
  onPlaceMessage?: (message: MentorMessage, generatedBlock?: MentorGeneratedBlock) => void;
  onRefineGenerated?: (message: MentorMessage, generatedBlock: MentorGeneratedBlock) => void;
  onDismissGenerated?: (message: MentorMessage, generatedBlock: MentorGeneratedBlock) => void;
  onPinAllGenerated?: (message: MentorMessage) => void;
}

function candidateKey(messageId: string, blockType: string, index: number): string {
  return `${messageId}:${blockType}:${index}`;
}

export function MentorMessageList({
  messages,
  onAction,
  onPinMessage,
  onPlaceMessage,
  onRefineGenerated,
  onDismissGenerated,
  onPinAllGenerated,
}: Props) {
  const { lang } = useTranslation();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [placedKeys, setPlacedKeys] = useState<Set<string>>(new Set());
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());

  const emptyText =
    lang === "hu"
      ? "Kerj egy blokkot a mentortol, majd pineld a vaszonra."
      : "Ask the mentor for a block, then pin it to the canvas.";
  const pinLabel = lang === "hu" ? "Pin a vaszonra" : "Pin to canvas";
  const placeNowLabel = lang === "hu" ? "Elhelyezes most" : "Place now";
  const refineLabel = lang === "hu" ? "Finomitas" : "Refine";
  const dismissLabel = lang === "hu" ? "Elvetes" : "Dismiss";
  const savedLabel = lang === "hu" ? "Mentve a vaszonra" : "Saved to canvas";
  const pinBlockLabel = lang === "hu" ? "Blokk pinelese" : "Pin block";
  const pinAllLabel = lang === "hu" ? "Osszes pinelese" : "Pin all";
  const dragHint = lang === "hu" ? "Huzd a vaszonra" : "Drag to canvas";
  const blockCandidateLabel = lang === "hu" ? "Objektum jelolt" : "Object candidate";

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

  const visibleCandidates = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const message of messages) {
      const set = new Set<string>();
      const generated = message.generated_blocks ?? [];
      generated.forEach((candidate, index) => {
        const key = candidateKey(message.id, candidate.block_type, index);
        if (!dismissedKeys.has(key)) {
          set.add(key);
        }
      });
      map.set(message.id, set);
    }
    return map;
  }, [dismissedKeys, messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
      {messages.length === 0 && (
        <div className="rounded-2xl shell-panel px-3 py-4 text-xs shell-muted text-center leading-relaxed">
          {emptyText}
        </div>
      )}

      {messages.map((msg) => {
        const firstGenerated = msg.generated_blocks?.[0];
        const hasVisibleCandidate = (visibleCandidates.get(msg.id)?.size ?? 0) > 0;

        return (
          <div
            key={msg.id}
            className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              draggable={msg.role === "assistant"}
              onDragStart={(event) => onDragStart(event, msg, firstGenerated)}
              onDragEnd={onDragEnd}
              className={`group max-w-[94%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed border transition ${
                msg.role === "user"
                  ? "bg-[var(--shell-accent-soft)] border-[var(--shell-accent)]/55 text-[var(--shell-text)]"
                  : "bg-[var(--shell-surface)]/70 border-[var(--shell-border)] text-[var(--shell-text)] cursor-grab active:cursor-grabbing"
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
                  {msg.generated_blocks && msg.generated_blocks.length > 1 && hasVisibleCandidate && (
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
                  {msg.generated_blocks.map((candidate, index) => {
                    const key = candidateKey(msg.id, candidate.block_type, index);
                    if (dismissedKeys.has(key)) {
                      return null;
                    }

                    const alreadyPlaced = placedKeys.has(key);

                    return (
                      <div
                        key={key}
                        draggable
                        onDragStart={(event) => onDragStart(event, msg, candidate)}
                        onDragEnd={onDragEnd}
                        className="rounded-xl border border-[var(--shell-accent)]/30 bg-[var(--shell-surface-2)]/78 px-3 py-2.5 cursor-grab active:cursor-grabbing shell-interactive"
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
                              <p className="text-[11px] shell-muted mt-1 leading-relaxed line-clamp-2">
                                {candidate.reason}
                              </p>
                            )}
                            {alreadyPlaced ? (
                              <p className="mt-1 text-[11px] text-emerald-400">{savedLabel}</p>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <button
                            disabled={alreadyPlaced}
                            onClick={() => {
                              if (alreadyPlaced) return;
                              onPinMessage?.(msg, candidate);
                              setPlacedKeys((prev) => new Set(prev).add(key));
                            }}
                            className="rounded-md border border-[var(--shell-border)]/70 bg-[var(--shell-surface)]/70 px-2 py-1 text-[11px] shell-muted hover:text-[var(--shell-text)] shell-interactive disabled:opacity-50"
                          >
                            {pinLabel}
                          </button>
                          <button
                            disabled={alreadyPlaced}
                            onClick={() => {
                              if (alreadyPlaced) return;
                              onPlaceMessage?.(msg, candidate);
                              setPlacedKeys((prev) => new Set(prev).add(key));
                            }}
                            className="rounded-md border border-[var(--shell-border)]/70 bg-[var(--shell-surface)]/70 px-2 py-1 text-[11px] shell-muted hover:text-[var(--shell-text)] shell-interactive disabled:opacity-50"
                          >
                            {placeNowLabel}
                          </button>
                          <button
                            onClick={() => onRefineGenerated?.(msg, candidate)}
                            className="rounded-md border border-[var(--shell-border)]/70 bg-[var(--shell-surface)]/70 px-2 py-1 text-[11px] shell-muted hover:text-[var(--shell-text)] shell-interactive"
                          >
                            {refineLabel}
                          </button>
                          <button
                            onClick={() => {
                              setDismissedKeys((prev) => new Set(prev).add(key));
                              onDismissGenerated?.(msg, candidate);
                            }}
                            className="rounded-md border border-[var(--shell-border)]/70 bg-[var(--shell-surface)]/70 px-2 py-1 text-[11px] shell-muted hover:text-[var(--shell-text)] shell-interactive"
                          >
                            {dismissLabel}
                          </button>
                        </div>
                      </div>
                    );
                  })}
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

