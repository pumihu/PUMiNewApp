import { useState } from "react";

import { useTranslation } from "@/hooks/useTranslation";
import { patchBlock } from "@/lib/api";
import type { CanvasBlock } from "@/types/canvas";

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

export function NoteBlock({ block, onUpdate }: Props) {
  const { lang } = useTranslation();
  const content = block.content_json as { text?: string } | undefined;
  const [text, setText] = useState(content?.text ?? "");
  const [saving, setSaving] = useState(false);

  const placeholder =
    lang === "hu"
      ? "Írd le a lényeget: mit kell tisztázni vagy eldönteni?"
      : "Capture the key thought: what needs to be clarified or decided?";

  const save = async () => {
    setSaving(true);
    const updated = await patchBlock(block.id, {
      content_json: {
        ...(content ?? {}),
        text,
      },
    });
    onUpdate(updated);
    setSaving(false);
  };

  return (
    <div className="space-y-2">
      <textarea
        className="w-full bg-transparent text-sm text-[var(--shell-text)] placeholder-[var(--shell-muted)] resize-none outline-none min-h-[86px] leading-relaxed rounded-lg shell-interactive"
        placeholder={placeholder}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={save}
      />
      {saving && <p className="text-[11px] shell-muted">{lang === "hu" ? "Mentés..." : "Saving..."}</p>}
    </div>
  );
}
