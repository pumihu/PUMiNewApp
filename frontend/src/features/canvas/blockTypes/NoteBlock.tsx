import { useState } from "react";
import { patchBlock } from "@/lib/api";
import type { CanvasBlock } from "@/types/canvas";

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

export function NoteBlock({ block, onUpdate }: Props) {
  const content = block.content_json as { text?: string } | undefined;
  const [text, setText] = useState(content?.text ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const updated = await patchBlock(block.id, { content_json: { text } });
    onUpdate(updated);
    setSaving(false);
  };

  return (
    <div className="space-y-2">
      <textarea
        className="w-full bg-transparent text-sm text-neutral-100 placeholder-neutral-600 resize-none outline-none min-h-[80px]"
        placeholder="Write your note here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
      />
      {saving && <p className="text-xs text-neutral-500">Saving...</p>}
    </div>
  );
}
