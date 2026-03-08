import { useState } from "react";

import { useTranslation } from "@/hooks/useTranslation";
import { patchBlock } from "@/lib/api";
import type { CanvasBlock } from "@/types/canvas";

interface ReferenceItem {
  id: string;
  title: string;
  platform?: string;
  url: string;
  note?: string;
}

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

const CONNECTOR_TARGETS = ["Pinterest", "YouTube", "Instagram", "Canva", "Calendar"];

export function ReferenceBoardBlock({ block, onUpdate }: Props) {
  const { lang } = useTranslation();
  const content = block.content_json as
    | {
        board_title?: string;
        objective?: string;
        references?: ReferenceItem[];
        connector_targets?: string[];
      }
    | undefined;

  const [boardTitle, setBoardTitle] = useState(content?.board_title ?? "");
  const [objective, setObjective] = useState(content?.objective ?? "");
  const [references, setReferences] = useState<ReferenceItem[]>(
    Array.isArray(content?.references) ? content.references : [],
  );
  const [newTitle, setNewTitle] = useState("");
  const [newPlatform, setNewPlatform] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newNote, setNewNote] = useState("");

  const save = async (nextReferences = references) => {
    const updated = await patchBlock(block.id, {
      content_json: {
        ...(content ?? {}),
        board_title: boardTitle.trim(),
        objective: objective.trim(),
        references: nextReferences,
        connector_targets: content?.connector_targets ?? CONNECTOR_TARGETS,
      },
    });
    onUpdate(updated);
  };

  const addReference = async () => {
    if (!newUrl.trim()) return;
    const next = [
      ...references,
      {
        id: crypto.randomUUID(),
        title: newTitle.trim() || (lang === "hu" ? "Uj referencia" : "New reference"),
        platform: newPlatform.trim(),
        url: newUrl.trim(),
        note: newNote.trim(),
      },
    ];
    setReferences(next);
    setNewTitle("");
    setNewPlatform("");
    setNewUrl("");
    setNewNote("");
    await save(next);
  };

  const removeReference = async (id: string) => {
    const next = references.filter((item) => item.id !== id);
    setReferences(next);
    await save(next);
  };

  const connectorTargets = Array.isArray(content?.connector_targets)
    ? content.connector_targets
    : CONNECTOR_TARGETS;

  return (
    <div className="space-y-3">
      <input
        value={boardTitle}
        onChange={(event) => setBoardTitle(event.target.value)}
        onBlur={() => void save()}
        placeholder={lang === "hu" ? "Reference board cim" : "Reference board title"}
        className="w-full rounded-lg border shell-surface-2 px-2.5 py-1.5 text-sm bg-transparent outline-none shell-interactive"
      />

      <textarea
        value={objective}
        onChange={(event) => setObjective(event.target.value)}
        onBlur={() => void save()}
        placeholder={
          lang === "hu"
            ? "Mi a board celja? (stilus, benchmark, storytone)"
            : "What is this board for? (style, benchmark, story tone)"
        }
        className="w-full min-h-[56px] rounded-lg border shell-surface-2 px-2.5 py-1.5 text-xs bg-transparent outline-none resize-none shell-interactive"
      />

      <div className="flex flex-wrap gap-1.5">
        {connectorTargets.map((target) => (
          <span key={target} className="text-[11px] rounded-md border shell-surface-2 px-2 py-0.5 shell-muted">
            {target}
          </span>
        ))}
      </div>

      {references.length > 0 ? (
        <div className="space-y-2">
          {references.map((item) => (
            <div key={item.id} className="rounded-lg border shell-surface-2 px-2.5 py-2 text-xs space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[var(--shell-text)]/95 font-medium truncate">{item.title}</p>
                <button
                  onClick={() => void removeReference(item.id)}
                  className="text-[11px] shell-muted hover:text-red-400 shell-interactive"
                >
                  {lang === "hu" ? "Torles" : "Remove"}
                </button>
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="block shell-muted underline break-all"
              >
                {item.url}
              </a>
              {item.platform && <p className="shell-muted">{item.platform}</p>}
              {item.note && <p className="shell-muted">{item.note}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--shell-border)] bg-[var(--shell-highlight)] px-3 py-4 text-xs shell-muted text-center">
          {lang === "hu"
            ? "Ez manualis referencia board. Pinterest/YouTube/Instagram csatlakozas kesobb kapcsolhato."
            : "Manual reference board for now. Pinterest/YouTube/Instagram connectors can be wired later."}
        </div>
      )}

      <div className="rounded-xl border shell-surface-2 p-2.5 space-y-2">
        <input
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          placeholder={lang === "hu" ? "Referencia cim" : "Reference title"}
          className="w-full rounded-lg border shell-surface-2 px-2 py-1 text-xs bg-transparent outline-none shell-interactive"
        />
        <div className="flex gap-2">
          <input
            value={newPlatform}
            onChange={(event) => setNewPlatform(event.target.value)}
            placeholder={lang === "hu" ? "Platform (opcionalis)" : "Platform (optional)"}
            className="w-40 rounded-lg border shell-surface-2 px-2 py-1 text-xs bg-transparent outline-none shell-interactive"
          />
          <input
            value={newUrl}
            onChange={(event) => setNewUrl(event.target.value)}
            placeholder="URL"
            className="flex-1 rounded-lg border shell-surface-2 px-2 py-1 text-xs bg-transparent outline-none shell-interactive"
          />
        </div>
        <input
          value={newNote}
          onChange={(event) => setNewNote(event.target.value)}
          placeholder={lang === "hu" ? "Miert kerul ide?" : "Why does this belong here?"}
          className="w-full rounded-lg border shell-surface-2 px-2 py-1 text-xs bg-transparent outline-none shell-interactive"
        />
        <button
          onClick={() => void addReference()}
          className="rounded-lg border shell-surface-2 px-2.5 py-1 text-xs shell-muted hover:text-[var(--shell-text)] shell-interactive"
        >
          {lang === "hu" ? "Referencia hozzaadasa" : "Add reference"}
        </button>
      </div>
    </div>
  );
}
