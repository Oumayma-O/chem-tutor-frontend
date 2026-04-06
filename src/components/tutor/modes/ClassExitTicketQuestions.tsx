import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UiExitTicketQuestion } from "@/lib/exitTicketMap";

export interface ClassExitTicketQuestionsProps {
  questions: UiExitTicketQuestion[];
  classAnswers: Record<string, string>;
  classResults: Record<string, boolean>;
  isComplete: boolean;
  onAnswer: (questionId: string, value: string) => void;
  onSubmitAll: () => void | Promise<void>;
}

/** Renders MCQ + structured items for a teacher-published class exit ticket. */
export function ClassExitTicketQuestions({
  questions,
  classAnswers,
  classResults,
  isComplete,
  onAnswer,
  onSubmitAll,
}: ClassExitTicketQuestionsProps) {
  return (
    <div className="space-y-6">
      {questions.map((q) => (
        <div key={q.id} className="space-y-3 rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {q.format.toUpperCase()}
              </Badge>
              <span className="font-semibold text-foreground">Q{q.question_order}</span>
            </div>
          </div>
          <p className="text-foreground">{q.question_text}</p>
          {q.format === "mcq" && q.mcq_options && (
            <RadioGroup
              value={classAnswers[q.id] || ""}
              onValueChange={(v) => onAnswer(q.id, v)}
              disabled={isComplete}
              className="space-y-2"
            >
              {q.mcq_options.map((opt, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 transition-all",
                    classAnswers[q.id] === opt.value ? "border-primary bg-primary/5" : "border-border",
                    isComplete &&
                      classResults[q.id] === false &&
                      classAnswers[q.id] === opt.value &&
                      "border-destructive bg-destructive/5",
                    isComplete && opt.value === q.correct_answer && "border-emerald-500 bg-emerald-500/5",
                  )}
                >
                  <RadioGroupItem value={opt.value} id={`${q.id}-${i}`} className="shrink-0" />
                  <Label htmlFor={`${q.id}-${i}`} className="flex flex-1 cursor-pointer items-center justify-between gap-3 text-sm">
                    <span>
                      <span className="mr-1.5 font-semibold">{opt.label}.</span>
                      {opt.value}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {isComplete && opt.value === q.correct_answer && (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/40 bg-emerald-500/10 text-[10px] text-emerald-800 dark:text-emerald-200"
                        >
                          ✓ Correct
                        </Badge>
                      )}
                      {isComplete &&
                        opt.value !== q.correct_answer &&
                        opt.misconception_tag &&
                        classAnswers[q.id] === opt.value && (
                          <Badge variant="destructive" className="max-w-[200px] truncate text-[10px]">
                            {opt.misconception_tag}
                          </Badge>
                        )}
                      {isComplete &&
                        opt.value !== q.correct_answer &&
                        !opt.misconception_tag &&
                        classAnswers[q.id] === opt.value && (
                          <Badge variant="destructive" className="text-[10px]">
                            Incorrect
                          </Badge>
                        )}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
          {q.format === "structured" && (
            <div className="space-y-4">
              {q.equation_parts && q.equation_parts.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Step 1: Arrange the rate law equation</Label>
                  <div className="flex min-h-[48px] flex-wrap gap-2 rounded-lg border border-dashed border-border p-3">
                    {[...q.equation_parts].sort(() => Math.random() - 0.5).map((part, i) => (
                      <Badge key={i} variant="secondary" className="cursor-grab px-3 py-1.5 font-mono text-sm">
                        {part}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Drag and arrange parts to form the correct equation</p>
                </div>
              )}
              <div>
                <Label className="mb-1 block text-xs font-semibold text-foreground">
                  {q.equation_parts && q.equation_parts.length > 0 ? "Step 2: " : ""}Final answer {q.unit && `(${q.unit})`}:
                </Label>
                <Input
                  value={classAnswers[q.id] || ""}
                  onChange={(e) => onAnswer(q.id, e.target.value)}
                  readOnly={isComplete}
                  disabled={isComplete}
                  placeholder={`Enter answer${q.unit ? ` in ${q.unit}` : ""}`}
                  className={cn(
                    isComplete && classResults[q.id] === true && "border-emerald-500",
                    isComplete && classResults[q.id] === false && "border-destructive",
                  )}
                />
              </div>
              {isComplete && classResults[q.id] === false && q.correct_answer && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
                  <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <p className="text-sm text-emerald-800 dark:text-emerald-200">
                    <span className="font-semibold">Correct answer: </span>
                    {q.correct_answer}{q.unit ? ` ${q.unit}` : ""}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      {!isComplete && (
        <Button onClick={() => void onSubmitAll()} size="lg" className="w-full gap-2">
          <CheckCircle className="h-5 w-5" />
          Submit All Answers
        </Button>
      )}
    </div>
  );
}
