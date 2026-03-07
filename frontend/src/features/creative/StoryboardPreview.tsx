import type { StoryboardScene } from "@/types/creative";

interface Props {
  scenes: StoryboardScene[];
}

export function StoryboardPreview({ scenes }: Props) {
  if (!scenes.length) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-neutral-200">Storyboard</h3>
      <div className="grid grid-cols-1 gap-3">
        {scenes.map((scene, i) => (
          <div key={i} className="border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-neutral-500">{String(i + 1).padStart(2, "0")}</span>
              <p className="text-sm font-semibold text-white">{scene.scene_title}</p>
            </div>
            <p className="text-xs text-neutral-500 mb-1">
              <span className="text-neutral-600">Camera: </span>
              {scene.camera_direction}
            </p>
            <p className="text-xs text-neutral-300 italic mb-2">"{scene.voiceover}"</p>
            <div className="bg-neutral-800 rounded-lg p-2">
              <p className="text-xs text-neutral-600 mb-0.5">Prompt</p>
              <p className="text-xs text-neutral-400">{scene.image_prompt}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
