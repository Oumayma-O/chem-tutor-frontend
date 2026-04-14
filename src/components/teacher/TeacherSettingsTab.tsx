import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import { Calculator, Eye } from "lucide-react";
import type { TeacherClassRow } from "@/hooks/useTeacherDashboardData";

interface TeacherSettingsTabProps {
  selectedClassId: string;
  selectedClass: TeacherClassRow | undefined;
  onToggleCalculator: (classId: string, enabled: boolean) => void;
  onToggleAnswerReveal: (classId: string, enabled: boolean) => void;
  onSetMaxReveals: (classId: string, value: number | null) => void;
}

/** Converts stored number | null to a display string. */
function toInputValue(max: number | null | undefined): string {
  if (max == null) return "";
  return String(max);
}

/** Parses input string → API value (empty / 0 → null = unlimited). */
function fromInputValue(v: string): number | null {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(n, 20);
}

function AnswerRevealCard({
  selectedClass,
  classLabel,
  onToggleAnswerReveal,
  onSetMaxReveals,
}: {
  selectedClass: TeacherClassRow;
  classLabel: string;
  onToggleAnswerReveal: (classId: string, enabled: boolean) => void;
  onSetMaxReveals: (classId: string, value: number | null) => void;
}) {
  const revealEnabled = selectedClass.allow_answer_reveal ?? true;
  const serverMax = selectedClass.max_answer_reveals_per_lesson ?? 3;
  const [draft, setDraft] = useState(toInputValue(serverMax));

  useEffect(() => {
    setDraft(toInputValue(serverMax));
  }, [serverMax, selectedClass.id]);

  const handleBlur = () => {
    const committed = fromInputValue(draft);
    if (committed !== serverMax) {
      onSetMaxReveals(selectedClass.id, committed);
    }
    setDraft(toInputValue(committed));
  };

  return (
    <>
      {/* Single control row — toggle + number input side by side */}
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-gray-100">
        <div>
          <span className="text-sm font-medium text-slate-800">Enable answer reveal</span>
          <p className="text-xs text-slate-400 mt-0.5">
            Applies to <span className="font-medium text-slate-600">{classLabel}</span>
            {revealEnabled && <span className="ml-1">· max per lesson (0 = unlimited)</span>}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {revealEnabled && (
            <Input
              type="number"
              min={0}
              max={20}
              value={draft}
              placeholder="∞"
              className="w-16 h-8 text-sm text-center bg-white tabular-nums border-gray-200"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            />
          )}
          <Switch
            checked={revealEnabled}
            onCheckedChange={(checked) => onToggleAnswerReveal(selectedClass.id, checked)}
          />
        </div>
      </div>
    </>
  );
}

export function TeacherSettingsTab({
  selectedClassId,
  selectedClass,
  onToggleCalculator,
  onToggleAnswerReveal,
  onSetMaxReveals,
}: TeacherSettingsTabProps) {
  const hasClass = selectedClassId !== "all" && selectedClass != null;
  const classLabel = selectedClass
    ? `${selectedClass.name} (${selectedClass.class_code})`
    : null;

  return (
    <TabsContent value="settings" className="space-y-0">
      {/* ── Calculator ── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col gap-1 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            Calculator
          </h3>
          <p className="text-sm text-slate-500">
            {hasClass && classLabel ? (
              <>Built-in calculator for <span className="font-medium text-slate-700">{classLabel}</span>.</>
            ) : (
              "Select a class in the dashboard header to configure."
            )}
          </p>
        </div>

        {hasClass && selectedClass ? (
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-gray-100">
            <span className="text-sm font-medium text-slate-800">Enable built-in calculator</span>
            <Switch
              checked={selectedClass.calculator_enabled}
              onCheckedChange={(checked) => onToggleCalculator(selectedClass.id, checked)}
            />
          </div>
        ) : (
          <p className="text-sm text-slate-400 p-4 bg-slate-50 rounded-lg border border-gray-100 text-center">
            No class selected.
          </p>
        )}
      </div>

      {/* ── Answer Reveal ── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col gap-1 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            Allow answer reveal
          </h3>
          <p className="text-sm text-slate-500">
            After 3 failed attempts, students can see the correct answer. Mastery will not increase for revealed steps.
          </p>
        </div>

        {hasClass && selectedClass && classLabel ? (
          <AnswerRevealCard
            selectedClass={selectedClass}
            classLabel={classLabel}
            onToggleAnswerReveal={onToggleAnswerReveal}
            onSetMaxReveals={onSetMaxReveals}
          />
        ) : (
          <p className="text-sm text-slate-400 p-4 bg-slate-50 rounded-lg border border-gray-100 text-center">
            No class selected.
          </p>
        )}
      </div>
    </TabsContent>
  );
}
