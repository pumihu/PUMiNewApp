import { useEffect, useRef, useState } from "react";

import { MentorComposer } from "./MentorComposer";
import { MentorMessageList } from "./MentorMessageList";
import { useTranslation } from "@/hooks/useTranslation";
import { mentorChat } from "@/lib/api";
import type { MentorMessage } from "@/types/mentor";
import type { Workspace } from "@/types/workspace";

interface Props {
  workspace: Workspace;
  selectedBlockIds: string[];
}

export function MentorPanel({ workspace, selectedBlockIds }: Props) {
  const { t, lang } = useTranslation();

  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  return (
    <aside className="w-80 border-l border-neutral-800 flex flex-col bg-neutral-950 shrink-0">
      <div className="h-12 border-b border-neutral-800 flex items-center px-4 shrink-0">
        <span className="text-sm font-medium text-neutral-200">{t("mentorPanelTitle")}</span>
        {selectedBlockIds.length > 0 && (
          <span className="ml-2 text-xs text-neutral-500">
            ({selectedBlockIds.length} {selectedBlockIds.length === 1 ? "block" : "blocks"})
          </span>
        )}
      </div>

      <MentorMessageList messages={messages} onAction={(action) => { void handleSend(action); }} />

      {thinking && (
        <div className="px-4 pb-2">
          <div className="flex gap-1 items-center text-xs text-neutral-500">
            <span className="animate-pulse">o</span>
            <span className="animate-pulse delay-75">o</span>
            <span className="animate-pulse delay-150">o</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />

      <MentorComposer onSend={handleSend} disabled={thinking} />
    </aside>
  );
}

