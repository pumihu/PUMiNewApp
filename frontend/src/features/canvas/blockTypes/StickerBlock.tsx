import { useState } from "react";

import { useTranslation } from "@/hooks/useTranslation";
import { patchBlock } from "@/lib/api";
import type { CanvasBlock } from "@/types/canvas";

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

export function StickerBlock({ block, onUpdate }: Props) {
  const { lang } = useTranslation();
  const content = block.content_json as
    | {
        emoji?: string;
        label?: string;
        meaning?: string;
        action_signal?: string;
      }
    | undefined;

  const [emoji, setEmoji] = useState(content?.emoji ?? "✨");
  const [label, setLabel] = useState(content?.label ?? "");
  const [meaning, setMeaning] = useState(content?.meaning ?? "");
  const [actionSignal, setActionSignal] = useState(content?.action_signal ?? "");

  const save = async () => {
    const updated = await patchBlock(block.id, {
      content_json: {
        ...(content ?? {}),
        emoji: emoji.trim() || "✨",
        label: label.trim(),
        meaning: meaning.trim(),
        action_signal: actionSignal.trim(),
      },
    });
    onUpdate(updated);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-3">
        <input
          value={emoji}
          onChange={(event) => setEmoji(event.target.value)}
          onBlur={save}
          maxLength={4}
          className="w-14 rounded-lg border shell-surface-2 px-2 py-1.5 text-center text-xl bg-transparent outline-none shell-interactive"
        />
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          onBlur={save}
          placeholder={lang === "hu" ? "Jeloles cime" : "Signal label"}
          className="flex-1 rounded-lg border shell-surface-2 px-2.5 py-1.5 text-sm bg-transparent outline-none shell-interactive"
        />
      </div>

      <textarea
        value={meaning}
        onChange={(event) => setMeaning(event.target.value)}
        onBlur={save}
        placeholder={lang === "hu" ? "Mit jelez ez a sticker?" : "What does this sticker mean?"}
        className="w-full min-h-[60px] rounded-lg border shell-surface-2 px-2.5 py-1.5 text-xs bg-transparent outline-none resize-none shell-interactive"
      />

      <input
        value={actionSignal}
        onChange={(event) => setActionSignal(event.target.value)}
        onBlur={save}
        placeholder={
          lang === "hu"
            ? "Milyen kovetkezo lepest triggerel?"
            : "What next action does this trigger?"
        }
        className="w-full rounded-lg border shell-surface-2 px-2.5 py-1.5 text-xs bg-transparent outline-none shell-interactive"
      />
    </div>
  );
}
