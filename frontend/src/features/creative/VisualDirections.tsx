import type { VisualDirection } from "@/types/creative";

interface Props {
  directions: VisualDirection[];
}

export function VisualDirections({ directions }: Props) {
  if (!directions.length) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-neutral-200">Visual Directions</h3>
      {directions.map((d, i) => (
        <div key={i} className="border border-neutral-800 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-white">{d.name}</p>
          <p className="text-xs text-neutral-400 leading-relaxed">{d.rationale}</p>
          <div className="bg-neutral-800 rounded-lg p-2">
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Image prompt</p>
            <p className="text-xs text-neutral-300 italic">{d.image_prompt}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
