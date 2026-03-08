import { useEffect, useMemo, useState } from "react";

import { useTranslation } from "@/hooks/useTranslation";
import { patchBlock } from "@/lib/api";
import type { CanvasBlock } from "@/types/canvas";

interface AiStickyContent {
  text?: string;
  source_message_id?: string;
  created_from?: "mentor";
  created_at?: string;
  action_type?: "pin" | "drag";
}

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

export function AiStickyBlock({ block, onUpdate }: Props) {
  const { lang } = useTranslation();
  const content = (block.content_json as AiStickyContent | undefined) ?? {};
  const [text, setText] = useState(content.text ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setText(content.text ?? "");
  }, [block.id, content.text]);

  const metaLine = useMemo(() => {
    if (lang === "hu") {
      if (content.action_type === "drag") return "Mentorbol huzva mentve";
      if (content.action_type === "pin") return "Mentorbol rogzitve";
      return "Mentor insight";
    }

    if (content.action_type === "drag") return "Saved from mentor drag";
    if (content.action_type === "pin") return "Pinned from mentor";
    return "Mentor insight";
  }, [content.action_type, lang]);

  const placeholder =
    lang === "hu"
      ? "Rogzitett AI insight. Finomitsd sajat munkablokkra."
      : "Captured AI insight. Refine it into your own working block.";

  const save = async () => {
    setSaving(true);
    try {
      const updated = await patchBlock(block.id, {
        content_json: {
          ...content,
          text,
        },
      });
      onUpdate(updated);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center rounded-full shell-chip bg-[var(--shell-accent-soft)] px-2 py-0.5 text-[10px] font-medium tracking-[0.08em] uppercase">
          AI Mentor
        </span>
        <span className="text-[11px] shell-muted">{metaLine}</span>
      </div>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={save}
        placeholder={placeholder}
        className="w-full min-h-[96px] resize-none bg-transparent text-sm leading-relaxed text-[var(--shell-text)] placeholder-[var(--shell-muted)] outline-none"
      />

      {saving && <p className="text-[11px] shell-muted">{lang === "hu" ? "Mentes..." : "Saving..."}</p>}
    </div>
  );
}
