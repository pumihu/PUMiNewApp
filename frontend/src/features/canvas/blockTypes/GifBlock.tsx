import { useState } from "react";

import { useTranslation } from "@/hooks/useTranslation";
import { patchBlock } from "@/lib/api";
import type { CanvasBlock } from "@/types/canvas";

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

export function GifBlock({ block, onUpdate }: Props) {
  const { lang } = useTranslation();
  const content = block.content_json as
    | {
        url?: string;
        purpose?: string;
        placement_note?: string;
      }
    | undefined;

  const [url, setUrl] = useState(content?.url ?? "");
  const [purpose, setPurpose] = useState(content?.purpose ?? "");
  const [placement, setPlacement] = useState(content?.placement_note ?? "");

  const save = async () => {
    const updated = await patchBlock(block.id, {
      content_json: {
        ...(content ?? {}),
        url: url.trim(),
        purpose: purpose.trim(),
        placement_note: placement.trim(),
      },
    });
    onUpdate(updated);
  };

  return (
    <div className="space-y-2.5">
      {url.trim() ? (
        <img
          src={url}
          alt={purpose || "gif reference"}
          className="w-full rounded-xl border border-[var(--shell-border)] max-h-[220px] object-cover"
        />
      ) : (
        <div className="h-32 rounded-xl border border-dashed border-[var(--shell-border)] bg-[var(--shell-highlight)] flex items-center justify-center text-xs shell-muted px-4 text-center">
          {lang === "hu"
            ? "GIF URL alapjan tudod jelezni a ritmust, energiat vagy tonalitast."
            : "Use a GIF URL to capture pacing, energy, or tone for this board."}
        </div>
      )}

      <input
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        onBlur={save}
        placeholder={lang === "hu" ? "GIF URL" : "GIF URL"}
        className="w-full rounded-lg border shell-surface-2 px-2.5 py-1.5 text-xs bg-transparent outline-none shell-interactive"
      />

      <input
        value={purpose}
        onChange={(event) => setPurpose(event.target.value)}
        onBlur={save}
        placeholder={lang === "hu" ? "Uzenet / erzet amit hordoz" : "What message or feeling this carries"}
        className="w-full rounded-lg border shell-surface-2 px-2.5 py-1.5 text-xs bg-transparent outline-none shell-interactive"
      />

      <input
        value={placement}
        onChange={(event) => setPlacement(event.target.value)}
        onBlur={save}
        placeholder={lang === "hu" ? "Hol kap szerepet?" : "Where should this be used?"}
        className="w-full rounded-lg border shell-surface-2 px-2.5 py-1.5 text-xs bg-transparent outline-none shell-interactive"
      />
    </div>
  );
}
