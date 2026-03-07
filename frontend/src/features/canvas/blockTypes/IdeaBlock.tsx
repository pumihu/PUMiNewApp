import { useState } from "react";
import { patchBlock } from "@/lib/api";
import type { CanvasBlock } from "@/types/canvas";

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

export function IdeaBlock({ block, onUpdate }: Props) {
  const content = block.content_json as { text?: string; tags?: string[] } | undefined;
  const [text, setText] = useState(content?.text ?? "");

  const save = async () => {
    const updated = await patchBlock(block.id, { content_json: { text } });
    onUpdate(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-yellow-400 text-xs font-medium mb-1">
        <span>💡</span> Idea
      </div>
      <textarea
        className="w-full bg-transparent text-sm text-neutral-100 placeholder-neutral-600 resize-none outline-none min-h-[60px]"
        placeholder="Capture your idea..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
      />
    </div>
  );
}
