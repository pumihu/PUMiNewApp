import { useEffect, useMemo, useRef, useState } from "react";
import { Compass, Sparkles } from "lucide-react";

import { MentorComposer } from "./MentorComposer";
import { MentorMessageList } from "./MentorMessageList";
import { useTranslation } from "@/hooks/useTranslation";
import { mentorChat } from "@/lib/api";
import type { CanvasBlock } from "@/types/canvas";
import type { MentorCanvasCapturePayload, MentorMessage, SuggestedAction } from "@/types/mentor";
import type { Workspace } from "@/types/workspace";

interface Props {
  workspace: Workspace;
  blocks: CanvasBlock[];
  selectedBlockIds: string[];
  initialWelcomeMessage?: string;
  initialWelcomeActions?: SuggestedAction[];
  onCaptureMentorMessage?: (payload: MentorCanvasCapturePayload) => Promise<void> | void;
}

export function MentorPanel({
  workspace,
  blocks,
  selectedBlockIds,
  initialWelcomeMessage,
  initialWelcomeActions = [],
  onCaptureMentorMessage,
}: Props) {
  const { t, lang } = useTranslation();

  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);
  }, [workspace.id]);

  useEffect(() => {
    if (!initialWelcomeMessage) return;
    setMessages((prev) => {
      if (prev.length > 0) return prev;
      return [
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: initialWelcomeMessage,
          timestamp: Date.now(),
          suggested_actions: initialWelcomeActions,
        },
      ];
    });
  }, [initialWelcomeActions, initialWelcomeMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const guidance = useMemo(() => {
    const blockCount = blocks.length;
    const sourceCount = blocks.filter((block) => block.type === "source" || block.type === "summary").length;

    if (lang === "hu") {
      return {
        blockLine: `${blockCount} blokk van ebben a workspace-ben.`,
        selectedLine:
          selectedBlockIds.length > 0
            ? `${selectedBlockIds.length} blokk van kijelolve mentor munkahoz.`
            : "Valassz egy blokkot, hogy konkretan azon dolgozzunk.",
        sourceLine:
          sourceCount > 0
            ? `${sourceCount} forras/osszefoglalo blokk elerheto kontextuskent.`
            : "Adj hozza forrast, es strukturalt osszefoglalot keszitek.",
        capabilityLine: "Osszefoglalok, kritizalok, vagy brieffe formalom az anyagodat.",
        actions: [
          "Keszits kovetkezo lepes tervet",
          "Critique-olj egy blokkot",
          "Foglald ossze 3 pontban",
        ],
      };
    }

    return {
      blockLine: `You have ${blockCount} blocks in this workspace.`,
      selectedLine:
        selectedBlockIds.length > 0
          ? `${selectedBlockIds.length} selected block(s) ready for mentor work.`
          : "Select a block to get precise, context-aware help.",
      sourceLine:
        sourceCount > 0
          ? `${sourceCount} source/summary block(s) available as context.`
          : "Add a source and I will generate a structured summary.",
      capabilityLine: "I can summarize, critique, or turn this into a creative brief.",
      actions: ["Build a next-step plan", "Critique one block", "Summarize in 3 bullets"],
    };
  }, [blocks, lang, selectedBlockIds.length]);

  const selectedBlocks = useMemo(
    () => blocks.filter((block) => selectedBlockIds.includes(block.id)).slice(0, 3),
    [blocks, selectedBlockIds],
  );

  const handleSend = async (text: string) => {
    const userMsg: MentorMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setThinking(true);

    try {
      const locale = lang === "hu" ? "hu" : "en";
      const resp = await mentorChat({
        workspace_id: workspace.id,
        message: text,
        locale,
        selected_block_ids: selectedBlockIds,
        mode: workspace.mode,
      });

      const assistantMsg: MentorMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: resp.text,
        timestamp: Date.now(),
        suggested_actions: resp.suggested_actions,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const fallbackText =
        lang === "hu"
          ? "Nem sikerult kapcsolodni a mentorhoz. Probald ujra."
          : "Sorry, I could not connect to the mentor. Please try again.";

      const errMsg: MentorMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: fallbackText,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setThinking(false);
    }
  };

  const handlePinMessage = async (message: MentorMessage) => {
    if (!onCaptureMentorMessage || message.role !== "assistant" || !message.text.trim()) return;

    await onCaptureMentorMessage({
      source_message_id: message.id,
      text: message.text,
      action_type: "pin",
    });
  };

  return (
    <aside className="w-[360px] border-l border-[var(--shell-border)] bg-[var(--shell-surface)]/78 backdrop-blur-xl flex flex-col shrink-0">
      <div className="h-[62px] border-b border-[var(--shell-border)] flex items-center justify-between px-4 shrink-0">
        <div>
          <p className="text-sm font-medium flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--shell-accent)] animate-pulse" />
            {t("mentorPanelTitle")}
          </p>
          <p className="text-[11px] shell-muted">{workspace.title}</p>
        </div>
        <span className="text-[10px] uppercase tracking-[0.14em] shell-muted shell-chip rounded-full px-2 py-0.5">{workspace.mode}</span>
      </div>

      <div className="px-4 py-3 border-b border-[var(--shell-border)] space-y-3">
        <div className="rounded-xl shell-panel p-3 space-y-2">
          <p className="text-xs flex items-center gap-2"><Compass className="h-3.5 w-3.5" /> {guidance.blockLine}</p>
          <p className="text-xs shell-muted">{guidance.selectedLine}</p>
          <p className="text-xs shell-muted">{guidance.sourceLine}</p>
          <p className="text-xs shell-muted">{guidance.capabilityLine}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {selectedBlocks.length > 0 ? (
            selectedBlocks.map((block) => (
              <span
                key={block.id}
                className="rounded-full shell-chip px-2.5 py-1 text-[11px] shell-muted"
              >
                {block.title || (lang === "hu" ? "Kijelolt blokk" : "Selected block")}
              </span>
            ))
          ) : (
            <span className="rounded-full shell-chip px-2.5 py-1 text-[11px] shell-muted">
              {lang === "hu" ? "Nincs kijelolt blokk" : "No block selected"}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {guidance.actions.map((action) => (
            <button
              key={action}
              onClick={() => void handleSend(action)}
              className="rounded-full border shell-surface-2 px-3 py-1 text-[11px] shell-muted hover:text-[var(--shell-text)] shell-interactive"
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      <MentorMessageList
        messages={messages}
        onAction={(action) => {
          void handleSend(action);
        }}
        onPinMessage={(message) => {
          void handlePinMessage(message);
        }}
      />

      {thinking && (
        <div className="px-4 pb-2">
          <div className="inline-flex items-center gap-2 text-xs shell-muted">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            {lang === "hu" ? "A mentor dolgozik..." : "Mentor is thinking..."}
          </div>
        </div>
      )}

      <div ref={bottomRef} />

      <MentorComposer onSend={handleSend} disabled={thinking} />
    </aside>
  );
}
