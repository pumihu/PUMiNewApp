import type { CanvasBlock } from "@/types/canvas";
import type { StoryboardScene } from "@/types/creative";

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

export function StoryboardBlock({ block }: Props) {
  const content = block.content_json as { scenes?: StoryboardScene[] } | undefined;
  const scenes = content?.scenes ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-pink-400 text-xs font-medium">
        <span>🎬</span> Storyboard
      </div>
      {scenes.length === 0 ? (
        <p className="text-xs text-neutral-600 italic">No scenes yet.</p>
      ) : (
        <div className="space-y-3">
          {scenes.map((scene, i) => (
            <div key={i} className="border border-neutral-800 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-semibold text-white">
                {i + 1}. {scene.scene_title}
              </p>
              <p className="text-xs text-neutral-400">
                <span className="text-neutral-600">Camera: </span>
                {scene.camera_direction}
              </p>
              <p className="text-xs text-neutral-300 italic">"{scene.voiceover}"</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
