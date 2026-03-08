import { useState } from "react";

import { useTranslation } from "@/hooks/useTranslation";
import { uploadDocument } from "@/lib/api";
import type { DocumentSummaryBundle } from "@/types/document";

interface Props {
  workspaceId: string;
  locale?: "en" | "hu";
  onCompleted?: (result: DocumentSummaryBundle) => void;
  onClose: () => void;
}

export function UploadSourceDialog({ workspaceId, locale = "en", onCompleted, onClose }: Props) {
  const { t, lang } = useTranslation();

  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const processingText = lang === "hu" ? "Feldolgozas..." : "Processing...";
  const processingState = lang === "hu" ? "Forras feldolgozasa..." : "Processing source...";
  const errorState = lang === "hu" ? "Hiba tortent, probald ujra." : "Something went wrong. Please try again.";

  const handleUpload = async () => {
    if (!name.trim() || !content.trim()) return;

    setLoading(true);
    setStatus(processingState);

    try {
      const result = await uploadDocument({
        workspace_id: workspaceId,
        name: name.trim(),
        source_type: "text",
        content_text: content.trim(),
        locale,
      });

      setStatus(lang === "hu" ? "Kesz." : "Done.");
      onCompleted?.(result);
      setTimeout(onClose, 450);
    } catch {
      setStatus(errorState);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-2xl rounded-3xl border shell-surface p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t("uploadSource")}</h2>
            <p className="text-xs shell-muted mt-1">
              {lang === "hu"
                ? "Illessz be forrasanyagot, es a mentor automatikusan strukturalt blokkokat keszit."
                : "Paste source material and the mentor will generate structured blocks automatically."}
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--shell-muted)] hover:text-[var(--shell-text)]" aria-label={t("close")}>
            x
          </button>
        </div>

        <input
          className="w-full rounded-xl border shell-surface-2 px-3 py-2 text-sm bg-transparent outline-none focus:border-[var(--shell-accent)]"
          placeholder={`${t("documentName")}...`}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <textarea
          className="w-full rounded-xl border shell-surface-2 px-3 py-2.5 text-sm bg-transparent outline-none resize-none"
          rows={10}
          placeholder={`${t("pasteContent")}...`}
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />

        {status && <p className="text-xs shell-muted">{status}</p>}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm shell-muted hover:text-[var(--shell-text)] px-4 py-2 transition">
            {t("cancel")}
          </button>
          <button
            onClick={handleUpload}
            disabled={!name.trim() || !content.trim() || loading}
            className="rounded-xl bg-[var(--shell-accent-soft)] text-[var(--shell-text)] disabled:opacity-50 text-sm font-medium px-4 py-2 transition"
          >
            {loading ? processingText : `${t("uploadSource")} + ${t("summarize")}`}
          </button>
        </div>
      </div>
    </div>
  );
}
