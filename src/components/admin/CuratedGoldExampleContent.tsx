import { Badge } from "@/components/ui/badge";
import { HintMarkdown, MathText } from "@/lib/mathDisplay";
import type { CuratedProblem } from "@/services/api/admin";

function StepRow({ step, index }: { step: Record<string, unknown>; index: number }) {
  const label = String(
    (step.label as string) ?? (step.step_label as string) ?? `Step ${index + 1}`,
  );
  const instruction = typeof step.instruction === "string" ? step.instruction : "";
  const explanation = typeof step.explanation === "string" ? step.explanation : "";
  const correctRaw =
    typeof step.correctAnswer === "string"
      ? step.correctAnswer
      : typeof step.correct_answer === "string"
        ? step.correct_answer
        : "";
  const num =
    typeof step.step_number === "number" && Number.isFinite(step.step_number)
      ? step.step_number
      : index + 1;

  return (
    <li className="rounded-lg border border-border/70 bg-background/80 p-3 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
          {num}
        </span>
        <Badge variant="secondary" className="text-xs font-medium">
          {label}
        </Badge>
        {typeof step.type === "string" && (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{step.type}</span>
        )}
      </div>
      {instruction ? (
        <div className="text-sm leading-relaxed text-foreground [&_.math-content-katex]:text-sm">
          <HintMarkdown className="[&_p]:mb-2 [&_p:last-child]:mb-0">{instruction}</HintMarkdown>
        </div>
      ) : null}
      {explanation ? (
        <div className="mt-2 border-t border-border/50 pt-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">Why: </span>
          <HintMarkdown className="inline [&_p]:inline [&_p]:mb-0">{explanation}</HintMarkdown>
        </div>
      ) : null}
      {correctRaw ? (
        <div className="mt-2 flex flex-wrap items-baseline gap-1.5 rounded-md bg-muted/50 px-2 py-1.5 text-xs">
          <span className="shrink-0 font-medium text-muted-foreground">Expected</span>
          <span className="min-w-0 text-foreground">
            <MathText>{correctRaw}</MathText>
          </span>
        </div>
      ) : null}
    </li>
  );
}

interface CuratedGoldExampleContentProps {
  ex: CuratedProblem;
}

/**
 * Renders curated few-shot problem body (title, statement, steps) plus collapsible DB metadata.
 */
export function CuratedGoldExampleContent({ ex }: CuratedGoldExampleContentProps) {
  const steps = Array.isArray(ex.steps) ? ex.steps : [];
  const hasBody = Boolean(ex.title || ex.statement || steps.length > 0);

  const meta = {
    id: ex.id,
    unit_id: ex.unit_id,
    lesson_index: ex.lesson_index,
    difficulty: ex.difficulty,
    level: ex.level,
    strategy: ex.strategy,
    variant_index: ex.variant_index,
    is_active: ex.is_active,
    promoted: ex.promoted,
    created_at: ex.created_at,
    course_name: ex.course_name,
    chapter_name: ex.chapter_name,
  };

  return (
    <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
      {!hasBody && (
        <p className="text-sm text-muted-foreground">
          No title/statement/steps in stored example JSON for this row.
        </p>
      )}

      {ex.title ? (
        <h4 className="text-base font-semibold leading-snug text-foreground">{ex.title}</h4>
      ) : null}

      {ex.statement ? (
        <section>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Statement
          </p>
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-relaxed text-foreground">
            <HintMarkdown className="[&_p]:mb-3 [&_p:last-child]:mb-0">{ex.statement}</HintMarkdown>
          </div>
        </section>
      ) : null}

      {steps.length > 0 ? (
        <section>
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Steps ({steps.length})
          </p>
          <ol className="m-0 list-none space-y-3 p-0">
            {steps.map((step, i) => (
              <StepRow
                key={i}
                step={step as Record<string, unknown>}
                index={i}
              />
            ))}
          </ol>
        </section>
      ) : null}

      <details className="group rounded-lg border border-dashed border-border bg-muted/20">
        <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
          Raw metadata (IDs and flags)
        </summary>
        <pre className="max-h-56 overflow-auto border-t border-border/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
          {JSON.stringify(meta, null, 2)}
        </pre>
      </details>
    </div>
  );
}
