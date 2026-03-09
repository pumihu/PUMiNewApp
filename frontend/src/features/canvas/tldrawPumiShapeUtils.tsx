import {
  BaseBoxShapeUtil,
  HTMLContainer,
  Rectangle2d,
  type RecordProps,
  resizeBox,
  TLBaseShape,
  T,
  type TLOnResizeHandler,
} from "@tldraw/tldraw";

type PumiShapeProps = {
  w: number;
  h: number;
  blockId: string;
  blockType: string;
  title: string;
  text: string;
  items: string;
  meta: string;
  imageUrl: string;
  sourceName: string;
  excerpt: string;
};

const pumiShapeProps = {
  w: T.number,
  h: T.number,
  blockId: T.string,
  blockType: T.string,
  title: T.string,
  text: T.string,
  items: T.string,
  meta: T.string,
  imageUrl: T.string,
  sourceName: T.string,
  excerpt: T.string,
} as const;

type PumiNoteShape = TLBaseShape<"pumi-note", PumiShapeProps>;
type PumiAiStickyShape = TLBaseShape<"pumi-ai-sticky", PumiShapeProps>;
type PumiImageShape = TLBaseShape<"pumi-image-asset", PumiShapeProps>;
type PumiSourceShape = TLBaseShape<"pumi-source", PumiShapeProps>;
type PumiLessonShape = TLBaseShape<"pumi-lesson", PumiShapeProps>;
type PumiQuizShape = TLBaseShape<"pumi-quiz", PumiShapeProps>;
type PumiFlashcardShape = TLBaseShape<"pumi-flashcard", PumiShapeProps>;
type PumiTaskListShape = TLBaseShape<"pumi-task-list", PumiShapeProps>;
type PumiRoadmapShape = TLBaseShape<"pumi-roadmap", PumiShapeProps>;
type PumiCritiqueShape = TLBaseShape<"pumi-critique", PumiShapeProps>;
type PumiBriefShape = TLBaseShape<"pumi-brief", PumiShapeProps>;
type PumiStoryboardShape = TLBaseShape<"pumi-storyboard", PumiShapeProps>;
type PumiImageGenerationShape = TLBaseShape<"pumi-image-generation", PumiShapeProps>;

const cardBase =
  "h-full w-full rounded-2xl border border-[var(--shell-border)]/78 shadow-[var(--shell-shadow-soft)] overflow-hidden bg-[var(--shell-surface)]/90 backdrop-blur-[2px]";

function titleFallback(shape: { props: PumiShapeProps }, fallback: string) {
  return shape.props.title?.trim() || fallback;
}

function parseItems(raw: string): string[] {
  return raw
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function ListCard({
  label,
  shape,
  emptyText,
  labelClassName,
}: {
  label: string;
  shape: { props: PumiShapeProps };
  emptyText: string;
  labelClassName?: string;
}) {
  const items = parseItems(shape.props.items);

  return (
    <HTMLContainer className={cardBase}>
      <div className="h-full w-full p-3.5 flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-[10px] uppercase tracking-[0.15em] shell-muted ${labelClassName ?? ""}`}>
            {label}
          </p>
          {shape.props.meta ? (
            <span className="rounded-md border border-[var(--shell-border)]/70 bg-[var(--shell-surface-2)]/65 px-1.5 py-0.5 text-[10px] shell-muted">
              {shape.props.meta}
            </span>
          ) : null}
        </div>
        <p className="text-sm font-semibold text-[var(--shell-text)] line-clamp-2 leading-snug">
          {titleFallback(shape, label)}
        </p>
        {shape.props.text ? (
          <p className="text-xs text-[var(--shell-text)]/80 leading-relaxed whitespace-pre-wrap line-clamp-4">
            {shape.props.text}
          </p>
        ) : null}
        {items.length > 0 ? (
          <div className="space-y-1">
            {items.slice(0, 6).map((item, index) => (
              <p key={`${item}-${index}`} className="text-xs text-[var(--shell-text)]/72 leading-relaxed line-clamp-1">
                - {item}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-xs shell-muted leading-relaxed">{emptyText}</p>
        )}
      </div>
    </HTMLContainer>
  );
}

export class PumiNoteShapeUtil extends BaseBoxShapeUtil<PumiNoteShape> {
  static override type = "pumi-note" as const;
  static override props: RecordProps<PumiNoteShape> = pumiShapeProps;

  getDefaultProps(): PumiShapeProps {
    return {
      w: 320,
      h: 220,
      blockId: "",
      blockType: "note",
      title: "Note",
      text: "",
      items: "",
      meta: "",
      imageUrl: "",
      sourceName: "",
      excerpt: "",
    };
  }

  getGeometry(shape: PumiNoteShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  override onResize: TLOnResizeHandler<PumiNoteShape> = (shape, info) => resizeBox(shape, info);

  component(shape: PumiNoteShape) {
    return (
      <ListCard
        label="Note"
        shape={shape}
        emptyText="Capture the key idea, decision, or next move."
      />
    );
  }

  indicator(shape: PumiNoteShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}

export class PumiAiStickyShapeUtil extends BaseBoxShapeUtil<PumiAiStickyShape> {
  static override type = "pumi-ai-sticky" as const;
  static override props: RecordProps<PumiAiStickyShape> = pumiShapeProps;

  getDefaultProps(): PumiShapeProps {
    return {
      w: 280,
      h: 190,
      blockId: "",
      blockType: "ai_sticky",
      title: "AI Insight",
      text: "",
      items: "",
      meta: "",
      imageUrl: "",
      sourceName: "",
      excerpt: "",
    };
  }

  getGeometry(shape: PumiAiStickyShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  override onResize: TLOnResizeHandler<PumiAiStickyShape> = (shape, info) => resizeBox(shape, info);

  component(shape: PumiAiStickyShape) {
    const items = parseItems(shape.props.items);
    return (
      <HTMLContainer className="ai-sticky-card h-full w-full rounded-2xl border overflow-hidden">
        <div className="h-full w-full p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-[0.15em] shell-muted">AI Insight</p>
            <span className="rounded-md border border-[var(--shell-ai-sticky-border)]/80 bg-white/5 px-1.5 py-0.5 text-[10px]">
              AI Mentor
            </span>
          </div>
          <p className="text-sm font-semibold text-[var(--shell-text)] line-clamp-2 leading-snug">
            {titleFallback(shape, "AI Insight")}
          </p>
          <p className="text-xs text-[var(--shell-text)]/85 leading-relaxed whitespace-pre-wrap line-clamp-5">
            {shape.props.text || "Pinned mentor insight ready for reuse."}
          </p>
          {items.length > 0 ? (
            <div className="space-y-1">
              {items.slice(0, 3).map((item, index) => (
                <p key={`${item}-${index}`} className="text-xs text-[var(--shell-text)]/75 line-clamp-1">
                  - {item}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: PumiAiStickyShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}

export class PumiImageShapeUtil extends BaseBoxShapeUtil<PumiImageShape> {
  static override type = "pumi-image-asset" as const;
  static override props: RecordProps<PumiImageShape> = pumiShapeProps;

  getDefaultProps(): PumiShapeProps {
    return {
      w: 360,
      h: 260,
      blockId: "",
      blockType: "image_asset",
      title: "Image Asset",
      text: "",
      items: "",
      meta: "",
      imageUrl: "",
      sourceName: "",
      excerpt: "",
    };
  }

  getGeometry(shape: PumiImageShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  override onResize: TLOnResizeHandler<PumiImageShape> = (shape, info) => resizeBox(shape, info);

  component(shape: PumiImageShape) {
    return (
      <HTMLContainer className={cardBase}>
        <div className="h-full w-full p-2.5 flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-[0.15em] shell-muted px-1">Image Asset</p>
          {shape.props.imageUrl ? (
            <img
              src={shape.props.imageUrl}
              alt={shape.props.title || "Image asset"}
              className="h-full w-full object-cover rounded-xl border border-[var(--shell-border)]/55"
            />
          ) : (
            <div className="h-full w-full rounded-xl border border-dashed border-[var(--shell-border)]/70 bg-[var(--shell-surface-2)]/45 flex items-center justify-center px-3 text-xs shell-muted text-center leading-relaxed">
              Add a reference image URL or drop generated output here.
            </div>
          )}
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: PumiImageShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}

export class PumiSourceShapeUtil extends BaseBoxShapeUtil<PumiSourceShape> {
  static override type = "pumi-source" as const;
  static override props: RecordProps<PumiSourceShape> = pumiShapeProps;

  getDefaultProps(): PumiShapeProps {
    return {
      w: 360,
      h: 250,
      blockId: "",
      blockType: "source",
      title: "Source",
      text: "",
      items: "",
      meta: "",
      imageUrl: "",
      sourceName: "Source",
      excerpt: "",
    };
  }

  getGeometry(shape: PumiSourceShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  override onResize: TLOnResizeHandler<PumiSourceShape> = (shape, info) => resizeBox(shape, info);

  component(shape: PumiSourceShape) {
    return (
      <HTMLContainer className={cardBase}>
        <div className="h-full w-full p-3.5 flex flex-col gap-2.5">
          <p className="text-[10px] uppercase tracking-[0.15em] shell-muted">Source</p>
          <p className="text-sm font-semibold text-[var(--shell-text)] line-clamp-2 leading-snug">
            {shape.props.sourceName || titleFallback(shape, "Source")}
          </p>
          <p className="text-xs text-[var(--shell-text)]/78 leading-relaxed whitespace-pre-wrap line-clamp-[10]">
            {shape.props.excerpt || shape.props.text || "Add source material to ground mentor context and block generation."}
          </p>
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: PumiSourceShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}

export class PumiLessonShapeUtil extends BaseBoxShapeUtil<PumiLessonShape> {
  static override type = "pumi-lesson" as const;
  static override props: RecordProps<PumiLessonShape> = pumiShapeProps;
  getDefaultProps(): PumiShapeProps {
    return { w: 380, h: 280, blockId: "", blockType: "lesson", title: "Lesson", text: "", items: "", meta: "", imageUrl: "", sourceName: "", excerpt: "" };
  }
  getGeometry(shape: PumiLessonShape) { return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true }); }
  override onResize: TLOnResizeHandler<PumiLessonShape> = (shape, info) => resizeBox(shape, info);
  component(shape: PumiLessonShape) { return <ListCard label="Lesson" shape={shape} emptyText="Add the core explanation and practical takeaways." />; }
  indicator(shape: PumiLessonShape) { return <rect width={shape.props.w} height={shape.props.h} />; }
}

export class PumiQuizShapeUtil extends BaseBoxShapeUtil<PumiQuizShape> {
  static override type = "pumi-quiz" as const;
  static override props: RecordProps<PumiQuizShape> = pumiShapeProps;
  getDefaultProps(): PumiShapeProps {
    return { w: 360, h: 280, blockId: "", blockType: "quiz", title: "Quiz", text: "", items: "", meta: "", imageUrl: "", sourceName: "", excerpt: "" };
  }
  getGeometry(shape: PumiQuizShape) { return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true }); }
  override onResize: TLOnResizeHandler<PumiQuizShape> = (shape, info) => resizeBox(shape, info);
  component(shape: PumiQuizShape) { return <ListCard label="Quiz" shape={shape} emptyText="Draft questions to test understanding, not memory only." />; }
  indicator(shape: PumiQuizShape) { return <rect width={shape.props.w} height={shape.props.h} />; }
}

export class PumiFlashcardShapeUtil extends BaseBoxShapeUtil<PumiFlashcardShape> {
  static override type = "pumi-flashcard" as const;
  static override props: RecordProps<PumiFlashcardShape> = pumiShapeProps;
  getDefaultProps(): PumiShapeProps {
    return { w: 360, h: 260, blockId: "", blockType: "flashcard", title: "Flashcards", text: "", items: "", meta: "", imageUrl: "", sourceName: "", excerpt: "" };
  }
  getGeometry(shape: PumiFlashcardShape) { return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true }); }
  override onResize: TLOnResizeHandler<PumiFlashcardShape> = (shape, info) => resizeBox(shape, info);
  component(shape: PumiFlashcardShape) { return <ListCard label="Flashcards" shape={shape} emptyText="Create concise front-back cards for quick recall." />; }
  indicator(shape: PumiFlashcardShape) { return <rect width={shape.props.w} height={shape.props.h} />; }
}

export class PumiTaskListShapeUtil extends BaseBoxShapeUtil<PumiTaskListShape> {
  static override type = "pumi-task-list" as const;
  static override props: RecordProps<PumiTaskListShape> = pumiShapeProps;
  getDefaultProps(): PumiShapeProps {
    return { w: 360, h: 280, blockId: "", blockType: "task_list", title: "Task List", text: "", items: "", meta: "", imageUrl: "", sourceName: "", excerpt: "" };
  }
  getGeometry(shape: PumiTaskListShape) { return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true }); }
  override onResize: TLOnResizeHandler<PumiTaskListShape> = (shape, info) => resizeBox(shape, info);
  component(shape: PumiTaskListShape) { return <ListCard label="Task List" shape={shape} emptyText="List concrete next actions with ownership." />; }
  indicator(shape: PumiTaskListShape) { return <rect width={shape.props.w} height={shape.props.h} />; }
}

export class PumiRoadmapShapeUtil extends BaseBoxShapeUtil<PumiRoadmapShape> {
  static override type = "pumi-roadmap" as const;
  static override props: RecordProps<PumiRoadmapShape> = pumiShapeProps;
  getDefaultProps(): PumiShapeProps {
    return { w: 380, h: 280, blockId: "", blockType: "roadmap", title: "Roadmap", text: "", items: "", meta: "", imageUrl: "", sourceName: "", excerpt: "" };
  }
  getGeometry(shape: PumiRoadmapShape) { return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true }); }
  override onResize: TLOnResizeHandler<PumiRoadmapShape> = (shape, info) => resizeBox(shape, info);
  component(shape: PumiRoadmapShape) { return <ListCard label="Roadmap" shape={shape} emptyText="Map phases with outcomes and decision points." />; }
  indicator(shape: PumiRoadmapShape) { return <rect width={shape.props.w} height={shape.props.h} />; }
}

export class PumiCritiqueShapeUtil extends BaseBoxShapeUtil<PumiCritiqueShape> {
  static override type = "pumi-critique" as const;
  static override props: RecordProps<PumiCritiqueShape> = pumiShapeProps;
  getDefaultProps(): PumiShapeProps {
    return { w: 380, h: 280, blockId: "", blockType: "critique", title: "Critique", text: "", items: "", meta: "", imageUrl: "", sourceName: "", excerpt: "" };
  }
  getGeometry(shape: PumiCritiqueShape) { return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true }); }
  override onResize: TLOnResizeHandler<PumiCritiqueShape> = (shape, info) => resizeBox(shape, info);
  component(shape: PumiCritiqueShape) { return <ListCard label="Critique" shape={shape} emptyText="Capture strengths, risks, and suggested improvements." />; }
  indicator(shape: PumiCritiqueShape) { return <rect width={shape.props.w} height={shape.props.h} />; }
}

export class PumiBriefShapeUtil extends BaseBoxShapeUtil<PumiBriefShape> {
  static override type = "pumi-brief" as const;
  static override props: RecordProps<PumiBriefShape> = pumiShapeProps;
  getDefaultProps(): PumiShapeProps {
    return { w: 380, h: 280, blockId: "", blockType: "brief", title: "Brief", text: "", items: "", meta: "", imageUrl: "", sourceName: "", excerpt: "" };
  }
  getGeometry(shape: PumiBriefShape) { return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true }); }
  override onResize: TLOnResizeHandler<PumiBriefShape> = (shape, info) => resizeBox(shape, info);
  component(shape: PumiBriefShape) { return <ListCard label="Brief" shape={shape} emptyText="Define objective, audience, tone, and desired output." />; }
  indicator(shape: PumiBriefShape) { return <rect width={shape.props.w} height={shape.props.h} />; }
}

export class PumiStoryboardShapeUtil extends BaseBoxShapeUtil<PumiStoryboardShape> {
  static override type = "pumi-storyboard" as const;
  static override props: RecordProps<PumiStoryboardShape> = pumiShapeProps;
  getDefaultProps(): PumiShapeProps {
    return { w: 400, h: 300, blockId: "", blockType: "storyboard", title: "Storyboard", text: "", items: "", meta: "", imageUrl: "", sourceName: "", excerpt: "" };
  }
  getGeometry(shape: PumiStoryboardShape) { return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true }); }
  override onResize: TLOnResizeHandler<PumiStoryboardShape> = (shape, info) => resizeBox(shape, info);
  component(shape: PumiStoryboardShape) { return <ListCard label="Storyboard" shape={shape} emptyText="Outline scenes and transitions for the narrative flow." />; }
  indicator(shape: PumiStoryboardShape) { return <rect width={shape.props.w} height={shape.props.h} />; }
}

export class PumiImageGenerationShapeUtil extends BaseBoxShapeUtil<PumiImageGenerationShape> {
  static override type = "pumi-image-generation" as const;
  static override props: RecordProps<PumiImageGenerationShape> = pumiShapeProps;
  getDefaultProps(): PumiShapeProps {
    return { w: 400, h: 300, blockId: "", blockType: "image_generation", title: "Image Generation", text: "", items: "", meta: "", imageUrl: "", sourceName: "", excerpt: "" };
  }
  getGeometry(shape: PumiImageGenerationShape) { return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true }); }
  override onResize: TLOnResizeHandler<PumiImageGenerationShape> = (shape, info) => resizeBox(shape, info);
  component(shape: PumiImageGenerationShape) { return <ListCard label="Image Generation" shape={shape} emptyText="Set prompt, model intent, and optional references." />; }
  indicator(shape: PumiImageGenerationShape) { return <rect width={shape.props.w} height={shape.props.h} />; }
}

export const pumiShapeUtils = [
  PumiNoteShapeUtil,
  PumiAiStickyShapeUtil,
  PumiImageShapeUtil,
  PumiSourceShapeUtil,
  PumiLessonShapeUtil,
  PumiQuizShapeUtil,
  PumiFlashcardShapeUtil,
  PumiTaskListShapeUtil,
  PumiRoadmapShapeUtil,
  PumiCritiqueShapeUtil,
  PumiBriefShapeUtil,
  PumiStoryboardShapeUtil,
  PumiImageGenerationShapeUtil,
] as const;


