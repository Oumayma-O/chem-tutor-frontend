import { MathText } from "@/lib/mathDisplay";

function RevealAnswerCallout({ revealAnswerText }: { revealAnswerText: string }) {
  return (
    <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-900 dark:text-emerald-100">
      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 leading-snug">
        <span className="font-medium text-emerald-900 dark:text-emerald-100 shrink-0">
          Stuck? The correct answer is:
        </span>
        <MathText
          className="!align-baseline text-emerald-950 dark:text-emerald-50 [&_.katex]:!align-baseline"
        >
          {revealAnswerText}
        </MathText>
      </div>
    </div>
  );
}

interface RevealHelpSectionProps {
  /** Step is done correctly — hide all reveal / limit copy */
  completed: boolean;
  revealLimitReached?: boolean;
  revealAnswerText?: string | null;
}

/**
 * Session cap message + optional answer reveal (3-strikes). Shared by all step UIs.
 */
export function RevealHelpSection({
  completed,
  revealLimitReached = false,
  revealAnswerText,
}: RevealHelpSectionProps) {
  if (completed) return null;
  const trimmed = revealAnswerText?.trim() ?? "";
  return (
    <>
      {revealLimitReached && (
        <p className="text-sm text-muted-foreground rounded-md border border-border bg-muted/40 px-3.5 py-2.5 leading-snug">
          You&apos;ve used all your help for this session. Try reviewing Level 1!
        </p>
      )}
      {trimmed.length > 0 && !revealLimitReached && (
        <RevealAnswerCallout revealAnswerText={trimmed} />
      )}
    </>
  );
}
