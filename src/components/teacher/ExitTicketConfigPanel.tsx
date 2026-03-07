import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { apiGenerateExitTicket, useBackendApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wand2, CheckCircle, Clock, ChevronRight, ChevronLeft, Send, Save, RefreshCw, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UnitSelector } from "./UnitSelector";
import { CourseLevel } from "@/data/units";
import { type UnitListItem } from "@/lib/api";
import { useUnits } from "@/hooks/useUnits";

interface ExitTicketConfigPanelProps {
  classId: string;
  courseLevel?: CourseLevel;
  onTimedModeLaunched?: () => void;
}

interface GeneratedQuestion {
  question_order: number;
  format: "qcm" | "structured";
  question_text: string;
  correct_answer: string;
  unit?: string;
  equation_parts?: string[];
  qcm_options?: { label: string; value: string; misconception_tag?: string }[];
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

export function ExitTicketConfigPanel({ classId, courseLevel, onTimedModeLaunched }: ExitTicketConfigPanelProps) {
  // Step state
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  // Step 1: Unit & Lesson
  const [selectedUnitId, setSelectedUnitId] = useState("kinetics");
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
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  // Step 5: Publish
  const [saving, setSaving] = useState(false);

  const { units } = useUnits();
  const selectedUnit = units.find(u => u.id === selectedUnitId);
  const lessonName = selectedUnit?.lesson_titles[selectedLessonIndex] || "Reaction Kinetics";

  const stepLabels = ["Unit & Lesson", "Timed Practice", "Exit Ticket", "Preview", "Publish"];

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      if (useBackendApi()) {
        const data = await apiGenerateExitTicket({
          topic_name: lessonName,
          unit_id: selectedUnitId,
          difficulty,
          format,
          question_count: questionCount,
        });
        setQuestions((data?.questions || []) as GeneratedQuestion[]);
        setCurrentStep(4);
        toast.success(`Generated ${data?.questions?.length || 0} questions`);
      } else {
        const { data, error } = await supabase.functions.invoke("generate-exit-ticket", {
          body: { lessonName, unitId: selectedUnitId, difficulty, format, questionCount },
        });
        if (error) throw error;
        if (data?.error) { toast.error(data.error); return; }
        setQuestions(data?.questions || []);
        setCurrentStep(4);
        toast.success(`Generated ${data?.questions?.length || 0} questions`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate questions");
    } finally {
      setGenerating(false);
    }
  }, [lessonName, selectedUnitId, difficulty, format, questionCount]);

  const handleRegenerateOne = useCallback(async (index: number) => {
    setRegeneratingIndex(index);
    try {
      if (useBackendApi()) {
        const data = await apiGenerateExitTicket({
          topic_name: lessonName,
          unit_id: selectedUnitId,
          difficulty,
          format: questions[index].format,
          question_count: 1,
        });
        if (data?.questions?.[0]) {
          const q = data.questions[0] as GeneratedQuestion;
          setQuestions(prev => {
            const updated = [...prev];
            updated[index] = { ...q, question_order: index + 1 };
            return updated;
          });
          toast.success("Question regenerated");
        }
      } else {
        const { data, error } = await supabase.functions.invoke("generate-exit-ticket", {
          body: { lessonName, unitId: selectedUnitId, difficulty, format: questions[index].format, questionCount: 1 },
        });
        if (error) throw error;
        if (data?.questions?.[0]) {
          setQuestions(prev => {
            const updated = [...prev];
            updated[index] = { ...data.questions[0], question_order: index + 1 };
            return updated;
          });
          toast.success("Question regenerated");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to regenerate question");
    } finally {
      setRegeneratingIndex(null);
    }
  }, [lessonName, selectedUnitId, difficulty, questions]);

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

  const handleEditQcmOption = useCallback((qIndex: number, optIndex: number, field: string, value: string) => {
    setQuestions(prev => {
      const updated = [...prev];
      const opts = [...(updated[qIndex].qcm_options || [])];
      opts[optIndex] = { ...opts[optIndex], [field]: value };
      updated[qIndex] = { ...updated[qIndex], qcm_options: opts };
      return updated;
    });
  }, []);

  const handlePublish = useCallback(async (isDraft: boolean) => {
    if (questions.length === 0) { toast.error("No questions to publish"); return; }
    setSaving(true);
    try {
      const { data: config, error: configErr } = await supabase
        .from("exit_ticket_configs")
        .insert({
          class_id: classId,
          unit_id: selectedUnitId,
          lesson_index: selectedLessonIndex,
          question_count: questions.length,
          difficulty,
          time_limit_minutes: timeLimit,
          format,
          is_active: !isDraft,
        })
        .select()
        .single();
      if (configErr) throw configErr;

      const questionsToInsert = questions.map(q => ({
        config_id: config.id,
        question_order: q.question_order,
        format: q.format,
        question_text: q.question_text,
        correct_answer: q.correct_answer,
        unit: q.unit || null,
        equation_parts: q.equation_parts || null,
        qcm_options: q.qcm_options || null,
      }));
      const { error: qErr } = await supabase
        .from("exit_ticket_questions")
        .insert(questionsToInsert);
      if (qErr) throw qErr;

      // If timed mode enabled AND publishing (not draft), launch timed mode
      if (!isDraft && timedEnabled) {
        const { error: timedErr } = await supabase
          .from("classes")
          .update({
            timed_mode_active: true,
            timed_practice_minutes: timedDuration,
            timed_started_at: new Date().toISOString(),
            active_unit_id: selectedUnitId,
          })
          .eq("id", classId);
        if (timedErr) throw timedErr;
        onTimedModeLaunched?.();
      }

      toast.success(isDraft ? "Exit ticket saved as draft" : "Exit ticket published to classroom!");
      // Reset wizard
      setCurrentStep(1);
      setQuestions([]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save exit ticket");
    } finally {
      setSaving(false);
    }
  }, [questions, classId, selectedUnitId, selectedLessonIndex, difficulty, timeLimit, format, timedEnabled, timedDuration, onTimedModeLaunched]);

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
        {/* ===== STEP 1: Unit & Lesson ===== */}
        {currentStep === 1 && (
          <Step1UnitLesson
            selectedUnitId={selectedUnitId}
            setSelectedUnitId={(id) => { setSelectedUnitId(id); setSelectedLessonIndex(0); }}
            selectedLessonIndex={selectedLessonIndex}
            setSelectedLessonIndex={setSelectedLessonIndex}
            courseLevel={courseLevel}
            selectedUnit={selectedUnit}
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
            selectedUnit={selectedUnit}
            lessonName={lessonName}
            difficulty={difficulty}
            timeLimit={timeLimit}
            editingIndex={editingIndex}
            setEditingIndex={setEditingIndex}
            regeneratingIndex={regeneratingIndex}
            onRegenerateOne={handleRegenerateOne}
            onDeleteQuestion={handleDeleteQuestion}
            onEditField={handleEditField}
            onEditQcmOption={handleEditQcmOption}
            onRegenerateAll={() => { setCurrentStep(3); }}
            onBack={() => setCurrentStep(3)}
            onNext={() => setCurrentStep(5)}
          />
        )}

        {/* ===== STEP 5: Publish ===== */}
        {currentStep === 5 && (
          <Step5Publish
            selectedUnit={selectedUnit}
            lessonName={lessonName}
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

function Step1UnitLesson({ selectedUnitId, setSelectedUnitId, selectedLessonIndex, setSelectedLessonIndex, courseLevel, selectedUnit, onNext }: {
  selectedUnitId: string; setSelectedUnitId: (id: string) => void;
  selectedLessonIndex: number; setSelectedLessonIndex: (i: number) => void;
  courseLevel?: CourseLevel; selectedUnit?: UnitListItem;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UnitSelector value={selectedUnitId} onValueChange={setSelectedUnitId} courseLevel={courseLevel} label="Unit" />
        <div className="space-y-2">
          <Label>Lesson</Label>
          <Select value={String(selectedLessonIndex)} onValueChange={v => setSelectedLessonIndex(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(selectedUnit?.lesson_titles || []).map((t, i) => (
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
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
              <SelectItem value="qcm">QCM Only</SelectItem>
              <SelectItem value="structured">Two-Step Structured</SelectItem>
              <SelectItem value="mixed">Mixed (QCM + Structured)</SelectItem>
            </SelectContent>
          </Select>
          {format === "structured" && (
            <p className="text-[10px] text-muted-foreground">
              Step 1: Drag-and-drop rate law equation · Step 2: Final numeric answer with units
            </p>
          )}
        </div>
      </div>
      <div className="flex justify-between">
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

function Step4Preview({ questions, selectedUnit, lessonName, difficulty, timeLimit, editingIndex, setEditingIndex, regeneratingIndex, onRegenerateOne, onDeleteQuestion, onEditField, onEditQcmOption, onRegenerateAll, onBack, onNext }: {
  questions: GeneratedQuestion[];
  selectedUnit?: UnitListItem;
  lessonName: string; difficulty: string; timeLimit: number;
  editingIndex: number | null; setEditingIndex: (v: number | null) => void;
  regeneratingIndex: number | null;
  onRegenerateOne: (i: number) => void;
  onDeleteQuestion: (i: number) => void;
  onEditField: (i: number, field: string, value: string) => void;
  onEditQcmOption: (qi: number, oi: number, field: string, value: string) => void;
  onRegenerateAll: () => void;
  onBack: () => void; onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Preview header */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-secondary/30 rounded-lg">
        <Badge variant="outline">{selectedUnit?.icon} {selectedUnit?.title}</Badge>
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
                <Badge variant="outline" className="text-[10px]">{q.format.toUpperCase()}</Badge>
                <span className="text-sm font-semibold text-foreground">Q{q.question_order}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingIndex(editingIndex === i ? null : i)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRegenerateOne(i)} disabled={regeneratingIndex === i}>
                  {regeneratingIndex === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
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
                {q.qcm_options && q.qcm_options.map((opt, j) => (
                  <div key={j} className="flex gap-2">
                    <Input value={opt.label} onChange={e => onEditQcmOption(i, j, "label", e.target.value)} placeholder="Option label" className="flex-1" />
                    <Input value={opt.value} onChange={e => onEditQcmOption(i, j, "value", e.target.value)} placeholder="Value" className="w-24" />
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setEditingIndex(null)}>Done editing</Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-foreground">{q.question_text}</p>
                {q.qcm_options && (
                  <div className="space-y-1 ml-4">
                    {q.qcm_options.map((opt, j) => (
                      <div key={j} className={cn(
                        "text-xs px-2 py-1.5 rounded",
                        opt.value === q.correct_answer ? "bg-success/10 text-success border border-success/20" : "bg-secondary/50 text-muted-foreground"
                      )}>
                        {opt.label}
                        {opt.misconception_tag && opt.value !== q.correct_answer && (
                          <span className="ml-2 text-[10px] text-destructive">({opt.misconception_tag})</span>
                        )}
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

function Step5Publish({ selectedUnit, lessonName, questionCount, difficulty, timeLimit, format, timedEnabled, timedDuration, saving, onBack, onPublish }: {
  selectedUnit?: UnitListItem;
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
          <div><span className="text-muted-foreground">Unit:</span> <span className="font-medium text-foreground">{selectedUnit?.icon} {selectedUnit?.title}</span></div>
          <div><span className="text-muted-foreground">Lesson:</span> <span className="font-medium text-foreground">{lessonName}</span></div>
          <div><span className="text-muted-foreground">Questions:</span> <span className="font-medium text-foreground">{questionCount}</span></div>
          <div><span className="text-muted-foreground">Difficulty:</span> <Badge variant="outline" className="ml-1">{difficulty}</Badge></div>
          <div><span className="text-muted-foreground">Time Limit:</span> <span className="font-medium text-foreground">{timeLimit} min</span></div>
          <div><span className="text-muted-foreground">Format:</span> <span className="font-medium text-foreground capitalize">{format}</span></div>
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
