import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Compass, Sparkles } from "lucide-react";

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
        blockLine: `${blockCount} blokk van ebben a munkatérben.`,
        selectedLine:
          selectedBlockIds.length > 0
            ? `${selectedBlockIds.length} blokk van kijelölve mentor munkához.`
            : "Válassz egy blokkot, hogy pontosan azon dolgozzunk.",
        sourceLine:
          sourceCount > 0
            ? `${sourceCount} forrás/összefoglaló blokk elérhető kontextusként.`
            : "Adj hozzá forrást, és strukturált összefoglalót készítek.",
        capabilityLine: "Összefoglalok, kritizálok, vagy briefbe formálom az anyagodat.",
        actions: ["Finomítsuk a célt", "Bontsuk feladatokra", "Készítsünk rövid briefet"],
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
      capabilityLine: "I can summarize, critique, or turn this into a concise brief.",
      actions: ["Refine the goal", "Turn this into tasks", "Create a concise brief"],
    };
  }, [blocks, lang, selectedBlockIds.length]);

  const selectedBlocks = useMemo(
    () => blocks.filter((block) => selectedBlockIds.includes(block.id)).slice(0, 3),
    [blocks, selectedBlockIds],
  );

  const tutorial = useMemo(() => {
    const hasSticky = blocks.some((block) => block.type === "ai_sticky");
    const hasSourceContext = blocks.some((block) => block.type === "source" || block.type === "summary");
    const hasBrief = blocks.some((block) => block.type === "creative_brief");

    if (lang === "hu") {
      return [
        {
          id: "select",
          title: "Válassz ki egy blokkot",
          prompt: "Segíts kiválasztani, melyik blokkot érdemes most fókuszba tenni.",
          done: blocks.length > 0 && selectedBlockIds.length > 0,
        },
        {
          id: "pin",
          title: "Pinelj egy mentor insightot",
          prompt: "Adj egy rövid insightot, amit érdemes a canvasra pinelni.",
          done: hasSticky,
        },
        {
          id: "source",
          title: "Adj hozzá egy forrást",
          prompt: "Kérdezz vissza, milyen forrást töltsek fel, és készíts összefoglalót.",
          done: hasSourceContext,
        },
        {
          id: "brief",
          title: "Készíts rövid briefet",
          prompt: "Fordítsd a jelenlegi blokkokat rövid, használható briefbe.",
          done: hasBrief,
        },
      ] as const;
    }

    return [
      {
        id: "select",
        title: "Select one block",
        prompt: "Help me choose which block to focus on first.",
        done: blocks.length > 0 && selectedBlockIds.length > 0,
      },
      {
        id: "pin",
        title: "Pin one mentor insight",
        prompt: "Give me one compact insight worth pinning to canvas.",
        done: hasSticky,
      },
      {
        id: "source",
        title: "Add source material",
        prompt: "Ask what source material to upload, then summarize it.",
        done: hasSourceContext,
      },
      {
        id: "brief",
        title: "Generate a brief",
        prompt: "Turn the current blocks into a concise working brief.",
        done: hasBrief,
      },
    ] as const;
  }, [blocks, lang, selectedBlockIds.length]);

  const tutorialDoneCount = tutorial.filter((step) => step.done).length;

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
          ? "Nem sikerült kapcsolódni a mentorhoz. Próbáld újra."
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
        <span className="text-[10px] uppercase tracking-[0.14em] shell-muted">{workspace.mode}</span>
      </div>

      <div className="px-4 py-3 border-b border-[var(--shell-border)] space-y-3">
        <div className="rounded-xl shell-panel p-3 space-y-2">
          <p className="text-xs flex items-center gap-2"><Compass className="h-3.5 w-3.5" /> {guidance.blockLine}</p>
          <p className="text-xs shell-muted">{guidance.selectedLine}</p>
          <p className="text-xs shell-muted">{guidance.sourceLine}</p>
          <p className="text-xs shell-muted">{guidance.capabilityLine}</p>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.12em] shell-muted">
            {lang === "hu" ? "Kijelölt blokkok" : "Selected blocks"}
          </p>
          {selectedBlocks.length > 0 ? (
            selectedBlocks.map((block) => (
              <p key={block.id} className="text-xs text-[var(--shell-text)]/88">
                • {block.title || (lang === "hu" ? "Kijelölt blokk" : "Selected block")}
              </p>
            ))
          ) : (
            <p className="text-xs shell-muted">{lang === "hu" ? "Nincs kijelölt blokk." : "No block selected yet."}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          {guidance.actions.map((action) => (
            <button
              key={action}
              onClick={() => void handleSend(action)}
              className="rounded-lg border shell-surface-2 px-3 py-1.5 text-left text-[11px] shell-muted hover:text-[var(--shell-text)] shell-interactive"
            >
              {action}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-[var(--shell-border)]/70 bg-[var(--shell-surface-2)]/65 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.12em] shell-muted">
              {lang === "hu" ? "Gyors mentor útmutató" : "Guided start"}
            </p>
            <p className="text-[11px] shell-muted">{tutorialDoneCount}/{tutorial.length}</p>
          </div>

          <div className="space-y-1.5">
            {tutorial.map((step) => (
              <button
                key={step.id}
                disabled={step.done}
                onClick={() => void handleSend(step.prompt)}
                className={`w-full rounded-lg border px-2.5 py-2 text-left text-xs shell-interactive ${
                  step.done
                    ? "border-[var(--shell-border)]/55 bg-[var(--shell-highlight)] text-[var(--shell-muted)]"
                    : "border-[var(--shell-border)] bg-transparent text-[var(--shell-text)]"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  {step.done ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <span className="h-1.5 w-1.5 rounded-full bg-[var(--shell-accent)]" />}
                  {step.title}
                </span>
              </button>
            ))}
          </div>
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
