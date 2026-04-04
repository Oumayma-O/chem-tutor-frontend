/**
 * After this many Level 2 problem completions (including the one just finished),
 * the L2→L3 modal only offers "Advance" (practice-more CTA is hidden).
 *
 * **Backend sync:** Must match the Level 2 playlist cap (`max_problems` for level 2 in
 * `useProblemNavigation` / API). If the backend adds `level_2_completions` or changes
 * playlist size, update this constant and the API contract together.
 */
export const LEVEL_2_MAX = 5;
