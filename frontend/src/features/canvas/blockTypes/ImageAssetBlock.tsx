import type { CanvasBlock } from "@/types/canvas";

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

export function ImageAssetBlock({ block }: Props) {
  const content = block.content_json as { prompt?: string; url?: string; direction_name?: string } | undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-orange-400 text-xs font-medium">
        <span>🖼️</span> Image Asset
      </div>
      {content?.direction_name && (
        <p className="text-xs text-neutral-400 font-medium">{content.direction_name}</p>
      )}
      {content?.url ? (
        <img src={content.url} alt={content.direction_name ?? "asset"} className="rounded-lg w-full" />
      ) : (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 h-32 flex items-center justify-center text-xs text-neutral-600">
          Image not generated yet
        </div>
      )}
      {content?.prompt && (
        <p className="text-xs text-neutral-500 italic leading-relaxed">{content.prompt}</p>
      )}
    </div>
  );
}
