import { BlueprintMascot } from "@/components/tutor/BeakerMascot";
import { Button } from "@/components/ui/button";
import { BlueprintBadge } from "@/components/tutor/BlueprintBadge";
import { LessonOut } from "@/lib/api/units";
import { CognitiveBlueprint } from "@/types/chemistry";
import { LessonSectionCard } from "./LessonSectionCard";
import {
  AlertTriangle,
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
}

export function LessonOverview({
  lesson,
  unitTitle,
  onStartPractice,
}: LessonOverviewProps) {
  const blueprint = lesson.blueprint as CognitiveBlueprint | undefined;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 lg:py-12">
      <div className="flex flex-col md:flex-row gap-10 lg:gap-14 items-start">

        {/* ── Left column ─────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Eyebrow row */}
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

          {lesson.objectives?.length > 0 && (
            <LessonSectionCard
              title="Learning Objectives"
              headerIcon={Target}
              headerIconColor="text-emerald-500"
              items={lesson.objectives}
              itemIcon={CheckCircle2}
              itemIconColor="text-emerald-500"
            />
          )}

          {lesson.key_rules?.length > 0 && (
            <LessonSectionCard
              title="Key Rules"
              headerIcon={AlertTriangle}
              headerIconColor="text-amber-500"
              items={lesson.key_rules}
              itemIcon={Lightbulb}
              itemIconColor="text-amber-500"
            />
          )}

          {lesson.key_equations?.length > 0 && (
            <LessonSectionCard
              title="Key Equations"
              headerIcon={FlaskConical}
              headerIconColor="text-blue-500"
              items={lesson.key_equations}
            />
          )}

          {lesson.misconceptions?.length > 0 && (
            <LessonSectionCard
              title="Common Misconceptions"
              headerIcon={XCircle}
              headerIconColor="text-rose-500"
              items={lesson.misconceptions}
              itemIcon={XCircle}
              itemIconColor="text-rose-500"
            />
          )}

          {/* Action button */}
          <div className="flex flex-wrap gap-3 pt-2">
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
