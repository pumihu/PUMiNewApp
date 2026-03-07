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
      setTimeout(onClose, 600);
    } catch {
      setStatus(errorState);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full max-w-2xl shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">{t("uploadSource")}</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition" aria-label={t("close")}>
            x
          </button>
        </div>

        <input
          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 outline-none"
          placeholder={`${t("documentName")}...`}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <textarea
          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none resize-none"
          rows={10}
          placeholder={`${t("pasteContent")}...`}
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />

        {status && <p className="text-xs text-neutral-400">{status}</p>}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm text-neutral-400 hover:text-white px-4 py-2 transition">
            {t("cancel")}
          </button>
          <button
            onClick={handleUpload}
            disabled={!name.trim() || !content.trim() || loading}
            className="bg-white text-black hover:bg-neutral-200 disabled:opacity-50 text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            {loading ? processingText : `${t("uploadSource")} + ${t("summarize")}`}
          </button>
        </div>
      </div>
    </div>
  );
}
