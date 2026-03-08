import { useMemo, useState } from "react";

import { useTranslation } from "@/hooks/useTranslation";
import { patchBlock } from "@/lib/api";
import type { CanvasBlock } from "@/types/canvas";

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

function toHref(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

export function LinkBlock({ block, onUpdate }: Props) {
  const { lang } = useTranslation();
  const content = block.content_json as
    | {
        title?: string;
        url?: string;
        summary?: string;
        usage_note?: string;
      }
    | undefined;

  const [title, setTitle] = useState(content?.title ?? "");
  const [url, setUrl] = useState(content?.url ?? "");
  const [summary, setSummary] = useState(content?.summary ?? "");
  const [usageNote, setUsageNote] = useState(content?.usage_note ?? "");

  const href = useMemo(() => toHref(url), [url]);

  const save = async () => {
    const updated = await patchBlock(block.id, {
      content_json: {
        ...(content ?? {}),
        title: title.trim(),
        url: url.trim(),
        summary: summary.trim(),
        usage_note: usageNote.trim(),
      },
    });
    onUpdate(updated);
  };

  return (
    <div className="space-y-2.5">
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={save}
        placeholder={lang === "hu" ? "Link cim" : "Link title"}
        className="w-full rounded-lg border shell-surface-2 px-2.5 py-1.5 text-sm bg-transparent outline-none shell-interactive"
      />

      <div className="flex items-center gap-2">
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onBlur={save}
          placeholder={lang === "hu" ? "https://pelda.hu" : "https://example.com"}
          className="flex-1 rounded-lg border shell-surface-2 px-2.5 py-1.5 text-xs bg-transparent outline-none shell-interactive"
        />
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border shell-surface-2 px-2 py-1 text-[11px] shell-muted hover:text-[var(--shell-text)] shell-interactive"
          >
            {lang === "hu" ? "Megnyitas" : "Open"}
          </a>
        )}
      </div>

      <textarea
        value={summary}
        onChange={(event) => setSummary(event.target.value)}
        onBlur={save}
        placeholder={
          lang === "hu"
            ? "Mi a lenyeg ebben a hivatkozasban?"
            : "What is the key takeaway from this reference?"
        }
        className="w-full min-h-[64px] rounded-lg border shell-surface-2 px-2.5 py-1.5 text-xs bg-transparent outline-none resize-none shell-interactive"
      />

      <input
        value={usageNote}
        onChange={(event) => setUsageNote(event.target.value)}
        onBlur={save}
        placeholder={
          lang === "hu"
            ? "Hogyan hasznaljuk ezt a boardon?"
            : "How should this be used in the board?"
        }
        className="w-full rounded-lg border shell-surface-2 px-2.5 py-1.5 text-xs bg-transparent outline-none shell-interactive"
      />
    </div>
  );
}
