import { useState } from "react";
import { patchBlock } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import type { CanvasBlock } from "@/types/canvas";

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

interface ImageGenerationContent {
  prompt?: string;
  reference_input?: string;
  generation_modes?: string[];
  selected_mode?: string;
  status?: string;
  output_preview_url?: string;
}

export function ImageGenerationBlock({ block, onUpdate }: Props) {
  const { lang } = useTranslation();
  const content = (block.content_json as ImageGenerationContent | undefined) ?? {};

  const [prompt, setPrompt] = useState(content.prompt ?? "");
  const [referenceInput, setReferenceInput] = useState(content.reference_input ?? "");
  const [selectedMode, setSelectedMode] = useState(content.selected_mode ?? "text-to-image");
  const [saving, setSaving] = useState(false);

  const modes = Array.isArray(content.generation_modes) && content.generation_modes.length > 0
    ? content.generation_modes
    : ["text-to-image", "image-to-image", "text-to-video", "image-to-video"];

  const save = async () => {
    setSaving(true);
    try {
      const updated = await patchBlock(block.id, {
        content_json: {
          ...(block.content_json ?? {}),
          prompt,
          reference_input: referenceInput,
          selected_mode: selectedMode,
          status:
            lang === "hu"
              ? "ElÅ‘kÃ©szÃ­tett generÃ¡lÃ¡si blokk. FuttatÃ¡s mÃ©g nincs bekÃ¶tve."
              : "Prepared generation block. Execution is not wired yet.",
        },
      });
      onUpdate(updated);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] uppercase tracking-wide shell-muted">
        {lang === "hu" ? "MÃ©dia generÃ¡lÃ¡s" : "Media generation"}
      </p>

      <div className="space-y-1.5">
        <p className="text-[11px] shell-muted">{lang === "hu" ? "MÃ³d" : "Mode"}</p>
        <select
          value={selectedMode}
          onChange={(event) => setSelectedMode(event.target.value)}
          onBlur={save}
          className="w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface-2)] px-2 py-1.5 text-xs text-[var(--shell-text)] outline-none"
        >
          {modes.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] shell-muted">{lang === "hu" ? "Prompt" : "Prompt"}</p>
        <textarea
          className="w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface-2)] px-2 py-1.5 text-xs text-[var(--shell-text)] outline-none resize-none min-h-[72px]"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onBlur={save}
          placeholder={lang === "hu" ? "Ãrd le a kÃ­vÃ¡nt kimenetet..." : "Describe the desired output..."}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] shell-muted">{lang === "hu" ? "Referencia (opcionÃ¡lis)" : "Reference (optional)"}</p>
        <textarea
          className="w-full rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface-2)] px-2 py-1.5 text-xs text-[var(--shell-text)] outline-none resize-none min-h-[56px]"
          value={referenceInput}
          onChange={(event) => setReferenceInput(event.target.value)}
          onBlur={save}
          placeholder={lang === "hu" ? "LeÃ­rÃ¡s, URL vagy vizuÃ¡lis irÃ¡ny..." : "Description, URL, or visual direction..."}
        />
      </div>

      {content.output_preview_url ? (
        <img
          src={content.output_preview_url}
          alt={lang === "hu" ? "GenerÃ¡lt elÅ‘nÃ©zet" : "Generated preview"}
          className="rounded-xl border border-[var(--shell-border)] w-full"
        />
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--shell-border)] bg-[var(--shell-highlight)] min-h-[88px] px-3 py-2 text-xs shell-muted flex items-center">
          {lang === "hu"
            ? "A kimeneti elÅ‘nÃ©zet itt fog megjelenni, ha a provider futtatÃ¡s be lesz kÃ¶tve."
            : "Output preview appears here after generation runs."}
        </div>
      )}

      <p className="text-[11px] shell-muted">
        {content.status ||
          (lang === "hu"
            ? "ElÅ‘kÃ©szÃ­tett blokk. A generÃ¡lÃ¡s mÃ©g nincs Ã©lesÃ­tve."
            : "Prepared block. Ready for provider execution.")}
      </p>

      {saving && <p className="text-[11px] shell-muted">{lang === "hu" ? "MentÃ©s..." : "Saving..."}</p>}
    </div>
  );
}

