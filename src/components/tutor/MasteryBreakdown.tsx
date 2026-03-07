import { useState } from "react";
import { cn } from "@/lib/utils";
import { SkillMastery, ClassifiedError } from "@/types/cognitive";
import { Brain, Calculator, FlaskConical, Layers, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface MasteryBreakdownProps {
  score: number;
  skillMap: SkillMastery[];
  errors: ClassifiedError[];
  /** Optional backend category scores (0–1). When set, sub-category bars use these for dynamic progress. */
  categoryScores?: {
    conceptual: number;
    procedural: number;
    computational: number;
    representation?: number;
  };
  /** When true, show "Level 3 unlocked!" even if score < threshold (e.g. unlocked via Level 2 completion). */
  level3Unlocked?: boolean;
}

interface BreakdownCategory {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  tooltip: string;
  icon: React.ReactNode;
  skills: string[];
  errorExamples: string[];
}

const BREAKDOWN_CATEGORIES: BreakdownCategory[] = [
  {
    id: "conceptual",
    label: "Conceptual Understanding",
    shortLabel: "Conceptual",
    description: "Formula selection, reaction concepts",
    tooltip: "Measures whether the student selects the correct formula and understands the underlying chemistry principles.",
    icon: <Brain className="w-4 h-4" />,
    skills: ["reaction_concepts", "rate_laws"],
    errorExamples: ["Wrong formula selected", "Incorrect reaction order", "Wrong approach"],
  },
  {
    id: "procedural",
    label: "Problem Setup",
    shortLabel: "Setup",
    description: "Variable identification, substitution",
    tooltip: "Measures whether the student correctly identifies knowns vs. unknowns and sets up the problem properly.",
    icon: <Layers className="w-4 h-4" />,
    skills: ["variable_isolation"],
    errorExamples: ["Misidentified knowns", "Wrong variable isolated", "Incorrect substitution"],
  },
  {
    id: "computational",
    label: "Calculation & Units",
    shortLabel: "Calculation",
    description: "Arithmetic, unit handling",
    tooltip: "Measures arithmetic accuracy, significant figures, and correct unit conversions.",
    icon: <Calculator className="w-4 h-4" />,
    skills: ["unit_conversion"],
    errorExamples: ["Arithmetic error", "Missing units", "Wrong conversion"],
  },
];

// Scale: 0–20 Needs Support, 20–60 Developing, 60+ Strong (so ~17% per example is not treated as weak)
function getStatus(score: number) {
  if (score >= 75) return { label: "Strong", bgColor: "bg-success", textColor: "text-success" };
  if (score >= 20) return { label: "Developing", bgColor: "bg-warning", textColor: "text-warning" };
  return { label: "Needs Support", bgColor: "bg-destructive", textColor: "text-destructive" };
}

function getStatusEmoji(score: number): string {
  if (score >= 75) return "🟢";
  if (score >= 20) return "🟡";
  return "🔴";
}

function getTrendIcon(score: number, problemCount: number) {
  if (problemCount < 2) return <Minus className="w-3 h-3 text-muted-foreground" />;
  if (score >= 70) return <TrendingUp className="w-3 h-3 text-success" />;
  if (score <= 25) return <TrendingDown className="w-3 h-3 text-destructive" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

export function MasteryBreakdown({ score, skillMap, errors, categoryScores, level3Unlocked }: MasteryBreakdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getCategoryScore = (category: BreakdownCategory): number => {
    if (categoryScores) {
      const raw = categoryScores[category.id as keyof typeof categoryScores];
      if (typeof raw === "number") return Math.round(raw * 100);
    }
    const relevantSkills = skillMap.filter(s => category.skills.includes(s.skillId));
    if (relevantSkills.length === 0) return 0;
    const total = relevantSkills.reduce((acc, s) => acc + s.score, 0);
    return Math.round(total / relevantSkills.length);
  };

  const getCategoryProblemCount = (category: BreakdownCategory): number => {
    const relevantSkills = skillMap.filter(s => category.skills.includes(s.skillId));
    return relevantSkills.reduce((acc, s) => acc + s.problemCount, 0);
  };

  const getCategoryNotes = (categoryId: string): string[] => {
    const notes: string[] = [];
    const categoryErrors = errors.filter(e => e.category === categoryId);
    categoryErrors.forEach(err => {
      if (err.description) notes.push(err.description);
    });
    if (notes.length === 0) {
      if (categoryId === "conceptual") {
        const conceptSkills = skillMap.filter(s => ["reaction_concepts", "rate_laws"].includes(s.skillId));
        if (conceptSkills.some(s => s.status === "at_risk")) notes.push("May need review of formula selection and reaction concepts");
        else if (conceptSkills.some(s => s.status === "developing")) notes.push("Building understanding — continue practice");
      } else if (categoryId === "procedural") {
        const procSkills = skillMap.filter(s => s.skillId === "variable_isolation");
        if (procSkills.some(s => s.status === "at_risk")) notes.push("Often misidentifies knowns vs. unknowns");
        else if (procSkills.some(s => s.status === "developing")) notes.push("Variable identification improving with practice");
      } else if (categoryId === "computational") {
        const compSkills = skillMap.filter(s => s.skillId === "unit_conversion");
        if (compSkills.some(s => s.status === "at_risk")) notes.push("Check for arithmetic errors or wrong conversions");
        else if (compSkills.some(s => s.status === "developing")) notes.push("Calculation accuracy building");
      }
    }
    return notes;
  };

  // Level 3 unlocks when user completes all Level 2 steps correctly — no score threshold required.
  const level3BarPercent = Math.min(score, 100);

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      {/* Overall Score Header — always visible */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-primary" />
              Mastery Score
            </h4>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-2xl font-bold",
                score >= 75 ? "text-success" : score >= 20 ? "text-warning" : "text-destructive"
              )}>
                {score}%
              </span>
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Mastery progress bar — Level 3 unlocks on any correct Level 2 completion */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span>Mastery progress</span>
              <span>{Math.round(score)}/100%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  level3Unlocked ? "bg-success" : "bg-primary"
                )}
                style={{ width: `${level3BarPercent}%` }}
              />
            </div>
            {level3Unlocked ? (
              <p className="text-[10px] text-success mt-1 font-medium text-left">
                ✓ Level 3 unlocked!
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground mt-1 font-medium text-left">
                Complete all steps correctly in Level 2 to unlock Level 3.
              </p>
            )}
          </div>
        </CollapsibleTrigger>

        {/* Detailed Breakdown — hidden by default */}
        <CollapsibleContent>
          <div className="mt-4 pt-3 border-t border-border">
            <TooltipProvider>
              <div className="space-y-2.5">
                {BREAKDOWN_CATEGORIES.map((category) => {
                  const categoryScore = getCategoryScore(category);
                  const status = getStatus(categoryScore);
                  const notes = getCategoryNotes(category.id);
                  const problemCount = getCategoryProblemCount(category);

                  return (
                    <Tooltip key={category.id}>
                      <TooltipTrigger asChild>
                        <div className="p-3 bg-secondary/40 rounded-lg cursor-help hover:bg-secondary/60 transition-colors">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{category.icon}</span>
                              <span className="text-xs font-medium text-foreground">
                                {category.shortLabel}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {getTrendIcon(categoryScore, problemCount)}
                              <span className="text-sm">{getStatusEmoji(categoryScore)}</span>
                              <span className={cn("text-xs font-bold tabular-nums", status.textColor)}>
                                {categoryScore}%
                              </span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-500", status.bgColor)}
                              style={{ width: `${categoryScore}%` }}
                            />
                          </div>
                          {problemCount === 0 && category.id === "conceptual" && (
                            <p className="text-[10px] text-primary/70 mt-1.5 italic leading-tight">
                              ℹ️ Advance to Level 3 to assess this skill
                            </p>
                          )}
                          {problemCount > 0 && notes.length > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-1.5 italic leading-tight">
                              {notes[0]}
                            </p>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <p className="text-sm font-medium mb-1">{category.label}</p>
                        <p className="text-xs text-muted-foreground mb-2">{category.tooltip}</p>
                        <div className="border-t border-border pt-2">
                          <p className="text-[10px] font-medium mb-1">Common error indicators:</p>
                          <ul className="text-[10px] text-muted-foreground space-y-0.5">
                            {category.errorExamples.map((ex, i) => (
                              <li key={i}>• {ex}</li>
                            ))}
                          </ul>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
            <p className="text-[10px] text-muted-foreground mt-3">
              Hover categories for detailed diagnostic info.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
