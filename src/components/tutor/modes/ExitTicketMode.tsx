import { useState, useEffect, useCallback } from "react";
import { Problem, StudentAnswer } from "@/types/chemistry";
import { ExitTicketResult } from "@/types/cognitive";
import { ProblemCard } from "@/components/tutor/layout";
import { InteractiveStep } from "@/components/tutor/steps";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Timer, CheckCircle, XCircle, AlertTriangle, Trophy, Clock, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface ExitTicketQuestion {
  id: string;
  question_order: number;
  format: "qcm" | "structured";
  question_text: string;
  correct_answer: string;
  unit?: string;
  equation_parts?: string[];
  qcm_options?: { label: string; value: string; misconception_tag?: string }[];
}

interface ExitTicketModeProps {
  problem?: Problem;
  timeLimit?: number;
  onComplete: (result: ExitTicketResult) => void;
  onCancel: () => void;
  classId?: string;
  configId?: string;
}

export function ExitTicketMode({ problem, timeLimit: propTimeLimit, onComplete, onCancel, classId, configId }: ExitTicketModeProps) {
  const [timeLimit, setTimeLimit] = useState(propTimeLimit || 600);
  const [timeRemaining, setTimeRemaining] = useState(propTimeLimit || 600);
  const [isComplete, setIsComplete] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [classQuestions, setClassQuestions] = useState<ExitTicketQuestion[]>([]);
  const [classAnswers, setClassAnswers] = useState<Record<string, string>>({});
  const [classResults, setClassResults] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(!!configId);
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});
  const isClassMode = !!configId && classQuestions.length > 0;

  useEffect(() => {
    if (!configId) return;
    (async () => {
      setLoading(true);
      const { data: config } = await supabase
        .from("exit_ticket_configs" as any)
        .select("time_limit_minutes")
        .eq("id", configId)
        .single();
      if (config) {
        const limitSec = ((config as any).time_limit_minutes || 10) * 60;
        setTimeLimit(limitSec);
        setTimeRemaining(limitSec);
      }
      const { data: questions } = await supabase
        .from("exit_ticket_questions" as any)
        .select("*")
        .eq("config_id", configId)
        .order("question_order");
      if (questions) setClassQuestions(questions as any);
      setLoading(false);
    })();
  }, [configId]);

  useEffect(() => {
    if (isComplete || loading) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isComplete, loading]);

  const handleTimeUp = useCallback(() => {
    setIsComplete(true);
    setShowResults(true);
  }, []);

  const handleClassAnswer = (questionId: string, answer: string) => {
    setClassAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitClass = useCallback(async () => {
    const results: Record<string, boolean> = {};
    classQuestions.forEach((q) => {
      const studentAnswer = classAnswers[q.id]?.trim().toLowerCase() || "";
      results[q.id] = studentAnswer === q.correct_answer.toLowerCase();
    });
    setClassResults(results);
    setIsComplete(true);
    setShowResults(true);
    if (configId) {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (userId) {
        const responses = classQuestions.map((q) => ({
          config_id: configId,
          student_id: userId,
          question_id: q.id,
          selected_answer: classAnswers[q.id] || null,
          is_correct: results[q.id] || false,
          misconception_tag: !results[q.id] && q.qcm_options
            ? q.qcm_options.find((o) => o.value === classAnswers[q.id])?.misconception_tag || null
            : null,
          time_spent_seconds: timeLimit - timeRemaining,
        }));
        await supabase.from("exit_ticket_responses" as any).insert(responses);
      }
    }
    const correctCount = Object.values(results).filter(Boolean).length;
    const total = classQuestions.length;
    const score = total > 0 ? (correctCount / total) * 100 : 0;
    const timeUsed = timeLimit - timeRemaining;
    onComplete({
      problemId: configId || "class-exit-ticket",
      timestamp: Date.now(),
      completed: correctCount === total,
      hintsUsed: 0,
      finalScore: score,
      conceptualBreakdown: {},
      confidenceRating: Math.round(score * 0.8 + Math.max(0, 100 - (timeUsed / timeLimit) * 50) * 0.2),
      readyFlag: score >= 80,
      timeSpentSeconds: timeUsed,
    });
  }, [classQuestions, classAnswers, configId, timeLimit, timeRemaining, onComplete]);

  const steps = problem?.steps.map((step) => ({ ...step, type: "interactive" as const })) || [];

  const handleAnswerChange = (stepId: string, answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [stepId]: { step_id: stepId, answer, is_correct: undefined, attempts: prev[stepId]?.attempts || 0 },
    }));
  };

  const handleCheckAnswer = (stepId: string) => {
    const step = problem?.steps.find((s) => s.id === stepId);
    if (!step?.correct_answer) return;
    const currentAnswer = answers[stepId];
    const isCorrect = currentAnswer?.answer.trim().toLowerCase() === step.correct_answer.toLowerCase();
    setAnswers((prev) => ({
      ...prev,
      [stepId]: { ...prev[stepId], is_correct: isCorrect, attempts: (prev[stepId]?.attempts || 0) + 1 },
    }));
    const allAnswered = steps.every((s) => {
      const ans = stepId === s.id ? { ...answers[stepId], is_correct: isCorrect } : answers[s.id];
      return ans?.is_correct !== undefined;
    });
    if (allAnswered) {
      setIsComplete(true);
      setTimeout(() => setShowResults(true), 500);
    }
  };

  const calculateResult = useCallback((): ExitTicketResult => {
    const correctCount = Object.values(answers).filter((a) => a.is_correct === true).length;
    const totalSteps = steps.length;
    const finalScore = totalSteps > 0 ? (correctCount / totalSteps) * 100 : 0;
    const lastIdx = totalSteps - 1;
    const calcIdx = totalSteps >= 4 ? 2 : totalSteps === 3 ? 1 : 0;
    const conceptualBreakdown: Record<string, number> = {
      formula_selection: steps[0] && answers[steps[0].id]?.is_correct ? 100 : 0,
      multi_input: steps[1] && answers[steps[1].id]?.is_correct ? 100 : 0,
      calculation: steps[calcIdx] && answers[steps[calcIdx].id]?.is_correct ? 100 : 0,
      final_answer: steps[lastIdx] && answers[steps[lastIdx].id]?.is_correct ? 100 : 0,
    };
    const timeUsed = timeLimit - timeRemaining;
    const timeEfficiency = Math.max(0, 100 - (timeUsed / timeLimit) * 50);
    const confidenceRating = Math.round((finalScore * 0.7) + (timeEfficiency * 0.3));
    return {
      problemId: problem?.id || "unknown",
      timestamp: Date.now(),
      completed: correctCount === totalSteps,
      hintsUsed: 0,
      finalScore,
      conceptualBreakdown,
      confidenceRating,
      readyFlag: finalScore >= 80 && Object.values(answers).every((a) => (a.attempts || 0) <= 1),
      timeSpentSeconds: timeUsed,
    };
  }, [answers, steps, timeLimit, timeRemaining, problem?.id]);

  const handleSubmit = () => {
    if (isClassMode) handleSubmitClass();
    else onComplete(calculateResult());
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const timePercentage = (timeRemaining / timeLimit) * 100;
  const isLowTime = timeRemaining <= 30;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading exit ticket...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Timer className={cn("w-5 h-5", isLowTime ? "text-destructive animate-pulse" : "text-primary")} />
              <h2 className="font-bold text-lg text-foreground">Exit Ticket Assessment</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={timePercentage} className={cn("h-2", isLowTime && "[&>div]:bg-destructive")} />
            </div>
            <span className={cn("font-mono text-lg font-bold", isLowTime ? "text-destructive" : "text-foreground")}>
              {formatTime(timeRemaining)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {isClassMode
              ? "Complete all questions. This is a class assessment - no hints available."
              : "Complete this problem without hints. Your performance determines readiness."}
          </p>
        </div>

        {isClassMode ? (
          <div className="space-y-6">
            {classQuestions.map((q) => (
              <div key={q.id} className="bg-card border border-border rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-[10px]">{q.format.toUpperCase()}</Badge>
                  <span className="font-semibold text-foreground">Question {q.question_order}</span>
                </div>
                <p className="text-foreground mb-4">{q.question_text}</p>
                {q.format === "qcm" && q.qcm_options && (
                  <RadioGroup value={classAnswers[q.id] || ""} onValueChange={(v) => handleClassAnswer(q.id, v)} disabled={isComplete}>
                    {q.qcm_options.map((opt, i) => (
                      <div key={i} className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-all",
                        classAnswers[q.id] === opt.value ? "border-primary bg-primary/5" : "border-border",
                        isComplete && classResults[q.id] === false && classAnswers[q.id] === opt.value && "border-destructive bg-destructive/5",
                        isComplete && opt.value === q.correct_answer && "border-success bg-success/5",
                      )}>
                        <RadioGroupItem value={opt.value} id={`${q.id}-${i}`} />
                        <Label htmlFor={`${q.id}-${i}`} className="flex-1 cursor-pointer text-sm">{opt.label}</Label>
                        {isComplete && opt.value === q.correct_answer && <CheckCircle className="w-4 h-4 text-success" />}
                        {isComplete && classAnswers[q.id] === opt.value && opt.value !== q.correct_answer && <XCircle className="w-4 h-4 text-destructive" />}
                      </div>
                    ))}
                  </RadioGroup>
                )}
                {q.format === "structured" && (
                  <div className="space-y-4">
                    {q.equation_parts && q.equation_parts.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-foreground">Step 1: Arrange the rate law equation</Label>
                        <div className="flex flex-wrap gap-2 p-3 border border-dashed border-border rounded-lg min-h-[48px]">
                          {(() => {
                            const shuffled = [...q.equation_parts!].sort(() => Math.random() - 0.5);
                            return shuffled.map((part, i) => (
                              <Badge key={i} variant="secondary" className="text-sm py-1.5 px-3 cursor-grab font-mono">{part}</Badge>
                            ));
                          })()}
                        </div>
                        <p className="text-[10px] text-muted-foreground">Drag and arrange parts to form the correct equation</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs font-semibold text-foreground mb-1 block">
                        {q.equation_parts && q.equation_parts.length > 0 ? "Step 2: " : ""}Final answer {q.unit && `(${q.unit})`}:
                      </Label>
                      <Input
                        value={classAnswers[q.id] || ""}
                        onChange={(e) => handleClassAnswer(q.id, e.target.value)}
                        disabled={isComplete}
                        placeholder={`Enter answer${q.unit ? ` in ${q.unit}` : ""}`}
                        className={cn(
                          isComplete && classResults[q.id] === true && "border-success",
                          isComplete && classResults[q.id] === false && "border-destructive",
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
            {!isComplete && (
              <Button onClick={handleSubmit} size="lg" className="w-full gap-2">
                <CheckCircle className="w-5 h-5" />
                Submit All Answers
              </Button>
            )}
          </div>
        ) : (
          <>
            {problem && <ProblemCard problem={problem} />}
            <div className="space-y-4 mt-6">
              {steps.map((step) => (
                <InteractiveStep
                  key={step.id}
                  step={step}
                  answer={answers[step.id]}
                  onAnswerChange={handleAnswerChange}
                  onCheckAnswer={handleCheckAnswer}
                  showHint={false}
                  onRequestHint={() => {}}
                />
              ))}
            </div>
          </>
        )}

        {isComplete && showResults && (
          <div className="mt-6">
            <Dialog open={showResults} onOpenChange={setShowResults}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    Exit Ticket Results
                  </DialogTitle>
                  <DialogDescription>Your assessment performance summary</DialogDescription>
                </DialogHeader>
                {(() => {
                  let score: number;
                  let readyFlag: boolean;
                  let timeUsed: number;
                  if (isClassMode) {
                    const correct = Object.values(classResults).filter(Boolean).length;
                    score = classQuestions.length > 0 ? (correct / classQuestions.length) * 100 : 0;
                    readyFlag = score >= 80;
                    timeUsed = timeLimit - timeRemaining;
                  } else {
                    const r = calculateResult();
                    score = r.finalScore;
                    readyFlag = r.readyFlag;
                    timeUsed = r.timeSpentSeconds;
                  }
                  return (
                    <div className="space-y-4">
                      <div className="text-center py-4">
                        <div className={cn("text-5xl font-bold", score >= 80 ? "text-success" : score >= 60 ? "text-yellow-500" : "text-destructive")}>
                          {Math.round(score)}%
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Final Score</p>
                      </div>
                      <div className={cn("flex items-center justify-center gap-2 p-3 rounded-lg", readyFlag ? "bg-success/10 text-success" : "bg-yellow-500/10 text-yellow-600")}>
                        {readyFlag ? (
                          <><CheckCircle className="w-5 h-5" /><span className="font-semibold">Ready to Progress</span></>
                        ) : (
                          <><AlertTriangle className="w-5 h-5" /><span className="font-semibold">More Practice Recommended</span></>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-secondary/50 rounded-lg p-3 text-center">
                          <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                          <div className="font-semibold text-foreground">{timeUsed}s</div>
                          <div className="text-xs text-muted-foreground">Time Used</div>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-3 text-center">
                          <Brain className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                          <div className="font-semibold text-foreground">{Math.round(score)}%</div>
                          <div className="text-xs text-muted-foreground">Accuracy</div>
                        </div>
                      </div>
                      <Button onClick={handleSubmit} className="w-full">Continue</Button>
                    </div>
                  );
                })()}
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}

