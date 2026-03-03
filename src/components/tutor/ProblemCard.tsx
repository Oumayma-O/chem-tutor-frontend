import { Problem } from "@/types/chemistry";
import { formatMathContent } from "@/lib/mathDisplay";

interface ProblemCardProps {
  problem: Problem;
}

export function ProblemCard({ problem }: ProblemCardProps) {
  return (
    <div className="bg-problem-bg border-l-4 border-problem-border rounded-lg p-6 mb-6">
      <h3 className="text-lg font-bold text-foreground mb-3">Problem</h3>
      <p className="text-foreground/90 leading-relaxed">
        {formatMathContent(problem.description)}
      </p>
    </div>
  );
}
