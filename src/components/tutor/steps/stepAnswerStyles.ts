import { cn } from "@/lib/utils";

/**
 * Unified typography for step answer areas. KaTeX inherits this font size from the
 * wrapper - keep this identical on every answer box so math matches body text.
 */
export const STEP_ANSWER_TEXT =
  "font-sans text-base md:text-lg font-normal text-slate-800 dark:text-foreground";

/** Inputs / textarea: standardized across all interactive step types. */
export const STEP_ANSWER_FIELD_TEXT =
  "font-sans text-sm font-normal text-slate-800 dark:text-foreground placeholder:text-sm placeholder:font-sans placeholder:text-gray-400 bg-white border border-gray-300 rounded-md px-3 py-2 focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 outline-none transition-all";

/** Base white card metrics - reuse for variants (e.g. dashed drag zone). */
export const STEP_ANSWER_SHELL =
  "bg-card rounded-md border border-border p-3 md:p-4 w-full min-h-[3rem] md:min-h-[3.5rem]";

/** Drag-drop equation zone, comparison row, centered equation fragments. */
export const STEP_ANSWER_BOX = cn(
  STEP_ANSWER_SHELL,
  "flex flex-wrap items-center justify-center gap-2",
);

/** Knowns (multi_input): stacked rows inside one white box. */
export const STEP_ANSWER_BOX_FORM = cn(
  STEP_ANSWER_SHELL,
  "flex flex-col gap-3 justify-center",
);

/** Given step: read-only lines (labeled values, comparisons). */
export const STEP_ANSWER_BOX_READ = cn(
  STEP_ANSWER_SHELL,
  "flex flex-col items-stretch justify-center gap-1",
);

/** Interactive textarea: same shell; content top-aligned for multi-line typing. */
export const STEP_ANSWER_BOX_TEXTAREA = cn(STEP_ANSWER_SHELL, "flex items-start");
