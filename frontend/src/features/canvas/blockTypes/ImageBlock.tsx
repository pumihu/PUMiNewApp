import { useState } from "react";

import { useTranslation } from "@/hooks/useTranslation";
import { patchBlock } from "@/lib/api";
import type { CanvasBlock } from "@/types/canvas";

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

export function ImageBlock({ block, onUpdate }: Props) {
  const { lang } = useTranslation();
  const content = block.content_json as
    | {
        url?: string;
        caption?: string;
        intent?: string;
      }
    | undefined;

  const [url, setUrl] = useState(content?.url ?? "");
  const [caption, setCaption] = useState(content?.caption ?? "");
  const [intent, setIntent] = useState(content?.intent ?? "");

  const save = async () => {
    const updated = await patchBlock(block.id, {
      content_json: {
        ...(content ?? {}),
        url: url.trim(),
        caption: caption.trim(),
        intent: intent.trim(),
      },
    });
    onUpdate(updated);
  };

  return (
    <div className="space-y-2.5">
      {url.trim() ? (
        <img
          src={url}
          alt={caption || "image reference"}
          className="w-full rounded-xl border border-[var(--shell-border)] max-h-[220px] object-cover"
        />
      ) : (
        <div className="h-36 rounded-xl border border-dashed border-[var(--shell-border)] bg-[var(--shell-highlight)] flex items-center justify-center text-xs shell-muted px-4 text-center">
          {lang === "hu"
            ? "Adj meg egy kep URL-t, hogy vizualis referencia jelenjen meg."
            : "Add an image URL to place visual reference material here."}
        </div>
      )}

      <input
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        onBlur={save}
        placeholder={lang === "hu" ? "Kep URL" : "Image URL"}
        className="w-full rounded-lg border shell-surface-2 px-2.5 py-1.5 text-xs bg-transparent outline-none shell-interactive"
      />

      <input
        value={caption}
        onChange={(event) => setCaption(event.target.value)}
        onBlur={save}
        placeholder={lang === "hu" ? "Rovid kep leiras" : "Short image caption"}
        className="w-full rounded-lg border shell-surface-2 px-2.5 py-1.5 text-xs bg-transparent outline-none shell-interactive"
      />

      <input
        value={intent}
        onChange={(event) => setIntent(event.target.value)}
        onBlur={save}
        placeholder={
          lang === "hu"
            ? "Mire hasznaljuk ezt a kepet? (pl. hangulat, referencia, shot)"
            : "How will this image be used? (mood, reference, shot)"
        }
        className="w-full rounded-lg border shell-surface-2 px-2.5 py-1.5 text-xs bg-transparent outline-none shell-interactive"
      />
    </div>
  );
}
