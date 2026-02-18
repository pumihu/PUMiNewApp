import { useState } from "react";
import { Lightbulb, CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import type { SmartLessonContent } from "@/types/focusItem";

interface SmartLessonRendererProps {
  content: SmartLessonContent;
  onValidationChange: (state: { itemsCompleted: number }) => void;
}

type Phase = "hook" | "task1" | "task2" | "insight";

export function SmartLessonRenderer({ content, onValidationChange }: SmartLessonRendererProps) {
  const [phase, setPhase] = useState<Phase>("hook");
  const [task1Answer, setTask1Answer] = useState<number | null>(null);
  const [task2Answer, setTask2Answer] = useState<number | null>(null);
  const [showExplanation1, setShowExplanation1] = useState(false);
  const [showExplanation2, setShowExplanation2] = useState(false);

  const handleNext = (nextPhase: Phase) => {
    setPhase(nextPhase);
    if (nextPhase === "insight") {
      onValidationChange({ itemsCompleted: 1 });
    }
  };

  const handleTask1Select = (idx: number) => {
    if (task1Answer !== null) return;
    setTask1Answer(idx);
    setShowExplanation1(true);
  };

  const handleTask2Select = (idx: number) => {
    if (task2Answer !== null) return;
    setTask2Answer(idx);
    setShowExplanation2(true);
  };

  return (
    <div className="space-y-4">
      {/* Hook */}
      {phase === "hook" && (
        <div className="rounded-lg border border-yellow-500/30 overflow-hidden animate-fade-in">
          <div className="flex items-center gap-2 p-3 bg-yellow-500/10">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium">Gondolkodj!</span>
          </div>
          <div className="p-4">
            <p className="text-base leading-relaxed">{content.hook}</p>
          </div>
          <div className="p-3 border-t border-yellow-500/20">
            <button
              onClick={() => handleNext("task1")}
              className="w-full py-2 px-4 bg-foreground text-background rounded-lg font-medium hover:bg-foreground/90 flex items-center justify-center gap-2"
            >
              Tovább <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Micro Task 1 */}
      {phase === "task1" && (
        <div className="rounded-lg border border-blue-500/30 overflow-hidden animate-fade-in">
          <div className="flex items-center gap-2 p-3 bg-blue-500/10">
            <span className="text-sm font-bold text-blue-400">1</span>
            <span className="text-sm font-medium">Mini feladat</span>
          </div>
          <div className="p-4">
            <p className="text-sm font-medium mb-3">{content.micro_task_1.instruction}</p>
            {content.micro_task_1.options && (
              <div className="space-y-2">
                {content.micro_task_1.options.map((opt, idx) => {
                  const isSelected = task1Answer === idx;
                  const isCorrect = idx === content.micro_task_1.correct_index;
                  const showResult = task1Answer !== null;

                  let borderClass = "border-foreground/10 hover:border-foreground/30";
                  if (showResult && isCorrect) borderClass = "border-green-500 bg-green-500/10";
                  else if (showResult && isSelected && !isCorrect) borderClass = "border-red-500 bg-red-500/10";

                  return (
                    <button
                      key={idx}
                      onClick={() => handleTask1Select(idx)}
                      disabled={task1Answer !== null}
                      className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${borderClass} ${task1Answer !== null ? "cursor-default" : ""}`}
                    >
                      {showResult && isCorrect && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                      {showResult && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                      {!showResult && <span className="w-4 h-4 rounded-full border border-foreground/30 shrink-0" />}
                      <span className="text-sm">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {showExplanation1 && content.micro_task_1.explanation && (
              <div className="mt-3 p-3 rounded-lg bg-foreground/5 text-sm text-foreground/70">
                {content.micro_task_1.explanation}
              </div>
            )}
          </div>
          {task1Answer !== null && (
            <div className="p-3 border-t border-blue-500/20">
              <button
                onClick={() => handleNext("task2")}
                className="w-full py-2 px-4 bg-foreground text-background rounded-lg font-medium hover:bg-foreground/90 flex items-center justify-center gap-2"
              >
                Tovább <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Micro Task 2 */}
      {phase === "task2" && (
        <div className="rounded-lg border border-purple-500/30 overflow-hidden animate-fade-in">
          <div className="flex items-center gap-2 p-3 bg-purple-500/10">
            <span className="text-sm font-bold text-purple-400">2</span>
            <span className="text-sm font-medium">Mini feladat</span>
          </div>
          <div className="p-4">
            <p className="text-sm font-medium mb-3">{content.micro_task_2.instruction}</p>
            {content.micro_task_2.options && (
              <div className="space-y-2">
                {content.micro_task_2.options.map((opt, idx) => {
                  const isSelected = task2Answer === idx;
                  const isCorrect = idx === content.micro_task_2.correct_index;
                  const showResult = task2Answer !== null;

                  let borderClass = "border-foreground/10 hover:border-foreground/30";
                  if (showResult && isCorrect) borderClass = "border-green-500 bg-green-500/10";
                  else if (showResult && isSelected && !isCorrect) borderClass = "border-red-500 bg-red-500/10";

                  return (
                    <button
                      key={idx}
                      onClick={() => handleTask2Select(idx)}
                      disabled={task2Answer !== null}
                      className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${borderClass} ${task2Answer !== null ? "cursor-default" : ""}`}
                    >
                      {showResult && isCorrect && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                      {showResult && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                      {!showResult && <span className="w-4 h-4 rounded-full border border-foreground/30 shrink-0" />}
                      <span className="text-sm">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {showExplanation2 && content.micro_task_2.explanation && (
              <div className="mt-3 p-3 rounded-lg bg-foreground/5 text-sm text-foreground/70">
                {content.micro_task_2.explanation}
              </div>
            )}
          </div>
          {task2Answer !== null && (
            <div className="p-3 border-t border-purple-500/20">
              <button
                onClick={() => handleNext("insight")}
                className="w-full py-2 px-4 bg-foreground text-background rounded-lg font-medium hover:bg-foreground/90 flex items-center justify-center gap-2"
              >
                Tovább <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Insight */}
      {phase === "insight" && (
        <div className="rounded-lg border border-emerald-500/30 overflow-hidden animate-fade-in">
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10">
            <Lightbulb className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium">Takeaway</span>
          </div>
          <div className="p-4">
            <p className="text-base font-medium leading-relaxed">{content.insight}</p>
          </div>
          <div className="p-3 border-t border-emerald-500/20 flex items-center gap-2 text-emerald-400 justify-center">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Kész!</span>
          </div>
        </div>
      )}

      {/* Progress dots */}
      <div className="flex justify-center gap-2 pt-2">
        {(["hook", "task1", "task2", "insight"] as Phase[]).map((p) => (
          <div
            key={p}
            className={`w-2 h-2 rounded-full transition-all ${
              p === phase ? "bg-foreground scale-125" :
              (["hook", "task1", "task2", "insight"].indexOf(p) < ["hook", "task1", "task2", "insight"].indexOf(phase))
                ? "bg-foreground/50" : "bg-foreground/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
