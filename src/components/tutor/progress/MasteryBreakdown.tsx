import { useState } from "react";
import { cn } from "@/lib/utils";
import { ClassifiedError } from "@/types/cognitive";
import { Brain, Calculator, FlaskConical, Layers, ChevronDown, ChevronRight, type LucideIcon } from "lucide-react";
import { getMasteryColor } from "@/lib/masteryTransforms";
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
  errors: ClassifiedError[];
  categoryScores?: {
    conceptual: number;
    procedural: number;
    computational: number;
  };
  level3Unlocked?: boolean;
}

type CategoryId = "conceptual" | "procedural" | "computational";

interface BreakdownCategory {
  id: CategoryId;
  label: string;
  shortLabel: string;
  tooltip: string;
  Icon: LucideIcon;
  errorExamples: string[];
}

const BREAKDOWN_CATEGORIES: BreakdownCategory[] = [
  {
    id: "conceptual",
    label: "Conceptual Understanding",
    shortLabel: "Conceptual",
    tooltip: "Measures whether the student selects the correct formula and understands the underlying chemistry principles.",
    Icon: Brain,
    errorExamples: ["Wrong formula selected", "Incorrect reaction order", "Wrong approach"],
  },
  {
    id: "procedural",
    label: "Problem Setup",
    shortLabel: "Procedural",
    tooltip: "Measures whether the student correctly identifies knowns vs. unknowns and sets up the problem properly.",
    Icon: Layers,
    errorExamples: ["Misidentified knowns", "Wrong variable isolated", "Incorrect substitution"],
  },
  {
    id: "computational",
    label: "Calculation & Units",
    shortLabel: "Computational",
    tooltip: "Measures arithmetic accuracy, significant figures, and correct unit conversions.",
    Icon: Calculator,
    errorExamples: ["Arithmetic error", "Missing units", "Wrong conversion"],
  },
];

const colorTransition = "transition-colors duration-500";

export function MasteryBreakdown({ score, errors, categoryScores, level3Unlocked }: MasteryBreakdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getCategoryScore = (category: BreakdownCategory): number => {
    if (!categoryScores) return 0;
    const raw = categoryScores[category.id];
    return typeof raw === "number" ? Math.round(raw * 100) : 0;
  };

  const getCategoryNotes = (categoryId: string, categoryScore: number): string[] => {
    const notes: string[] = [];
    const categoryErrors = errors.filter((e) => e.category === categoryId);
    categoryErrors.forEach((err) => {
      if (err.description) notes.push(err.description);
    });
    if (notes.length === 0 && categoryScore < 60) {
      if (categoryId === "conceptual") notes.push("Building understanding — continue practice");
      else if (categoryId === "procedural") notes.push("Variable identification improving with practice");
      else if (categoryId === "computational") notes.push("Calculation accuracy building");
    }
    return notes;
  };

  const level3BarPercent = Math.min(score, 100);
  const headlineColor = getMasteryColor(score);

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FlaskConical className={cn("w-4 h-4", headlineColor.text, colorTransition)} />
              Mastery Score
            </h4>
            <div className="flex items-center gap-2">
              <span className={cn("text-2xl font-bold tabular-nums", headlineColor.text, colorTransition)}>
                {score}%
              </span>
              {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span>Mastery progress</span>
              <span>{Math.round(score)}/100%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full ease-out transition-all duration-500", headlineColor.bg, colorTransition)}
                style={{ width: `${level3BarPercent}%` }}
              />
            </div>
            {level3Unlocked ? (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium text-left transition-colors duration-500">
                ✓ Level 3 unlocked!
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground mt-1 font-medium text-left">Complete all steps correctly in Level 2 to unlock Level 3.</p>
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-4 pt-3 border-t border-border">
            <TooltipProvider>
              <div className="space-y-2.5">
                {BREAKDOWN_CATEGORIES.map((category) => {
                  const categoryScore = getCategoryScore(category);
                  const colors = getMasteryColor(categoryScore);
                  const notes = getCategoryNotes(category.id, categoryScore);
                  const { Icon } = category;
                  return (
                    <Tooltip key={category.id}>
                      <TooltipTrigger asChild>
                        <div className="p-3 bg-secondary/40 rounded-lg cursor-help hover:bg-secondary/60 transition-colors">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <Icon className={cn("w-4 h-4 shrink-0", colors.text, colorTransition)} />
                              <span className="text-xs font-medium text-foreground">{category.shortLabel}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn("h-2 w-2 shrink-0 rounded-full", colors.bg, colorTransition)}
                                aria-hidden
                              />
                              <span className={cn("text-xs font-bold tabular-nums", colors.text, colorTransition)}>
                                {categoryScore}%
                              </span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full ease-out transition-all duration-500", colors.bg, colorTransition)}
                              style={{ width: `${categoryScore}%` }}
                            />
                          </div>
                          {notes.length > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-1.5 italic leading-tight">{notes[0]}</p>
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
            <p className="text-[10px] text-muted-foreground mt-3">Hover categories for detailed diagnostic info.</p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
