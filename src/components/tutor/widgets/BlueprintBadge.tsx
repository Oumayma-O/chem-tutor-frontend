import { CognitiveBlueprint } from "@/types/chemistry";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const BLUEPRINT_CONFIG: Record<
  CognitiveBlueprint,
  { label: string; icon: string; className: string; definition: string }
> = {
  solver: {
    label: "The Solver",
    icon: "🧮",
    className:
      "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 shadow-sm",
    definition:
      "Direct formula calculation. (Input variables -> Formula -> Result)",
  },
  recipe: {
    label: "The Recipe",
    icon: "🧪",
    className:
      "bg-green-100 text-green-800 border-green-200 hover:bg-green-200 shadow-sm",
    definition:
      "Multi-step algorithm. (Chain conversions to reach the final answer)",
  },
  architect: {
    label: "The Architect",
    icon: "🏗️",
    className:
      "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 shadow-sm",
    definition:
      "Symbolic construction. (Build a representation based on chemical rules)",
  },
  detective: {
    label: "The Detective",
    icon: "🔎",
    className:
      "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200 shadow-sm",
    definition:
      "Data interpretation. (Extract truth from data, graphs, or visual representations)",
  },
  lawyer: {
    label: "The Lawyer",
    icon: "⚖️",
    className:
      "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 hover:bg-fuchsia-200 shadow-sm",
    definition:
      "Conceptual justification. (Claim -> Evidence -> Reasoning)",
  },
};

interface BlueprintBadgeProps {
  blueprint: CognitiveBlueprint;
  className?: string;
}

export function BlueprintBadge({ blueprint, className }: BlueprintBadgeProps) {
  const config = BLUEPRINT_CONFIG[blueprint];
  if (!config) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="status"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-default",
              config.className,
              className,
            )}
          >
            <span aria-hidden>{config.icon}</span>
            <span>{config.label}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-center">
          <p className="font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {config.definition}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

