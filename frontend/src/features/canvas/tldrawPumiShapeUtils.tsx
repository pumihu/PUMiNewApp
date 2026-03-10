import {
  BaseBoxShapeUtil,
  HTMLContainer,
  Rectangle2d,
  RichTextLabel,
  type RecordProps,
  renderPlaintextFromRichText,
  resizeBox,
  TLBaseShape,
  type TLDefaultFontStyle,
  type TLRichText,
  T,
  toRichText,
  type TLOnResizeHandler,
} from "@tldraw/tldraw";
import { richTextValidator } from "@tldraw/tlschema";

type PumiShapeProps = {
  w: number;
  h: number;
  blockId: string;
  blockType: string;
  title: string;
  subtitle: string;
  richText: TLRichText;
  font: TLDefaultFontStyle;
  fontSize: number;
  textColor: string;
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
  subtitle: T.string,
  richText: richTextValidator,
  font: T.string,
  fontSize: T.number,
  textColor: T.string,
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
type PumiMoodboardShape = TLBaseShape<"pumi-moodboard", PumiShapeProps>;
type PumiGifShape = TLBaseShape<"pumi-gif", PumiShapeProps>;
type PumiStickerShape = TLBaseShape<"pumi-sticker", PumiShapeProps>;
type PumiReferenceShape = TLBaseShape<"pumi-reference", PumiShapeProps>;

const cardBase =
  "h-full w-full rounded-2xl border border-[var(--shell-border)]/78 shadow-[var(--shell-shadow-soft)] overflow-hidden bg-[var(--shell-surface)]/90 backdrop-blur-[2px]";
const defaultTextProps = {
  subtitle: "",
  richText: toRichText(""),
  font: "sans" as TLDefaultFontStyle,
  fontSize: 15,
  textColor: "default",
};

function titleFallback(shape: { props: PumiShapeProps }, fallback: string) {
  return shape.props.title?.trim() || fallback;
}

function parseItems(raw: string): string[] {
  return raw
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveTextColor(key: string): string {
  if (key === "black") return "#111111";
  if (key === "charcoal") return "#2e3440";
  if (key === "muted") return "var(--shell-muted)";
  if (key === "accent") return "var(--shell-accent)";
  if (key === "success") return "#22c55e";
  if (key === "warning") return "#f59e0b";
  if (key === "danger") return "#ef4444";
  if (key === "violet") return "#8b5cf6";
  return "var(--shell-text)";
}

function normalizedRichText(shape: { props: PumiShapeProps }): TLRichText {
  return shape.props.richText ?? toRichText(shape.props.text || "");
}

function isLikelyImageUrl(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.startsWith("data:image/") ||
    normalized.endsWith(".png") ||
    normalized.endsWith(".jpg") ||
    normalized.endsWith(".jpeg") ||
    normalized.endsWith(".gif") ||
    normalized.endsWith(".webp") ||
    normalized.endsWith(".svg") ||
    normalized.includes("images") ||
    normalized.includes("img")
  );
}

function mediaItems(shape: { props: PumiShapeProps }): string[] {
  const lines = parseItems(shape.props.items).filter(isLikelyImageUrl);
  if (shape.props.imageUrl && isLikelyImageUrl(shape.props.imageUrl)) {
    return [shape.props.imageUrl, ...lines.filter((item) => item !== shape.props.imageUrl)];
  }
  return lines;
}

function safeDomain(value: string): string {
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function ListCard({
  label,
  shape,
  emptyText,
  labelClassName,
  isSelected,
}: {
  label: string;
  shape: { id: string; type: string; props: PumiShapeProps };
  emptyText: string;
  labelClassName?: string;
  isSelected: boolean;
}) {
  const items = parseItems(shape.props.items);
  const showBody = true;

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
        {shape.props.subtitle ? (
          <p className="text-[11px] shell-muted leading-relaxed line-clamp-2">{shape.props.subtitle}</p>
        ) : null}
        {showBody ? (
          <div className="flex-1 min-h-0 overflow-hidden rounded-lg border border-[var(--shell-border)]/60 bg-[var(--shell-surface-2)]/35 px-2 py-1.5">
            <RichTextLabel
              shapeId={shape.id as any}
              type={shape.type as any}
              richText={normalizedRichText(shape)}
              isSelected={isSelected}
              font={shape.props.font || "sans"}
              fontSize={shape.props.fontSize || 15}
              lineHeight={1.35}
              align="start"
              verticalAlign="start"
              labelColor={resolveTextColor(shape.props.textColor)}
              wrap
              showTextOutline={false}
            />
          </div>
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
      ...defaultTextProps,
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
  override canEdit() {
    return true;
  }
  override getText(shape: PumiNoteShape) {
    return renderPlaintextFromRichText(this.editor, normalizedRichText(shape));
  }

  component(shape: PumiNoteShape) {
    const isSelected = shape.id === this.editor.getOnlySelectedShapeId();
    return (
      <ListCard
        label="Note"
        shape={shape}
        emptyText="Capture the key idea, decision, or next move."
        isSelected={isSelected}
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
      ...defaultTextProps,
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
  override canEdit() {
    return true;
  }
  override getText(shape: PumiAiStickyShape) {
    return renderPlaintextFromRichText(this.editor, normalizedRichText(shape));
  }

  component(shape: PumiAiStickyShape) {
    const isSelected = shape.id === this.editor.getOnlySelectedShapeId();
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
          {shape.props.subtitle ? (
            <p className="text-[11px] shell-muted leading-relaxed line-clamp-2">{shape.props.subtitle}</p>
          ) : null}
          <div className="flex-1 min-h-0 overflow-hidden rounded-lg border border-[var(--shell-ai-sticky-border)]/60 bg-black/5 px-2 py-1.5">
            <RichTextLabel
              shapeId={shape.id as any}
              type={shape.type as any}
              richText={normalizedRichText(shape)}
              isSelected={isSelected}
              font={shape.props.font || "sans"}
              fontSize={shape.props.fontSize || 15}
              lineHeight={1.35}
              align="start"
              verticalAlign="start"
              labelColor={resolveTextColor(shape.props.textColor)}
              wrap
              showTextOutline={false}
            />
          </div>
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
      ...defaultTextProps,
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
    const caption = shape.props.text || shape.props.excerpt || "";
    const sourceLabel = shape.props.meta || (shape.props.sourceName && shape.props.sourceName !== "Source" ? shape.props.sourceName : "");
    const domain = safeDomain(shape.props.imageUrl);
    const hasImage = Boolean(shape.props.imageUrl);
    return (
      <HTMLContainer className="h-full w-full rounded-2xl border border-[var(--shell-border)] shadow-[var(--shell-shadow-soft)] overflow-hidden bg-[var(--shell-surface)]">
        <div className="h-full w-full p-2.5 flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-2 px-1">
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--shell-text)]/70">Image Asset</p>
              <p className="text-sm font-semibold text-[var(--shell-text)] leading-snug line-clamp-1 mt-1">
                {titleFallback(shape, "Image Asset")}
              </p>
            </div>
            {(sourceLabel || domain) && (
              <span className="rounded-md border border-[var(--shell-border)]/75 bg-[var(--shell-surface-2)] px-1.5 py-0.5 text-[10px] shell-muted">
                {sourceLabel || domain}
              </span>
            )}
          </div>
          {hasImage ? (
            <div className="relative flex-1 min-h-0 rounded-xl overflow-hidden border border-[var(--shell-border)]">
              <img
                src={shape.props.imageUrl}
                alt={shape.props.title || "Image asset"}
                className="h-full w-full object-cover"
              />
              {(shape.props.title || caption) && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/30 to-transparent px-2.5 py-2">
                  {caption && <p className="text-[11px] text-white/85 leading-relaxed line-clamp-2">{caption}</p>}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full w-full rounded-xl border border-dashed border-[var(--shell-border)] bg-[var(--shell-surface-2)]/75 flex items-center justify-center px-3 text-xs text-[var(--shell-text)]/85 text-center leading-relaxed">
              Add an image URL to make this asset visible on the board.
            </div>
          )}
          {!hasImage && caption ? (
            <p className="text-xs shell-muted leading-relaxed line-clamp-2 px-1">{caption}</p>
          ) : null}
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
      ...defaultTextProps,
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
    const isSelected = shape.id === this.editor.getOnlySelectedShapeId();
    const sourceDomain = safeDomain(shape.props.imageUrl) || safeDomain(shape.props.sourceName);
    return (
      <HTMLContainer className={cardBase}>
        <div className="h-full w-full p-3.5 flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] uppercase tracking-[0.15em] shell-muted">Source</p>
            {(shape.props.meta || sourceDomain) && (
              <span className="rounded-md border border-[var(--shell-border)]/70 bg-[var(--shell-surface-2)]/65 px-1.5 py-0.5 text-[10px] shell-muted">
                {shape.props.meta || sourceDomain}
              </span>
            )}
          </div>
          {shape.props.imageUrl && isLikelyImageUrl(shape.props.imageUrl) ? (
            <div className="h-24 rounded-lg overflow-hidden border border-[var(--shell-border)]/55">
              <img src={shape.props.imageUrl} alt={shape.props.sourceName || "Source preview"} className="h-full w-full object-cover" />
            </div>
          ) : null}
          <p className="text-sm font-semibold text-[var(--shell-text)] line-clamp-2 leading-snug">
            {shape.props.sourceName || titleFallback(shape, "Source")}
          </p>
          {shape.props.subtitle ? (
            <p className="text-[11px] shell-muted leading-relaxed line-clamp-2">{shape.props.subtitle}</p>
          ) : null}
          <div className="flex-1 min-h-0 overflow-hidden rounded-lg border border-[var(--shell-border)]/60 bg-[var(--shell-surface-2)]/35 px-2 py-1.5">
            <RichTextLabel
              shapeId={shape.id as any}
              type={shape.type as any}
              richText={normalizedRichText(shape)}
              isSelected={isSelected}
              font={shape.props.font || "sans"}
              fontSize={shape.props.fontSize || 15}
              lineHeight={1.35}
              align="start"
              verticalAlign="start"
              labelColor={resolveTextColor(shape.props.textColor)}
              wrap
              showTextOutline={false}
            />
          </div>
          {!isSelected && !shape.props.excerpt && !shape.props.text && !shape.props.subtitle && (
            <p className="text-xs shell-muted leading-relaxed">
              Add source material to ground mentor context and block generation.
            </p>
          )}
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
    return { w: 380, h: 280, blockId: "", blockType: "lesson", title: "Lesson", ...defaultTextProps, text: "", items: "", meta: "", imageUrl: "", sourceName: "", excerpt: "" };
  }
  getGeometry(shape: PumiLessonShape) { return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true }); }
  override onResize: TLOnResizeHandler<PumiLessonShape> = (shape, info) => resizeBox(shape, info);
  override canEdit() { return true; }
  override getText(shape: PumiLessonShape) { return renderPlaintextFromRichText(this.editor, normalizedRichText(shape)); }
  component(shape: PumiLessonShape) {
    const isSelected = shape.id === this.editor.getOnlySelectedShapeId();
    return <ListCard label="Lesson" shape={shape} emptyText="Add the core explanation and practical takeaways." isSelected={isSelected} />;
  }
  indicator(shape: PumiLessonShape) { return <rect width={shape.props.w} height={shape.props.h} />; }
}

export class PumiQuizShapeUtil extends BaseBoxShapeUtil<PumiQuizShape> {
  static override type = "pumi-quiz" as const;
  static override props: RecordProps<PumiQuizShape> = pumiShapeProps;
  getDefaultProps(): PumiShapeProps {
    return { w: 360, h: 280, blockId: "", blockType: "quiz", title: "Quiz", ...defaultTextProps, text: "", items: "", meta: "", imageUrl: "", sourceName: "", excerpt: "" };
  }
  getGeometry(shape: PumiQuizShape) { return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true }); }
  override onResize: TLOnResizeHandler<PumiQuizShape> = (shape, info) => resizeBox(shape, info);
  component(shape: PumiQuizShape) {
    const isSelected = shape.id === this.editor.getOnlySelectedShapeId();
    return <ListCard label="Quiz" shape={shape} emptyText="Draft questions to test understanding, not memory only." isSelected={isSelected} />;
  }
  indicator(shape: PumiQuizShape) { return <rect width={shape.props.w} height={shape.props.h} />; }
}

export class PumiFlashcardShapeUtil extends BaseBoxShapeUtil<PumiFlashcardShape> {
  static override type = "pumi-flashcard" as const;
  static override props: RecordProps<PumiFlashcardShape> = pumiShapeProps;
  getDefaultProps(): PumiShapeProps {
    return { w: 360, h: 260, blockId: "", blockType: "flashcard", title: "Flashcards", ...defaultTextProps, text: "", items: "", meta: "", imageUrl: "", sourceName: "", excerpt: "" };
  }
  getGeometry(shape: PumiFlashcardShape) { return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true }); }
  override onResize: TLOnResizeHandler<PumiFlashcardShape> = (shape, info) => resizeBox(shape, info);
  component(shape: PumiFlashcardShape) {
    const isSelected = shape.id === this.editor.getOnlySelectedShapeId();
    return <ListCard label="Flashcards" shape={shape} emptyText="Create concise front-back cards for quick recall." isSelected={isSelected} />;
  }
  indicator(shape: PumiFlashcardShape) { return <rect width={shape.props.w} height={shape.props.h} />; }
}

export class PumiTaskListShapeUtil extends BaseBoxShapeUtil<PumiTaskListShape> {
  static override type = "pumi-task-list" as const;
  static override props: RecordProps<PumiTaskListShape> = pumiShapeProps;
  getDefaultProps(): PumiShapeProps {
    return { w: 360, h: 280, blockId: "", blockType: "task_list", title: "Task List", ...defaultTextProps, text: "", items: "", meta: "", imageUrl: "", sourceName: "", excerpt: "" };
  }
  getGeometry(shape: PumiTaskListShape) { return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true }); }
  override onResize: TLOnResizeHandler<PumiTaskListShape> = (shape, info) => resizeBox(shape, info);
  component(shape: PumiTaskListShape) {
    const isSelected = shape.id === this.editor.getOnlySelectedShapeId();
    return <ListCard label="Task List" shape={shape} emptyText="List concrete next actions with ownership." isSelected={isSelected} />;
  }
  indicator(shape: PumiTaskListShape) { return <rect width={shape.props.w} height={shape.props.h} />; }
}

export class PumiRoadmapShapeUtil extends BaseBoxShapeUtil<PumiRoadmapShape> {
  static override type = "pumi-roadmap" as const;
  static override props: RecordProps<PumiRoadmapShape> = pumiShapeProps;
  getDefaultProps(): PumiShapeProps {
    return { w: 380, h: 280, blockId: "", blockType: "roadmap", title: "Roadmap", ...defaultTextProps, text: "", items: "", meta: "", imageUrl: "", sourceName: "", excerpt: "" };
  }
  getGeometry(shape: PumiRoadmapShape) { return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true }); }
  override onResize: TLOnResizeHandler<PumiRoadmapShape> = (shape, info) => resizeBox(shape, info);
  component(shape: PumiRoadmapShape) {
    const isSelected = shape.id === this.editor.getOnlySelectedShapeId();
    return <ListCard label="Roadmap" shape={shape} emptyText="Map phases with outcomes and decision points." isSelected={isSelected} />;
  }
  indicator(shape: PumiRoadmapShape) { return <rect width={shape.props.w} height={shape.props.h} />; }
}

export class PumiCritiqueShapeUtil extends BaseBoxShapeUtil<PumiCritiqueShape> {
  static override type = "pumi-critique" as const;
  static override props: RecordProps<PumiCritiqueShape> = pumiShapeProps;
  getDefaultProps(): PumiShapeProps {
    return { w: 380, h: 280, blockId: "", blockType: "critique", title: "Critique", ...defaultTextProps, text: "", items: "", meta: "", imageUrl: "", sourceName: "", excerpt: "" };
  }
  getGeometry(shape: PumiCritiqueShape) { return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true }); }
  override onResize: TLOnResizeHandler<PumiCritiqueShape> = (shape, info) => resizeBox(shape, info);
  component(shape: PumiCritiqueShape) {
    const isSelected = shape.id === this.editor.getOnlySelectedShapeId();
    return <ListCard label="Critique" shape={shape} emptyText="Capture strengths, risks, and suggested improvements." isSelected={isSelected} />;
  }
  indicator(shape: PumiCritiqueShape) { return <rect width={shape.props.w} height={shape.props.h} />; }
}

export class PumiBriefShapeUtil extends BaseBoxShapeUtil<PumiBriefShape> {
  static override type = "pumi-brief" as const;
  static override props: RecordProps<PumiBriefShape> = pumiShapeProps;
  getDefaultProps(): PumiShapeProps {
    return { w: 380, h: 280, blockId: "", blockType: "brief", title: "Brief", ...defaultTextProps, text: "", items: "", meta: "", imageUrl: "", sourceName: "", excerpt: "" };
  }
  getGeometry(shape: PumiBriefShape) { return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true }); }
  override onResize: TLOnResizeHandler<PumiBriefShape> = (shape, info) => resizeBox(shape, info);
  override canEdit() { return true; }
  override getText(shape: PumiBriefShape) { return renderPlaintextFromRichText(this.editor, normalizedRichText(shape)); }
  component(shape: PumiBriefShape) {
    const isSelected = shape.id === this.editor.getOnlySelectedShapeId();
    return <ListCard label="Brief" shape={shape} emptyText="Define objective, audience, tone, and desired output." isSelected={isSelected} />;
  }
  indicator(shape: PumiBriefShape) { return <rect width={shape.props.w} height={shape.props.h} />; }
}

export class PumiStoryboardShapeUtil extends BaseBoxShapeUtil<PumiStoryboardShape> {
  static override type = "pumi-storyboard" as const;
  static override props: RecordProps<PumiStoryboardShape> = pumiShapeProps;
  getDefaultProps(): PumiShapeProps {
    return { w: 400, h: 300, blockId: "", blockType: "storyboard", title: "Storyboard", ...defaultTextProps, text: "", items: "", meta: "", imageUrl: "", sourceName: "", excerpt: "" };
  }
  getGeometry(shape: PumiStoryboardShape) { return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true }); }
  override onResize: TLOnResizeHandler<PumiStoryboardShape> = (shape, info) => resizeBox(shape, info);
  override canEdit() { return true; }
  override getText(shape: PumiStoryboardShape) { return renderPlaintextFromRichText(this.editor, normalizedRichText(shape)); }
  component(shape: PumiStoryboardShape) {
    const isSelected = shape.id === this.editor.getOnlySelectedShapeId();
    return <ListCard label="Storyboard" shape={shape} emptyText="Outline scenes and transitions for the narrative flow." isSelected={isSelected} />;
  }
  indicator(shape: PumiStoryboardShape) { return <rect width={shape.props.w} height={shape.props.h} />; }
}

export class PumiImageGenerationShapeUtil extends BaseBoxShapeUtil<PumiImageGenerationShape> {
  static override type = "pumi-image-generation" as const;
  static override props: RecordProps<PumiImageGenerationShape> = pumiShapeProps;
  getDefaultProps(): PumiShapeProps {
    return { w: 400, h: 300, blockId: "", blockType: "image_generation", title: "Image Generation", ...defaultTextProps, text: "", items: "", meta: "", imageUrl: "", sourceName: "", excerpt: "" };
  }
  getGeometry(shape: PumiImageGenerationShape) { return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true }); }
  override onResize: TLOnResizeHandler<PumiImageGenerationShape> = (shape, info) => resizeBox(shape, info);
  component(shape: PumiImageGenerationShape) {
    const chips = parseItems(shape.props.items);
    const prompt = shape.props.text || shape.props.excerpt;
    return (
      <HTMLContainer className={cardBase}>
        <div className="h-full w-full p-2.5 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2 px-1">
            <p className="text-[10px] uppercase tracking-[0.15em] shell-muted">Image Generation</p>
            <span className="rounded-md border border-[var(--shell-border)]/70 bg-[var(--shell-surface-2)]/70 px-1.5 py-0.5 text-[10px] shell-muted">
              {shape.props.meta || "Prepared"}
            </span>
          </div>
          <div className="flex-1 min-h-0 rounded-xl border border-[var(--shell-border)]/60 bg-[var(--shell-surface-2)]/40 overflow-hidden">
            {shape.props.imageUrl && isLikelyImageUrl(shape.props.imageUrl) ? (
              <img src={shape.props.imageUrl} alt={shape.props.title || "Generated output"} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center px-3 text-xs shell-muted text-center leading-relaxed">
                Output preview appears here when a generation result is available.
              </div>
            )}
          </div>
          {prompt ? (
            <p className="text-xs text-[var(--shell-text)]/85 leading-relaxed line-clamp-3">
              {prompt}
            </p>
          ) : (
            <p className="text-xs shell-muted leading-relaxed">Add prompt and references to prepare this visual generation asset.</p>
          )}
          {chips.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {chips.slice(0, 4).map((chip, index) => (
                <span key={`${chip}-${index}`} className="rounded-md border border-[var(--shell-border)]/65 bg-[var(--shell-surface-2)]/60 px-1.5 py-0.5 text-[10px] shell-muted">
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </HTMLContainer>
    );
  }
  indicator(shape: PumiImageGenerationShape) { return <rect width={shape.props.w} height={shape.props.h} />; }
}

export class PumiMoodboardShapeUtil extends BaseBoxShapeUtil<PumiMoodboardShape> {
  static override type = "pumi-moodboard" as const;
  static override props: RecordProps<PumiMoodboardShape> = pumiShapeProps;
  getDefaultProps(): PumiShapeProps {
    return { w: 460, h: 320, blockId: "", blockType: "moodboard", title: "Moodboard", ...defaultTextProps, text: "", items: "", meta: "", imageUrl: "", sourceName: "", excerpt: "" };
  }
  getGeometry(shape: PumiMoodboardShape) { return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true }); }
  override onResize: TLOnResizeHandler<PumiMoodboardShape> = (shape, info) => resizeBox(shape, info);
  component(shape: PumiMoodboardShape) {
    const media = mediaItems(shape).slice(0, 6);
    return (
      <HTMLContainer className={cardBase}>
        <div className="h-full w-full p-2.5 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2 px-1">
            <p className="text-[10px] uppercase tracking-[0.15em] shell-muted">Moodboard</p>
            {shape.props.meta ? (
              <span className="rounded-md border border-[var(--shell-border)]/70 bg-[var(--shell-surface-2)]/65 px-1.5 py-0.5 text-[10px] shell-muted">
                {shape.props.meta}
              </span>
            ) : null}
          </div>
          <p className="text-sm font-semibold text-[var(--shell-text)] line-clamp-1 px-1">
            {titleFallback(shape, "Moodboard")}
          </p>
          <div className="flex-1 min-h-0 rounded-xl border border-[var(--shell-border)]/55 bg-[var(--shell-surface-2)]/35 p-1.5 grid grid-cols-3 gap-1.5">
            {media.length > 0 ? (
              media.map((url, index) => (
                <div key={`${url}-${index}`} className="rounded-lg overflow-hidden border border-[var(--shell-border)]/50 bg-[var(--shell-surface)]/60">
                  <img src={url} alt={`Moodboard ${index + 1}`} className="h-full w-full object-cover" />
                </div>
              ))
            ) : (
              <div className="col-span-3 h-full rounded-lg border border-dashed border-[var(--shell-border)]/70 flex items-center justify-center text-xs shell-muted text-center px-3">
                Add 3-6 visual references to build direction and mood.
              </div>
            )}
          </div>
          {shape.props.text || shape.props.excerpt ? (
            <p className="text-xs shell-muted leading-relaxed line-clamp-2 px-1">{shape.props.text || shape.props.excerpt}</p>
          ) : null}
        </div>
      </HTMLContainer>
    );
  }
  indicator(shape: PumiMoodboardShape) { return <rect width={shape.props.w} height={shape.props.h} />; }
}

export class PumiGifShapeUtil extends BaseBoxShapeUtil<PumiGifShape> {
  static override type = "pumi-gif" as const;
  static override props: RecordProps<PumiGifShape> = pumiShapeProps;
  getDefaultProps(): PumiShapeProps {
    return { w: 360, h: 260, blockId: "", blockType: "gif", title: "GIF", ...defaultTextProps, text: "", items: "", meta: "", imageUrl: "", sourceName: "", excerpt: "" };
  }
  getGeometry(shape: PumiGifShape) { return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true }); }
  override onResize: TLOnResizeHandler<PumiGifShape> = (shape, info) => resizeBox(shape, info);
  component(shape: PumiGifShape) {
    return (
      <HTMLContainer className={cardBase}>
        <div className="h-full w-full p-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 px-1">
            <p className="text-[10px] uppercase tracking-[0.15em] shell-muted">GIF</p>
            <span className="rounded-md border border-[var(--shell-border)]/70 bg-[var(--shell-surface-2)]/70 px-1.5 py-0.5 text-[10px] shell-muted">
              {shape.props.meta || "Visual cue"}
            </span>
          </div>
          <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-[var(--shell-border)]/55 bg-[var(--shell-surface-2)]/35">
            {shape.props.imageUrl && isLikelyImageUrl(shape.props.imageUrl) ? (
              <img src={shape.props.imageUrl} alt={shape.props.title || "GIF"} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs shell-muted px-3 text-center">
                Add a GIF URL to use this as a tone or context marker.
              </div>
            )}
          </div>
          {shape.props.text ? <p className="text-xs shell-muted line-clamp-2 px-1">{shape.props.text}</p> : null}
        </div>
      </HTMLContainer>
    );
  }
  indicator(shape: PumiGifShape) { return <rect width={shape.props.w} height={shape.props.h} />; }
}

export class PumiStickerShapeUtil extends BaseBoxShapeUtil<PumiStickerShape> {
  static override type = "pumi-sticker" as const;
  static override props: RecordProps<PumiStickerShape> = pumiShapeProps;
  getDefaultProps(): PumiShapeProps {
    return { w: 220, h: 180, blockId: "", blockType: "sticker", title: "Sticker", ...defaultTextProps, text: "✨", items: "", meta: "", imageUrl: "", sourceName: "", excerpt: "" };
  }
  getGeometry(shape: PumiStickerShape) { return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true }); }
  override onResize: TLOnResizeHandler<PumiStickerShape> = (shape, info) => resizeBox(shape, info);
  component(shape: PumiStickerShape) {
    const symbol = shape.props.text?.trim() || shape.props.title?.trim() || "✨";
    const symbolSize = Math.max(42, Math.min(shape.props.w, shape.props.h) * 0.34);
    return (
      <HTMLContainer className="h-full w-full rounded-2xl border border-[var(--shell-border)]/80 bg-[var(--shell-surface)]/92 shadow-[var(--shell-shadow-soft)] overflow-hidden">
        <div className="h-full w-full p-3 flex flex-col gap-2 items-center justify-center text-center">
          <p style={{ fontSize: symbolSize, lineHeight: 1 }} className="select-none">
            {symbol}
          </p>
          {shape.props.excerpt || shape.props.subtitle ? (
            <p className="text-[11px] shell-muted leading-relaxed line-clamp-2">{shape.props.excerpt || shape.props.subtitle}</p>
          ) : null}
        </div>
      </HTMLContainer>
    );
  }
  indicator(shape: PumiStickerShape) { return <rect width={shape.props.w} height={shape.props.h} />; }
}

export class PumiReferenceShapeUtil extends BaseBoxShapeUtil<PumiReferenceShape> {
  static override type = "pumi-reference" as const;
  static override props: RecordProps<PumiReferenceShape> = pumiShapeProps;
  getDefaultProps(): PumiShapeProps {
    return { w: 360, h: 220, blockId: "", blockType: "reference", title: "Reference", ...defaultTextProps, text: "", items: "", meta: "", imageUrl: "", sourceName: "", excerpt: "" };
  }
  getGeometry(shape: PumiReferenceShape) { return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true }); }
  override onResize: TLOnResizeHandler<PumiReferenceShape> = (shape, info) => resizeBox(shape, info);
  component(shape: PumiReferenceShape) {
    const domain = safeDomain(shape.props.sourceName) || safeDomain(shape.props.excerpt);
    return (
      <HTMLContainer className={cardBase}>
        <div className="h-full w-full p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-[0.15em] shell-muted">{shape.props.meta || "Reference"}</p>
            {(shape.props.sourceName || domain) && (
              <span className="rounded-md border border-[var(--shell-border)]/70 bg-[var(--shell-surface-2)]/65 px-1.5 py-0.5 text-[10px] shell-muted">
                {shape.props.sourceName || domain}
              </span>
            )}
          </div>
          {shape.props.imageUrl && isLikelyImageUrl(shape.props.imageUrl) ? (
            <div className="h-24 rounded-lg overflow-hidden border border-[var(--shell-border)]/55">
              <img src={shape.props.imageUrl} alt={shape.props.title || "Reference preview"} className="h-full w-full object-cover" />
            </div>
          ) : null}
          <p className="text-sm font-semibold text-[var(--shell-text)] line-clamp-2 leading-snug">
            {titleFallback(shape, "Reference")}
          </p>
          {shape.props.text ? <p className="text-xs shell-muted leading-relaxed line-clamp-3">{shape.props.text}</p> : null}
          {!shape.props.text && !shape.props.imageUrl ? (
            <p className="text-xs shell-muted leading-relaxed">Attach link or PDF context so this can act as a board reference material.</p>
          ) : null}
        </div>
      </HTMLContainer>
    );
  }
  indicator(shape: PumiReferenceShape) { return <rect width={shape.props.w} height={shape.props.h} />; }
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
  PumiMoodboardShapeUtil,
  PumiGifShapeUtil,
  PumiStickerShapeUtil,
  PumiReferenceShapeUtil,
] as const;


