import { useMemo, useCallback } from "react";
import type { SolutionStep } from "@/types/chemistry";
import { useAnswerReveal } from "@/hooks/useAnswerReveal";
import { correctAnswerTextForReveal } from "@/lib/stepRevealAnswer";
import { getFallbackMaxAnswerRevealsPerLesson } from "@/config/tutorReveal";

/**
 * Wires 3-strikes answer reveal + session cap to problem navigation and live session flags.
 * Keeps `ChemistryTutor` free of reveal-specific `useMemo` / `useCallback` glue.
 */
export function useTutorAnswerReveal(options: {
  unitId: string;
  lessonIndex: number;
  problemId: string | undefined;
  currentLevel: number;
  /** From `useProblemNavigation` (`allowAnswerReveal`). */
  navAllowAnswerReveal: boolean | undefined;
  /** From student live session (`allow_answer_reveal`). */
  liveSessionAllowAnswerReveal: boolean | undefined;
  /** From last problem delivery (`max_answer_reveals_per_lesson`). */
  navMaxAnswerRevealsPerLesson?: number;
  /** From GET `/classrooms/me/live-session` (`max_answer_reveals_per_lesson`). */
  liveSessionMaxAnswerRevealsPerLesson?: number;
}) {
  const {
    unitId,
    lessonIndex,
    problemId,
    currentLevel,
    navAllowAnswerReveal,
    liveSessionAllowAnswerReveal,
    navMaxAnswerRevealsPerLesson,
    liveSessionMaxAnswerRevealsPerLesson,
  } = options;

  const allowAnswerRevealSetting = useMemo(
    () =>
      currentLevel > 1 &&
      (liveSessionAllowAnswerReveal ?? navAllowAnswerReveal ?? true),
    [currentLevel, liveSessionAllowAnswerReveal, navAllowAnswerReveal],
  );

  const maxAnswerRevealsPerLesson = useMemo(() => {
    const fromApi = liveSessionMaxAnswerRevealsPerLesson ?? navMaxAnswerRevealsPerLesson;
    if (typeof fromApi === "number" && Number.isFinite(fromApi) && fromApi >= 1) {
      return Math.floor(fromApi);
    }
    return getFallbackMaxAnswerRevealsPerLesson();
  }, [liveSessionMaxAnswerRevealsPerLesson, navMaxAnswerRevealsPerLesson]);

  const answerReveal = useAnswerReveal({
    unitId,
    lessonIndex,
    problemId,
    allowAnswerReveal: allowAnswerRevealSetting,
    maxRevealsPerLesson: maxAnswerRevealsPerLesson,
  });

  const { getRevealUi } = answerReveal;
  const getInteractiveReveal = useCallback(
    (step: SolutionStep) => {
      const ui = getRevealUi(step.id, correctAnswerTextForReveal(step));
      if (ui.kind === "reveal") {
        return { revealAnswerText: ui.answer, revealLimitReached: false };
      }
      if (ui.kind === "limit") {
        return { revealAnswerText: null, revealLimitReached: true };
      }
      return { revealAnswerText: null, revealLimitReached: false };
    },
    [getRevealUi],
  );

  return {
    ...answerReveal,
    getInteractiveReveal,
    allowAnswerRevealSetting,
    maxAnswerRevealsPerLesson,
  };
}
