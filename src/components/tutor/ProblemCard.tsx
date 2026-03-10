import { Problem } from "@/types/chemistry";
import { formatMathContent } from "@/lib/mathDisplay";
import { BlueprintBadge } from "./BlueprintBadge";

interface ProblemCardProps {
  problem: Problem;
}

export function ProblemCard({ problem }: ProblemCardProps) {
  return (
    <div className="bg-problem-bg border-l-4 border-problem-border rounded-lg p-6 mb-6">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h3 className="text-lg font-bold text-foreground">Problem</h3>
        {problem.blueprint && (
          <BlueprintBadge blueprint={problem.blueprint} />
        )}
      </div>
      <div className="space-y-2">
        {problem.description.split("\n\n").map((para, i) => (
          <p key={i} className="text-foreground/90 leading-relaxed">
            {formatMathContent(para)}
          </p>
        ))}
      </div>
    </div>
  );
}
