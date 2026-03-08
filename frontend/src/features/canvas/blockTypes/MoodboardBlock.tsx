import { useState } from "react";

import { useTranslation } from "@/hooks/useTranslation";
import { patchBlock } from "@/lib/api";
import type { CanvasBlock } from "@/types/canvas";

interface MoodItem {
  id: string;
  type: "image" | "link";
  title: string;
  url: string;
  note?: string;
}

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

export function MoodboardBlock({ block, onUpdate }: Props) {
  const { lang } = useTranslation();
  const content = block.content_json as
    | {
        title?: string;
        direction?: string;
        items?: MoodItem[];
      }
    | undefined;

  const [title, setTitle] = useState(content?.title ?? "");
  const [direction, setDirection] = useState(content?.direction ?? "");
  const [items, setItems] = useState<MoodItem[]>(Array.isArray(content?.items) ? content.items : []);
  const [newType, setNewType] = useState<"image" | "link">("image");
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newNote, setNewNote] = useState("");

  const save = async (nextItems = items) => {
    const updated = await patchBlock(block.id, {
      content_json: {
        ...(content ?? {}),
        title: title.trim(),
        direction: direction.trim(),
        items: nextItems,
      },
    });
    onUpdate(updated);
  };

  const addItem = async () => {
    if (!newUrl.trim()) return;
    const next = [
      ...items,
      {
        id: crypto.randomUUID(),
        type: newType,
        title: newTitle.trim() || (newType === "image" ? "Image reference" : "Reference link"),
        url: newUrl.trim(),
        note: newNote.trim(),
      },
    ];
    setItems(next);
    setNewTitle("");
    setNewUrl("");
    setNewNote("");
    await save(next);
  };

  const removeItem = async (id: string) => {
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    await save(next);
  };

  return (
    <div className="space-y-3">
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={() => void save()}
        placeholder={lang === "hu" ? "Moodboard cim" : "Moodboard title"}
        className="w-full rounded-lg border shell-surface-2 px-2.5 py-1.5 text-sm bg-transparent outline-none shell-interactive"
      />

      <textarea
        value={direction}
        onChange={(event) => setDirection(event.target.value)}
        onBlur={() => void save()}
        placeholder={
          lang === "hu"
            ? "Milyen vizualis iranyt, hangulatot vagy stilust epitunk?"
            : "What visual direction, tone, or style should this board express?"
        }
        className="w-full min-h-[62px] rounded-lg border shell-surface-2 px-2.5 py-1.5 text-xs bg-transparent outline-none resize-none shell-interactive"
      />

      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border shell-surface-2 overflow-hidden">
              {item.type === "image" ? (
                <img src={item.url} alt={item.title} className="h-24 w-full object-cover" />
              ) : (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="h-24 w-full flex items-center justify-center px-3 text-center text-xs text-[var(--shell-text)]/90 underline"
                >
                  {item.title}
                </a>
              )}
              <div className="px-2 py-1.5 space-y-1">
                <p className="text-[11px] text-[var(--shell-text)]/90 truncate">{item.title}</p>
                {item.note && <p className="text-[11px] shell-muted line-clamp-2">{item.note}</p>}
                <button
                  onClick={() => void removeItem(item.id)}
                  className="text-[11px] shell-muted hover:text-red-400 shell-interactive"
                >
                  {lang === "hu" ? "Torles" : "Remove"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--shell-border)] bg-[var(--shell-highlight)] px-3 py-5 text-xs shell-muted text-center">
          {lang === "hu"
            ? "Adj kepes vagy linkes referenciakat a moodboardhoz."
            : "Add image and link references to build this moodboard."}
        </div>
      )}

      <div className="rounded-xl border shell-surface-2 p-2.5 space-y-2">
        <div className="flex gap-2">
          <select
            value={newType}
            onChange={(event) => setNewType(event.target.value as "image" | "link")}
            className="w-24 rounded-lg border shell-surface-2 px-2 py-1 text-xs bg-transparent outline-none shell-interactive"
          >
            <option value="image">{lang === "hu" ? "Kep" : "Image"}</option>
            <option value="link">Link</option>
          </select>
          <input
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder={lang === "hu" ? "Cim" : "Title"}
            className="flex-1 rounded-lg border shell-surface-2 px-2.5 py-1 text-xs bg-transparent outline-none shell-interactive"
          />
        </div>
        <input
          value={newUrl}
          onChange={(event) => setNewUrl(event.target.value)}
          placeholder={lang === "hu" ? "Referencia URL" : "Reference URL"}
          className="w-full rounded-lg border shell-surface-2 px-2.5 py-1 text-xs bg-transparent outline-none shell-interactive"
        />
        <input
          value={newNote}
          onChange={(event) => setNewNote(event.target.value)}
          placeholder={lang === "hu" ? "Mit emeljek ki ebbol?" : "What should this reference communicate?"}
          className="w-full rounded-lg border shell-surface-2 px-2.5 py-1 text-xs bg-transparent outline-none shell-interactive"
        />
        <button
          onClick={() => void addItem()}
          className="rounded-lg border shell-surface-2 px-2.5 py-1 text-xs shell-muted hover:text-[var(--shell-text)] shell-interactive"
        >
          {lang === "hu" ? "Referencia hozzaadasa" : "Add reference"}
        </button>
      </div>
    </div>
  );
}
