import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wand2, Clock, ChevronRight, ChevronLeft, Send, Save, RefreshCw, Pencil, Trash2 } from "lucide-react";
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

  // Step 1: Chapter & Topic
  const [selectedChapterId, setSelectedChapterId] = useState(defaultChapterId || "");

  // Sync when defaultChapterId changes (e.g. class switch)
  useEffect(() => {
    if (defaultChapterId) {
      setSelectedChapterId(defaultChapterId);
      setSelectedTopicIndex(0);
    } else if (!selectedChapterId && units.length > 0) {
      setSelectedChapterId(units[0].id);
    }
  }, [defaultChapterId, units, selectedChapterId]);
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(0);

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
  const topicName = selectedChapter?.lesson_titles[selectedTopicIndex] || "Reaction Kinetics";

  const stepLabels = ["Chapter & Topic", "Timed Practice", "Exit Ticket", "Preview", "Publish"];

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const topic = `${selectedChapter?.title ?? "Chemistry"} — ${topicName}`;
      const res = await generateExitTicket({
        topic,
        classroom_id: classId,
        unit_id: selectedChapterId,
        lesson_index: selectedTopicIndex,
        difficulty,
        question_count: Math.min(Math.max(questionCount, 3), 5),
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
      setCurrentStep(4);
      void queryClient.invalidateQueries({ queryKey: ["teacher", "exit-tickets", classId] });
      toast.success("Exit ticket generated and saved.");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to generate questions");
    } finally {
      setGenerating(false);
    }
  }, [
    topicName,
    selectedChapterId,
    selectedChapter?.title,
    selectedTopicIndex,
    difficulty,
    format,
    questionCount,
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
          lesson_index: selectedTopicIndex,
        });
        void queryClient.invalidateQueries({ queryKey: ["teacher", "classes"] });
        void queryClient.invalidateQueries({ queryKey: ["teacher", "exit-tickets", classId] });
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
      setCurrentStep(1);
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
    selectedChapterId,
    selectedTopicIndex,
    onPublishSuccess,
    queryClient,
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Exit Ticket Configuration
        </CardTitle>
        <CardDescription>Step-by-step setup for your class assessment.</CardDescription>
        {/* Step indicators */}
        <div className="flex items-center gap-1 mt-3">
          {stepLabels.map((label, i) => {
            const step = (i + 1) as WizardStep;
            const isActive = currentStep === step;
            const isCompleted = currentStep > step;
            return (
              <div key={label} className="flex items-center gap-1">
                <button
                  onClick={() => { if (isCompleted) setCurrentStep(step); }}
                  disabled={!isCompleted}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors",
                    isActive && "bg-primary text-primary-foreground",
                    isCompleted && "bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer",
                    !isActive && !isCompleted && "bg-secondary text-muted-foreground"
                  )}
                >
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] border border-current">
                    {isCompleted ? "✓" : step}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
                {i < stepLabels.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
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
            setSelectedChapterId={(id) => { setSelectedChapterId(id); setSelectedTopicIndex(0); }}
            selectedTopicIndex={selectedTopicIndex}
            setSelectedTopicIndex={setSelectedTopicIndex}
            courseLevel={courseLevel}
            selectedChapter={selectedChapter}
            onNext={() => setCurrentStep(2)}
          />
        )}

        {/* ===== STEP 2: Timed Practice Toggle ===== */}
        {currentStep === 2 && (
          <Step2TimedPractice
            timedEnabled={timedEnabled}
            setTimedEnabled={setTimedEnabled}
            timedDuration={timedDuration}
            setTimedDuration={setTimedDuration}
            onBack={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(3)}
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
            onBack={() => setCurrentStep(2)}
            onGenerate={handleGenerate}
          />
        )}

        {/* ===== STEP 4: Preview ===== */}
        {currentStep === 4 && (
          <Step4Preview
            questions={questions}
            selectedChapter={selectedChapter}
            topicName={topicName}
            difficulty={difficulty}
            timeLimit={timeLimit}
            editingIndex={editingIndex}
            setEditingIndex={setEditingIndex}
            onDeleteQuestion={handleDeleteQuestion}
            onEditField={handleEditField}
            onEditMcqOption={handleEditMcqOption}
            onRegenerateAll={() => { setCurrentStep(3); }}
            onBack={() => setCurrentStep(3)}
            onNext={() => setCurrentStep(5)}
          />
        )}

        {/* ===== STEP 5: Publish ===== */}
        {currentStep === 5 && (
          <Step5Publish
            selectedChapter={selectedChapter}
            topicName={topicName}
            questionCount={questions.length}
            difficulty={difficulty}
            timeLimit={timeLimit}
            format={format}
            timedEnabled={timedEnabled}
            timedDuration={timedDuration}
            saving={saving}
            onBack={() => setCurrentStep(4)}
            onPublish={handlePublish}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ===== Step Sub-Components =====

function Step1ChapterTopic({ selectedChapterId, setSelectedChapterId, selectedTopicIndex, setSelectedTopicIndex, courseLevel, selectedChapter, onNext }: {
  selectedChapterId: string; setSelectedChapterId: (id: string) => void;
  selectedTopicIndex: number; setSelectedTopicIndex: (i: number) => void;
  courseLevel?: CourseLevel; selectedChapter?: UnitListItem;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
        <ChapterSelector value={selectedChapterId} onValueChange={setSelectedChapterId} courseLevel={courseLevel} label="Chapter" />
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 h-5">Topic</Label>
          <Select value={String(selectedTopicIndex)} onValueChange={v => setSelectedTopicIndex(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(selectedChapter?.lesson_titles || []).map((t, i) => (
                <SelectItem key={i} value={String(i)}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={onNext} className="gap-1.5">
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
      <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
        <div>
          <span className="text-sm font-medium text-foreground">Enable Timed Practice Mode</span>
          <p className="text-xs text-muted-foreground">Students practice under a timer before the exit ticket</p>
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

function Step4Preview({ questions, selectedChapter, topicName, difficulty, timeLimit, editingIndex, setEditingIndex, onDeleteQuestion, onEditField, onEditMcqOption, onRegenerateAll, onBack, onNext }: {
  questions: GeneratedQuestion[];
  selectedChapter?: UnitListItem;
  topicName: string; difficulty: string; timeLimit: number;
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
        <Badge variant="secondary">{topicName}</Badge>
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

function Step5Publish({ selectedChapter, topicName, questionCount, difficulty, timeLimit, format, timedEnabled, timedDuration, saving, onBack, onPublish }: {
  selectedChapter?: UnitListItem;
  topicName: string; questionCount: number; difficulty: string;
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
          <div><span className="text-muted-foreground">Topic:</span> <span className="font-medium text-foreground">{topicName}</span></div>
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
