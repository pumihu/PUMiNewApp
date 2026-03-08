import { useTranslation } from "@/hooks/useTranslation";
import type { CanvasBlock } from "@/types/canvas";

interface QuizQuestion {
  id?: string;
  question?: string;
  options?: string[];
  correct_index?: number;
  explanation?: string;
}

interface Props {
  block: CanvasBlock;
  onUpdate: (updated: CanvasBlock) => void;
}

export function QuizBlock({ block }: Props) {
  const { lang } = useTranslation();
  const content = block.content_json as { questions?: QuizQuestion[] } | undefined;
  const questions = Array.isArray(content?.questions) ? content.questions : [];

  return (
    <div className="space-y-3">
      {questions.length === 0 ? (
        <p className="text-xs shell-muted italic">
          {lang === "hu" ? "A kvíz kérdései ide kerülnek." : "Quiz questions will appear here."}
        </p>
      ) : (
        questions.map((question, index) => {
          const options = Array.isArray(question.options) ? question.options : [];
          const answerIndex = typeof question.correct_index === "number" ? question.correct_index : -1;
          const answer = answerIndex >= 0 && answerIndex < options.length ? options[answerIndex] : null;

          return (
            <div key={question.id ?? `${index}`} className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-highlight)] px-3 py-2.5 space-y-2">
              <p className="text-xs font-medium text-[var(--shell-text)]">
                {index + 1}. {question.question || (lang === "hu" ? "Kérdés" : "Question")}
              </p>
              {options.length > 0 && (
                <ul className="space-y-1">
                  {options.map((option, optionIndex) => (
                    <li key={`${option}-${optionIndex}`} className="text-xs text-[var(--shell-text)]/85">
                      {String.fromCharCode(65 + optionIndex)}. {option}
                    </li>
                  ))}
                </ul>
              )}
              {answer && (
                <p className="text-[11px] shell-muted">
                  {lang === "hu" ? "Válasz:" : "Answer:"} {answer}
                </p>
              )}
              {question.explanation && (
                <p className="text-[11px] shell-muted leading-relaxed">{question.explanation}</p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
