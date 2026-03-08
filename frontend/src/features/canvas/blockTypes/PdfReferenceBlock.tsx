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

export function PdfReferenceBlock({ block, onUpdate }: Props) {
  const { lang } = useTranslation();
  const content = block.content_json as
    | {
        title?: string;
        url?: string;
        pages?: string;
        excerpt?: string;
        why_it_matters?: string;
      }
    | undefined;

  const [title, setTitle] = useState(content?.title ?? "");
  const [url, setUrl] = useState(content?.url ?? "");
  const [pages, setPages] = useState(content?.pages ?? "");
  const [excerpt, setExcerpt] = useState(content?.excerpt ?? "");
  const [why, setWhy] = useState(content?.why_it_matters ?? "");

  const href = useMemo(() => toHref(url), [url]);

  const save = async () => {
    const updated = await patchBlock(block.id, {
      content_json: {
        ...(content ?? {}),
        title: title.trim(),
        url: url.trim(),
        pages: pages.trim(),
        excerpt: excerpt.trim(),
        why_it_matters: why.trim(),
      },
    });
    onUpdate(updated);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={save}
          placeholder={lang === "hu" ? "PDF cim" : "PDF title"}
          className="flex-1 rounded-lg border shell-surface-2 px-2.5 py-1.5 text-sm bg-transparent outline-none shell-interactive"
        />
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border shell-surface-2 px-2 py-1 text-[11px] shell-muted hover:text-[var(--shell-text)] shell-interactive"
          >
            PDF
          </a>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onBlur={save}
          placeholder={lang === "hu" ? "PDF URL" : "PDF URL"}
          className="flex-1 rounded-lg border shell-surface-2 px-2.5 py-1.5 text-xs bg-transparent outline-none shell-interactive"
        />
        <input
          value={pages}
          onChange={(event) => setPages(event.target.value)}
          onBlur={save}
          placeholder={lang === "hu" ? "Oldalak pl. 12-18" : "Pages e.g. 12-18"}
          className="w-36 rounded-lg border shell-surface-2 px-2.5 py-1.5 text-xs bg-transparent outline-none shell-interactive"
        />
      </div>

      <textarea
        value={excerpt}
        onChange={(event) => setExcerpt(event.target.value)}
        onBlur={save}
        placeholder={lang === "hu" ? "Fontos idezet vagy kivonat" : "Important quote or excerpt"}
        className="w-full min-h-[64px] rounded-lg border shell-surface-2 px-2.5 py-1.5 text-xs bg-transparent outline-none resize-none shell-interactive"
      />

      <input
        value={why}
        onChange={(event) => setWhy(event.target.value)}
        onBlur={save}
        placeholder={lang === "hu" ? "Miert fontos ez a boardon?" : "Why this matters in the board"}
        className="w-full rounded-lg border shell-surface-2 px-2.5 py-1.5 text-xs bg-transparent outline-none shell-interactive"
      />
    </div>
  );
}
