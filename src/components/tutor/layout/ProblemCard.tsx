import { Problem } from "@/types/chemistry";
import { formatMathContent } from "@/lib/mathDisplay";
import { preprocessStatementMath } from "@/lib/mathNormalize";
import { BlueprintBadge } from "@/components/tutor/widgets";

interface ProblemCardProps {
  problem: Problem;
}

export function ProblemCard({ problem }: ProblemCardProps) {
  // Sanitize the full statement BEFORE splitting on paragraph breaks.
  // The LLM sometimes wraps the entire multi-paragraph statement in a single $…$
  // block; splitting first would give each paragraph an unmatched $ that KaTeX
  // cannot render. preprocessStatementMath detects and fixes that pattern.
  const paragraphs = preprocessStatementMath(problem.description).split("\n\n");

  return (
    <div className="bg-problem-bg border-l-4 border-problem-border rounded-lg p-6 mb-6">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h3 className="text-lg font-bold text-foreground">Problem</h3>
        {problem.blueprint && (
          <BlueprintBadge blueprint={problem.blueprint} />
        )}
      </div>
      <div className="space-y-2">
        {paragraphs.map((para, i) => (
          <p key={i} className="text-foreground/90 leading-relaxed">
            {formatMathContent(para)}
          </p>
        ))}
      </div>
    </div>
  );
}

