import { useState, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wand2, Clock, ChevronRight, ChevronLeft, Send, Save, RefreshCw, Pencil, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ChapterSelector } from "./ChapterSelector";
import { CourseLevel } from "@/data/units";
import { useUnits } from "@/hooks/useUnits";
import type { UnitListItem } from "@/lib/api/units";
import {
  generateExitTicket,
  publishClassroomLiveSession,
  type ExitTicketConfig,
} from "@/services/api/teacher";
import { mapApiMcqOptions } from "@/lib/exitTicketMap";
import { teacherQueryKeys } from "@/lib/teacherQueryKeys";
import { MathText } from "@/lib/mathDisplay";

interface ExitTicketConfigPanelProps {
  classId: string;
  courseLevel?: CourseLevel;
  /** Called after a successful publish (not draft). Drives timed monitoring UI + refetch. */
  onPublishSuccess?: (payload: {
    timedPractice: boolean;
    minutes: number;
    chapterId: string;
    exitTicketTimeLimitMinutes: number;
    exitTicketId: string;
  }) => void;
  defaultChapterId?: string;
}

interface GeneratedQuestion {
  question_order: number;
  format: "mcq" | "structured";
  question_text: string;
  correct_answer: string;
  unit?: string;
  equation_parts?: string[];
  mcq_options?: { label: string; value: string; misconception_tag?: string }[];
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

export function ExitTicketConfigPanel({ classId, courseLevel, onPublishSuccess, defaultChapterId }: ExitTicketConfigPanelProps) {
  const queryClient = useQueryClient();
  const { units } = useUnits();
  // Step state
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const topRef = useRef<HTMLDivElement>(null);

  const goToStep = useCallback((step: WizardStep) => {
    setCurrentStep(step);
    setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 0);
  }, []);

  // Step 1: Chapter & Lesson
  const [selectedChapterId, setSelectedChapterId] = useState(defaultChapterId || "");

  // Sync when defaultChapterId changes (e.g. class switch)
  useEffect(() => {
    if (defaultChapterId) {
      setSelectedChapterId(defaultChapterId);
      setSelectedLessonIndex(0);
    } else if (!selectedChapterId && units.length > 0) {
      setSelectedChapterId(units[0].id);
    }
  }, [defaultChapterId, units, selectedChapterId]);
  const [selectedLessonIndex, setSelectedLessonIndex] = useState(0);

  // Step 2: Timed Practice
  const [timedEnabled, setTimedEnabled] = useState(false);
  const [timedDuration, setTimedDuration] = useState(10);

  // Step 3: Exit Ticket Config
  const [questionCount, setQuestionCount] = useState(3);
  const [difficulty, setDifficulty] = useState("medium");
  const [timeLimit, setTimeLimit] = useState(10);
  const [format, setFormat] = useState("mixed");

  // Step 4: Preview
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [generating, setGenerating] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Step 5: Publish
  const [saving, setSaving] = useState(false);
  /** Last ticket returned from Generate (same id the backend stores). */
  const [activeTicket, setActiveTicket] = useState<ExitTicketConfig | null>(null);

  const selectedChapter = units.find((u) => u.id === selectedChapterId);
  const lessonName = selectedChapter?.lesson_titles[selectedLessonIndex] || "Lesson";

  const stepLabels = ["Chapter & Lesson", "Timed Practice", "Exit Ticket", "Preview", "Publish"];

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await generateExitTicket({
        classroom_id: classId,
        unit_id: selectedChapterId,
        lesson_index: selectedLessonIndex,
        difficulty,
        question_count: questionCount,
        question_format: format,
        time_limit_minutes: timeLimit,
      });
      const mapped: GeneratedQuestion[] = res.ticket.questions.map((q, i) => {
        const isMcq = q.question_type === "mcq" || (q.options?.length ?? 0) > 0;
        return {
          question_order: i + 1,
          format: (isMcq ? "mcq" : "structured") as "mcq" | "structured",
          question_text: q.prompt,
          correct_answer: q.correct_answer || "",
          mcq_options: isMcq ? mapApiMcqOptions(q) : undefined,
        };
      });
      setQuestions(mapped);
      setActiveTicket(res.ticket);
      goToStep(4);
      void queryClient.invalidateQueries({ queryKey: teacherQueryKeys.exitTickets.byClass(classId) });
      toast.success("Exit ticket generated and saved.");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to generate questions");
    } finally {
      setGenerating(false);
    }
  }, [
    selectedChapterId,
    selectedLessonIndex,
    difficulty,
    questionCount,
    format,
    timeLimit,
    classId,
    queryClient,
  ]);

  const handleDeleteQuestion = useCallback((index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index).map((q, i) => ({ ...q, question_order: i + 1 })));
    setEditingIndex(null);
    toast.info("Question removed");
  }, []);

  const handleEditField = useCallback((index: number, field: string, value: string) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const handleEditMcqOption = useCallback((qIndex: number, optIndex: number, field: string, value: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const opts = [...(updated[qIndex].mcq_options || [])];
      opts[optIndex] = { ...opts[optIndex], [field]: value };
      updated[qIndex] = { ...updated[qIndex], mcq_options: opts };
      return updated;
    });
  }, []);

  const handlePublish = useCallback(async (isDraft: boolean) => {
    if (questions.length === 0 || !activeTicket) {
      toast.error("Generate questions first, then publish.");
      return;
    }
    setSaving(true);
    try {
      if (!isDraft) {
        await publishClassroomLiveSession(classId, {
          exit_ticket_id: activeTicket.id,
          timed_practice_enabled: timedEnabled,
          timed_practice_minutes: timedEnabled ? timedDuration : null,
          unit_id: selectedChapterId,
          lesson_index: selectedLessonIndex,
        });
        void queryClient.invalidateQueries({ queryKey: teacherQueryKeys.classesRoot() });
        void queryClient.invalidateQueries({ queryKey: teacherQueryKeys.exitTickets.byClass(classId) });
        onPublishSuccess?.({
          timedPractice: timedEnabled,
          minutes: timedDuration,
          chapterId: selectedChapterId,
          exitTicketTimeLimitMinutes: timeLimit,
          exitTicketId: activeTicket.id,
        });
        toast.success(
          timedEnabled
            ? "Published. Timed practice is running — use Stop timed mode when the class is done."
            : "Published. Students will see the exit ticket on their next sync.",
        );
      } else {
        toast.success(
          "Draft noted locally. The ticket is already stored from Generate; publish when your class is ready.",
        );
      }
      goToStep(1);
      setQuestions([]);
      setActiveTicket(null);
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Publish failed. Deploy POST /teacher/classrooms/{id}/live-session/publish on the API.",
      );
    } finally {
      setSaving(false);
    }
  }, [
    questions.length,
    activeTicket,
    classId,
    timedEnabled,
    timedDuration,
    timeLimit,
    selectedChapterId,
    selectedLessonIndex,
    onPublishSuccess,
    queryClient,
  ]);

  return (
    <Card className="border-t-4 border-t-indigo-500 shadow-sm overflow-hidden">
      <CardHeader ref={topRef} className="scroll-mt-32 bg-gradient-to-br from-indigo-50/60 to-transparent pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
            <Wand2 className="w-4.5 h-4.5 text-indigo-600" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">
              Exit Ticket Configuration
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Step-by-step setup for your class assessment.
            </CardDescription>
          </div>
        </div>

        {/* Step indicators — progress stepper */}
        <div className="flex items-center mt-5">
          {stepLabels.map((label, i) => {
            const step = (i + 1) as WizardStep;
            const isActive = currentStep === step;
            const isCompleted = currentStep > step;
            const isLast = i === stepLabels.length - 1;
            return (
              <div key={label} className={cn("flex items-center", !isLast && "flex-1")}>
                <button
                  onClick={() => { if (isCompleted) goToStep(step); }}
                  disabled={!isCompleted}
                  className="flex flex-col items-center gap-1.5 group focus:outline-none"
                >
                  <span className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 shadow-sm",
                    isActive && "bg-indigo-600 text-white shadow-indigo-200 shadow-md ring-4 ring-indigo-100",
                    isCompleted && "bg-emerald-500 text-white group-hover:bg-emerald-600",
                    !isActive && !isCompleted && "bg-slate-200 text-slate-400"
                  )}>
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : step}
                  </span>
                  <span className={cn(
                    "text-[9px] font-semibold tracking-wide hidden sm:block whitespace-nowrap uppercase",
                    isActive && "text-indigo-700",
                    isCompleted && "text-emerald-600",
                    !isActive && !isCompleted && "text-slate-400"
                  )}>{label}</span>
                </button>
                {!isLast && (
                  <div className="flex-1 h-0.5 mx-2 rounded-full bg-slate-200 overflow-hidden">
                    <div className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isCompleted ? "bg-emerald-400 w-full" : "w-0"
                    )} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* ===== STEP 1: Chapter & Topic ===== */}
        {currentStep === 1 && (
          <Step1ChapterTopic
            selectedChapterId={selectedChapterId}
            setSelectedChapterId={(id) => { setSelectedChapterId(id); setSelectedLessonIndex(0); }}
            selectedLessonIndex={selectedLessonIndex}
            setSelectedLessonIndex={setSelectedLessonIndex}
            courseLevel={courseLevel}
            selectedChapter={selectedChapter}
            onNext={() => goToStep(2)}
          />
        )}

        {/* ===== STEP 2: Timed Practice Toggle ===== */}
        {currentStep === 2 && (
          <Step2TimedPractice
            timedEnabled={timedEnabled}
            setTimedEnabled={setTimedEnabled}
            timedDuration={timedDuration}
            setTimedDuration={setTimedDuration}
            onBack={() => goToStep(1)}
            onNext={() => goToStep(3)}
          />
        )}

        {/* ===== STEP 3: Exit Ticket Config ===== */}
        {currentStep === 3 && (
          <Step3Config
            questionCount={questionCount} setQuestionCount={setQuestionCount}
            difficulty={difficulty} setDifficulty={setDifficulty}
            timeLimit={timeLimit} setTimeLimit={setTimeLimit}
            format={format} setFormat={setFormat}
            generating={generating}
            onBack={() => goToStep(2)}
            onGenerate={handleGenerate}
          />
        )}

        {/* ===== STEP 4: Preview ===== */}
        {currentStep === 4 && (
          <Step4Preview
            questions={questions}
            selectedChapter={selectedChapter}
            lessonName={lessonName}
            difficulty={difficulty}
            timeLimit={timeLimit}
            editingIndex={editingIndex}
            setEditingIndex={setEditingIndex}
            onDeleteQuestion={handleDeleteQuestion}
            onEditField={handleEditField}
            onEditMcqOption={handleEditMcqOption}
            onRegenerateAll={() => { goToStep(3); }}
            onBack={() => goToStep(3)}
            onNext={() => goToStep(5)}
          />
        )}

        {/* ===== STEP 5: Publish ===== */}
        {currentStep === 5 && (
          <Step5Publish
            selectedChapter={selectedChapter}
            lessonName={lessonName}
            questionCount={questions.length}
            difficulty={difficulty}
            timeLimit={timeLimit}
            format={format}
            timedEnabled={timedEnabled}
            timedDuration={timedDuration}
            saving={saving}
            onBack={() => goToStep(4)}
            onPublish={handlePublish}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ===== Step Sub-Components =====

function Step1ChapterTopic({ selectedChapterId, setSelectedChapterId, selectedLessonIndex, setSelectedLessonIndex, courseLevel, selectedChapter, onNext }: {
  selectedChapterId: string; setSelectedChapterId: (id: string) => void;
  selectedLessonIndex: number; setSelectedLessonIndex: (i: number) => void;
  courseLevel?: CourseLevel; selectedChapter?: UnitListItem;
  onNext: () => void;
}) {
  const lessons = selectedChapter?.lesson_titles ?? [];
  const canProceed = selectedChapterId.length > 0 && lessons.length > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
        <ChapterSelector value={selectedChapterId} onValueChange={setSelectedChapterId} courseLevel={courseLevel} label="Chapter" />
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 h-5">
            Lesson
            <span className="text-destructive ml-0.5">*</span>
          </Label>
          <Select
            value={lessons.length > 0 ? String(selectedLessonIndex) : ""}
            onValueChange={v => setSelectedLessonIndex(Number(v))}
            disabled={lessons.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={lessons.length === 0 ? "Select a chapter first" : "Select lesson"} />
            </SelectTrigger>
            <SelectContent>
              {lessons.map((t, i) => (
                <SelectItem key={i} value={String(i)}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedChapterId && lessons.length === 0 && (
            <p className="text-[11px] text-destructive">This chapter has no lessons yet.</p>
          )}
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!canProceed} className="gap-1.5">
          Next <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function Step2TimedPractice({ timedEnabled, setTimedEnabled, timedDuration, setTimedDuration, onBack, onNext }: {
  timedEnabled: boolean; setTimedEnabled: (v: boolean) => void;
  timedDuration: number; setTimedDuration: (v: number) => void;
  onBack: () => void; onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className={cn(
        "flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
        timedEnabled
          ? "bg-indigo-50 border-indigo-200"
          : "bg-slate-50 border-slate-200"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
            timedEnabled ? "bg-indigo-100" : "bg-slate-200"
          )}>
            <Clock className={cn("w-4 h-4", timedEnabled ? "text-indigo-600" : "text-slate-400")} />
          </div>
          <div>
            <span className="text-sm font-medium text-foreground">Enable Timed Practice Mode</span>
            <p className="text-xs text-muted-foreground">Students practice under a timer before the exit ticket</p>
          </div>
        </div>
        <Switch checked={timedEnabled} onCheckedChange={setTimedEnabled} />
      </div>

      {timedEnabled ? (
        <div className="space-y-2 pl-1">
          <Label>Practice Duration</Label>
          <Select value={String(timedDuration)} onValueChange={v => setTimedDuration(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 minutes</SelectItem>
              <SelectItem value="10">10 minutes</SelectItem>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="20">20 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground p-3 bg-secondary/20 rounded-lg">
          Students will navigate levels freely with no forced timer.
        </p>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-1.5">
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        <Button onClick={onNext} className="gap-1.5">
          Next <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function Step3Config({ questionCount, setQuestionCount, difficulty, setDifficulty, timeLimit, setTimeLimit, format, setFormat, generating, onBack, onGenerate }: {
  questionCount: number; setQuestionCount: (v: number) => void;
  difficulty: string; setDifficulty: (v: string) => void;
  timeLimit: number; setTimeLimit: (v: number) => void;
  format: string; setFormat: (v: string) => void;
  generating: boolean; onBack: () => void; onGenerate: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Questions</Label>
          <Select value={String(questionCount)} onValueChange={v => setQuestionCount(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1,2,3,4,5,6,7,8,9,10].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Difficulty</Label>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Time Limit</Label>
          <Select value={String(timeLimit)} onValueChange={v => setTimeLimit(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 min</SelectItem>
              <SelectItem value="10">10 min</SelectItem>
              <SelectItem value="15">15 min</SelectItem>
              <SelectItem value="20">20 min</SelectItem>
              <SelectItem value="30">30 min</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Format</Label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mcq">MCQ only</SelectItem>
              <SelectItem value="structured">Two-step structured</SelectItem>
              <SelectItem value="mixed">Mixed (MCQ + structured)</SelectItem>
            </SelectContent>
          </Select>
          {format === "structured" && (
            <p className="text-[10px] text-muted-foreground">
              Step 1: Drag-and-drop rate law equation · Step 2: Final numeric answer with units
            </p>
          )}
        </div>
      </div>
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} className="gap-1.5">
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        <Button onClick={onGenerate} disabled={generating} className="gap-2">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          Generate Questions
        </Button>
      </div>
    </div>
  );
}

function Step4Preview({ questions, selectedChapter, lessonName, difficulty, timeLimit, editingIndex, setEditingIndex, onDeleteQuestion, onEditField, onEditMcqOption, onRegenerateAll, onBack, onNext }: {
  questions: GeneratedQuestion[];
  selectedChapter?: UnitListItem;
  lessonName: string; difficulty: string; timeLimit: number;
  editingIndex: number | null; setEditingIndex: (v: number | null) => void;
  onDeleteQuestion: (i: number) => void;
  onEditField: (i: number, field: string, value: string) => void;
  onEditMcqOption: (qi: number, oi: number, field: string, value: string) => void;
  onRegenerateAll: () => void;
  onBack: () => void; onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Preview header */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-secondary/30 rounded-lg">
        <Badge variant="outline">{selectedChapter?.icon} {selectedChapter?.title}</Badge>
        <Badge variant="secondary">{lessonName}</Badge>
        <Badge variant="outline">{questions.length} Q</Badge>
        <Badge variant="outline">{timeLimit} min</Badge>
        <Badge className={cn(
          difficulty === "hard" ? "bg-destructive/10 text-destructive" :
          difficulty === "easy" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
        )}>{difficulty}</Badge>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {questions.map((q, i) => (
          <div key={i} className="p-4 border border-border rounded-lg bg-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {q.format === "mcq" ? "MCQ" : "Structured"}
                </Badge>
                <span className="text-sm font-semibold text-foreground">Q{q.question_order}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingIndex(editingIndex === i ? null : i)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled
                  title="Single-question regeneration is not available yet. Use Regenerate All to return to step 3 and run Generate again."
                >
                  <RefreshCw className="w-3.5 h-3.5 opacity-50" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDeleteQuestion(i)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {editingIndex === i ? (
              <div className="space-y-2">
                <Input value={q.question_text} onChange={e => onEditField(i, "question_text", e.target.value)} placeholder="Question text" />
                <Input value={q.correct_answer} onChange={e => onEditField(i, "correct_answer", e.target.value)} placeholder="Correct answer" />
                {q.unit !== undefined && (
                  <Input value={q.unit || ""} onChange={e => onEditField(i, "unit", e.target.value)} placeholder="Unit" className="w-32" />
                )}
                {q.mcq_options && q.mcq_options.map((opt, j) => (
                  <div key={j} className="space-y-1.5 rounded-md border border-border/70 bg-muted/20 p-2">
                    <div className="flex flex-wrap gap-2">
                      <Input
                        value={opt.label}
                        onChange={(e) => onEditMcqOption(i, j, "label", e.target.value)}
                        placeholder="Label (A,B,…)"
                        className="w-14"
                      />
                      <Input
                        value={opt.value}
                        onChange={(e) => onEditMcqOption(i, j, "value", e.target.value)}
                        placeholder="Answer text"
                        className="min-w-0 flex-1"
                      />
                    </div>
                    {opt.value.trim() !== (q.correct_answer || "").trim() && (
                      <Input
                        value={opt.misconception_tag || ""}
                        onChange={(e) => onEditMcqOption(i, j, "misconception_tag", e.target.value)}
                        placeholder="Misconception tag (e.g. incorrect_mixing_order)"
                        className="font-mono text-xs"
                      />
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setEditingIndex(null)}>Done editing</Button>
              </div>
            ) : (
              <>
                <div className="text-sm text-foreground">
                  <MathText>{q.question_text}</MathText>
                </div>
                {q.mcq_options && (
                  <div className="ml-1 space-y-2">
                    {q.mcq_options.map((opt, j) => (
                      <div key={j} className={cn(
                        "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm",
                        opt.value === q.correct_answer
                          ? "border-emerald-500/30 bg-emerald-500/5 text-foreground"
                          : "border-border bg-secondary/40 text-foreground",
                      )}>
                        <span className="min-w-0 flex-1 leading-snug">
                          <span className="mr-1.5 font-semibold">{opt.label}.</span>
                          {opt.value}
                        </span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {opt.value === q.correct_answer && (
                            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-[10px] text-emerald-800 dark:text-emerald-200">
                              ✓ Correct
                            </Badge>
                          )}
                          {opt.misconception_tag && opt.value !== q.correct_answer && (
                            <Badge variant="destructive" className="max-w-[200px] truncate text-[10px]">
                              {opt.misconception_tag}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {q.format === "structured" && (
                  <div className="text-xs text-muted-foreground ml-4">
                    Answer: <span className="text-foreground font-medium">{q.correct_answer}</span> {q.unit && `(${q.unit})`}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap justify-between gap-2">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} className="gap-1.5">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          <Button variant="outline" onClick={onRegenerateAll} className="gap-1.5">
            <RefreshCw className="w-4 h-4" /> Regenerate All
          </Button>
        </div>
        <Button onClick={onNext} className="gap-1.5" disabled={questions.length === 0}>
          Continue to Publish <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function Step5Publish({ selectedChapter, lessonName, questionCount, difficulty, timeLimit, format, timedEnabled, timedDuration, saving, onBack, onPublish }: {
  selectedChapter?: UnitListItem;
  lessonName: string; questionCount: number; difficulty: string;
  timeLimit: number; format: string;
  timedEnabled: boolean; timedDuration: number;
  saving: boolean;
  onBack: () => void;
  onPublish: (isDraft: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-secondary/30 rounded-lg space-y-3">
        <h4 className="font-semibold text-foreground">Review & Publish</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">Chapter:</span> <span className="font-medium text-foreground">{selectedChapter?.icon} {selectedChapter?.title}</span></div>
          <div><span className="text-muted-foreground">Lesson:</span> <span className="font-medium text-foreground">{lessonName}</span></div>
          <div><span className="text-muted-foreground">Questions:</span> <span className="font-medium text-foreground">{questionCount}</span></div>
          <div><span className="text-muted-foreground">Difficulty:</span> <Badge variant="outline" className="ml-1">{difficulty}</Badge></div>
          <div><span className="text-muted-foreground">Time Limit:</span> <span className="font-medium text-foreground">{timeLimit} min</span></div>
          <div>
            <span className="text-muted-foreground">Format:</span>{" "}
            <span className="font-medium text-foreground">
              {format === "mcq" ? "MCQ only" : format === "mixed" ? "Mixed (MCQ + structured)" : format === "structured" ? "Two-step structured" : format}
            </span>
          </div>
        </div>
        {timedEnabled && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-md text-sm">
            <span className="font-medium text-primary">⏱ Timed Practice Enabled:</span>
            <span className="text-foreground ml-1">{timedDuration} minutes of practice before exit ticket</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="outline" onClick={onBack} className="gap-1.5">
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onPublish(true)} disabled={saving} className="gap-1.5">
            <Save className="w-4 h-4" /> Save as Draft
          </Button>
          <Button onClick={() => onPublish(false)} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Publish to Classroom
          </Button>
        </div>
      </div>
    </div>
  );
}
