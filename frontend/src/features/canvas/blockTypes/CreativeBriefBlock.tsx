import type { CanvasBlock } from "@/types/canvas";
import type { CreativeBrief } from "@/types/creative";

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

export function CreativeBriefBlock({ block }: Props) {
  const brief = block.content_json as Partial<CreativeBrief> | undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-violet-400 text-xs font-medium">
        <span>✨</span> Creative Brief
      </div>
      {brief?.title && <p className="text-sm font-semibold text-white">{brief.title}</p>}
      {brief?.objective && (
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-0.5">Objective</p>
          <p className="text-sm text-neutral-300">{brief.objective}</p>
        </div>
      )}
      {brief?.audience && (
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-0.5">Audience</p>
          <p className="text-sm text-neutral-300">{brief.audience}</p>
        </div>
      )}
      {brief?.tone && (
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-0.5">Tone</p>
          <p className="text-sm text-neutral-300">{brief.tone}</p>
        </div>
      )}
      {brief?.key_messages && brief.key_messages.length > 0 && (
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Key messages</p>
          <ul className="space-y-1">
            {brief.key_messages.map((m, i) => (
              <li key={i} className="text-sm text-neutral-300 flex items-start gap-1.5">
                <span className="text-violet-400 mt-0.5">·</span> {m}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
