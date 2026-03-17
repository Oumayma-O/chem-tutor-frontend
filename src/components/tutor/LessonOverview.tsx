import { BlueprintMascot } from "@/components/tutor/BeakerMascot";
import { Button } from "@/components/ui/button";
import { BlueprintBadge } from "@/components/tutor/BlueprintBadge";
import { MathText } from "@/lib/mathDisplay";
import { LessonOut } from "@/lib/api/units";
import { CognitiveBlueprint } from "@/types/chemistry";
import {
  AlertTriangle,
  Beaker,
  CheckCircle2,
  FlaskConical,
  Lightbulb,
  Target,
  XCircle,
  Zap,
} from "lucide-react";

interface LessonOverviewProps {
  lesson: LessonOut;
  unitTitle: string;
  onStartPractice: () => void;
  onOpenSimulation?: () => void;
}

export function LessonOverview({
  lesson,
  unitTitle,
  onStartPractice,
  onOpenSimulation,
}: LessonOverviewProps) {
  const blueprint = lesson.blueprint as CognitiveBlueprint | undefined;

  const hasObjectives     = lesson.objectives?.length > 0;
  const hasEquations      = lesson.key_equations?.length > 0;
  const hasRules          = lesson.key_rules?.length > 0;
  const hasMisconceptions = lesson.misconceptions?.length > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 lg:py-12">
      <div className="flex flex-col md:flex-row gap-10 lg:gap-14 items-start">

        {/* ── Left column ─────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Eyebrow row: breadcrumb + blueprint badge side by side */}
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              {unitTitle} · Lesson {lesson.lesson_index + 1}
            </p>
            {blueprint && (
              <>
                <span className="text-muted-foreground/40 text-sm">—</span>
                <BlueprintBadge blueprint={blueprint} className="text-sm px-3 py-1" />
              </>
            )}
          </div>

          {/* Title + description */}
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold text-foreground tracking-tight leading-tight">
              {lesson.title}
            </h1>
            {lesson.description && (
              <p className="text-muted-foreground text-base leading-relaxed">
                {lesson.description}
              </p>
            )}
          </div>

          {/* Learning Objectives card */}
          {hasObjectives && (
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
                <Target className="w-5 h-5 text-emerald-500 shrink-0" />
                <h2 className="text-base font-bold text-slate-900 dark:text-foreground">Learning Objectives</h2>
              </div>
              <div className="px-4 pb-5 space-y-2.5">
                {lesson.objectives.map((obj, i) => (
                  <div key={i} className="flex items-start gap-3 border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted/40 rounded-xl p-3">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
                    <span className="text-sm text-slate-700 dark:text-foreground leading-snug">{obj}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Rules card */}
          {hasRules && (
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                <h2 className="text-base font-bold text-slate-900 dark:text-foreground">Key Rules</h2>
              </div>
              <div className="px-4 pb-5 space-y-2.5">
                {lesson.key_rules.map((rule, i) => (
                  <div key={i} className="flex items-start gap-3 border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted/40 rounded-xl p-3">
                    <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                    <span className="text-sm text-slate-700 dark:text-foreground leading-snug">{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Equations card */}
          {hasEquations && (
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
                <FlaskConical className="w-5 h-5 text-blue-500 shrink-0" />
                <h2 className="text-base font-bold text-slate-900 dark:text-foreground">Key Equations</h2>
              </div>
              <div className="px-4 pb-5 space-y-2.5">
                {lesson.key_equations.map((eq, i) => (
                  <div key={i} className="border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted/40 rounded-xl p-3 font-mono text-sm text-slate-800 dark:text-foreground">
                    <MathText>{eq}</MathText>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Common Misconceptions card */}
          {hasMisconceptions && (
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
                <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                <h2 className="text-base font-bold text-slate-900 dark:text-foreground">Common Misconceptions</h2>
              </div>
              <div className="px-4 pb-5 space-y-2.5">
                {lesson.misconceptions.map((m, i) => (
                  <div key={i} className="flex items-start gap-3 border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted/40 rounded-xl p-3">
                    <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" />
                    <span className="text-sm text-slate-700 dark:text-foreground leading-snug">{m}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            {lesson.has_simulation && onOpenSimulation && (
              <Button
                variant="outline"
                size="lg"
                onClick={onOpenSimulation}
                className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
              >
                <Beaker className="w-5 h-5" />
                Open Simulation Lab
              </Button>
            )}
            <Button size="lg" onClick={onStartPractice} className="gap-2">
              <Zap className="w-5 h-5" />
              Start Practice
            </Button>
          </div>
        </div>

        {/* ── Right column — blueprint mascot ─────────────── */}
        <div className="hidden md:flex shrink-0 items-start justify-center pt-2 sticky top-20">
          <BlueprintMascot
            blueprint={blueprint ?? "solver"}
            className="w-40 lg:w-52 h-auto"
          />
        </div>
      </div>
    </div>
  );
}
