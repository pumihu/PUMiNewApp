import { useState } from "react";
import { buildBrief, visualize, buildStoryboard } from "@/lib/api";
import { VisualDirections } from "./VisualDirections";
import { StoryboardPreview } from "./StoryboardPreview";
import type { CreativeBrief, VisualDirection, StoryboardScene } from "@/types/creative";

interface Props {
  workspaceId: string;
  locale?: string;
}

export function CreativeModePanel({ workspaceId, locale = "en" }: Props) {
  const [goal, setGoal] = useState("");
  const [brief, setBrief] = useState<CreativeBrief | null>(null);
  const [directions, setDirections] = useState<VisualDirection[]>([]);
  const [scenes, setScenes] = useState<StoryboardScene[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const handleBrief = async () => {
    if (!goal.trim()) return;
    setLoading("brief");
    try {
      const result = await buildBrief({ workspace_id: workspaceId, goal, locale });
      setBrief(result);
      setDirections([]);
      setScenes([]);
    } finally {
      setLoading(null);
    }
  };

  const handleVisualize = async () => {
    if (!brief) return;
    const briefText = `${brief.title}. ${brief.objective}. Audience: ${brief.audience}. Tone: ${brief.tone}.`;
    setLoading("visualize");
    try {
      const result = await visualize({ workspace_id: workspaceId, brief: briefText, locale });
      setDirections(result.directions);
    } finally {
      setLoading(null);
    }
  };

  const handleStoryboard = async () => {
    if (!brief) return;
    const briefText = `${brief.title}. ${brief.objective}. Audience: ${brief.audience}. Tone: ${brief.tone}.`;
    setLoading("storyboard");
    try {
      const result = await buildStoryboard({ workspace_id: workspaceId, brief: briefText, locale });
      setScenes(result.scenes);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-neutral-200 mb-3">Creative Mode</h2>

        {/* Brief builder */}
        <div className="space-y-2">
          <textarea
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-neutral-500 resize-none"
            rows={3}
            placeholder="Describe your creative goal..."
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
          <button
            onClick={handleBrief}
            disabled={!goal.trim() || loading === "brief"}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition"
          >
            {loading === "brief" ? "Building brief..." : "Generate brief"}
          </button>
        </div>
      </div>

      {/* Brief result */}
      {brief && (
        <div className="space-y-4">
          <div className="border border-neutral-800 rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-white">{brief.title}</p>
            <p className="text-xs text-neutral-400">{brief.objective}</p>
            <div className="flex gap-3 text-xs text-neutral-500">
              <span>Audience: {brief.audience}</span>
              <span>·</span>
              <span>Tone: {brief.tone}</span>
            </div>
            {brief.key_messages.length > 0 && (
              <ul className="text-xs text-neutral-400 space-y-0.5 mt-1">
                {brief.key_messages.map((m, i) => (
                  <li key={i}>· {m}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleVisualize}
              disabled={loading === "visualize"}
              className="bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white text-xs font-medium py-2 rounded-lg transition"
            >
              {loading === "visualize" ? "Working..." : "Visual directions"}
            </button>
            <button
              onClick={handleStoryboard}
              disabled={loading === "storyboard"}
              className="bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white text-xs font-medium py-2 rounded-lg transition"
            >
              {loading === "storyboard" ? "Working..." : "Storyboard"}
            </button>
          </div>
        </div>
      )}

      {directions.length > 0 && <VisualDirections directions={directions} />}
      {scenes.length > 0 && <StoryboardPreview scenes={scenes} />}
    </div>
  );
}
