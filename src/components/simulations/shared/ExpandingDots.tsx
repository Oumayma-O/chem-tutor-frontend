import { cn } from "@/lib/utils";

interface Props {
  /** Zero-based index of the active step within this range. */
  current: number;
  /** Total dots (steps) in the range. */
  total: number;
  onDotClick?: (index: number) => void;
  className?: string;
}

/**
 * Compact pagination: active step is a wide pill, others are small circles (iOS-like).
 */
export function ExpandingDots({ current, total, onDotClick, className }: Props) {
  if (total <= 0) return null;
  return (
    <div className={cn("flex items-center justify-center gap-1.5", className)} role="tablist" aria-label="Tutorial steps">
      {Array.from({ length: total }, (_, i) => {
        const active = i === current;
        return (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={active}
            aria-current={active ? "step" : undefined}
            onClick={() => onDotClick?.(i)}
            className={cn(
              "h-2 rounded-full transition-all duration-200 ease-out shrink-0",
              active
                ? "w-6 bg-primary"
                : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50",
            )}
          />
        );
      })}
    </div>
  );
}
