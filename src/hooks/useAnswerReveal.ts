import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Tracks wrong checks per step (3-strikes), session reveal budget (`maxRevealsPerLesson` from API + fallback),
 * and coordinates `was_revealed` for the next mastery save-step call.
 */
export function useAnswerReveal(options: {
  unitId: string;
  lessonIndex: number;
  problemId: string | undefined;
  /** When false, reveal UI is disabled (teacher setting or no class policy). */
  allowAnswerReveal: boolean;
  /** Effective cap (from backend or fallback). Must be >= 1. */
  maxRevealsPerLesson: number;
}) {
  const { unitId, lessonIndex, problemId, allowAnswerReveal, maxRevealsPerLesson } = options;

  const maxRevealsRef = useRef(Math.max(1, maxRevealsPerLesson));
  useEffect(() => {
    maxRevealsRef.current = Math.max(1, maxRevealsPerLesson);
  }, [maxRevealsPerLesson]);

  const [wrongChecksByStep, setWrongChecksByStep] = useState<Record<string, number>>({});
  const [revealedForStep, setRevealedForStep] = useState<Record<string, boolean>>({});
  const [limitReachedForStep, setLimitReachedForStep] = useState<Record<string, boolean>>({});
  const [totalRevealsUsed, setTotalRevealsUsed] = useState(0);

  /** Mirrors state for use inside functional `setWrongChecksByStep` updaters (stale-closure safe). */
  const totalRevealsRef = useRef(0);
  const revealedRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    totalRevealsRef.current = totalRevealsUsed;
  }, [totalRevealsUsed]);
  useEffect(() => {
    revealedRef.current = revealedForStep;
  }, [revealedForStep]);

  const pendingWasRevealedForSaveRef = useRef(false);

  /** New lesson: reset strike/reveal budget for the whole session (6/lesson). */
  useEffect(() => {
    setWrongChecksByStep({});
    setRevealedForStep({});
    setLimitReachedForStep({});
    setTotalRevealsUsed(0);
    pendingWasRevealedForSaveRef.current = false;
  }, [unitId, lessonIndex]);

  /** New problem: reset per-step state only; keep `totalRevealsUsed` for the lesson. */
  useEffect(() => {
    setWrongChecksByStep({});
    setRevealedForStep({});
    setLimitReachedForStep({});
    pendingWasRevealedForSaveRef.current = false;
  }, [problemId]);

  const recordCheckResult = useCallback((stepId: string, isCorrect: boolean) => {
    if (isCorrect) {
      if (revealedRef.current[stepId]) {
        pendingWasRevealedForSaveRef.current = true;
      }
      setWrongChecksByStep((prev) => {
        const next = { ...prev };
        delete next[stepId];
        return next;
      });
      return;
    }

    setWrongChecksByStep((prev) => {
      const nextCount = (prev[stepId] ?? 0) + 1;
      if (nextCount === 3 && allowAnswerReveal) {
        if (totalRevealsRef.current >= maxRevealsRef.current) {
          setLimitReachedForStep((l) => ({ ...l, [stepId]: true }));
        } else {
          setRevealedForStep((r) => ({ ...r, [stepId]: true }));
          setTotalRevealsUsed((t) => t + 1);
        }
      }
      return { ...prev, [stepId]: nextCount };
    });
  }, [allowAnswerReveal]);

  const getRevealUi = useCallback(
    (stepId: string, correctAnswer: string | undefined) => {
      if (!correctAnswer?.trim()) {
        return { kind: "none" as const };
      }
      if (limitReachedForStep[stepId]) {
        return { kind: "limit" as const };
      }
      if (revealedForStep[stepId]) {
        return { kind: "reveal" as const, answer: correctAnswer };
      }
      return { kind: "none" as const };
    },
    [limitReachedForStep, revealedForStep],
  );

  const consumeWasRevealedForSave = useCallback((): boolean => {
    if (!pendingWasRevealedForSaveRef.current) return false;
    pendingWasRevealedForSaveRef.current = false;
    return true;
  }, []);

  const isStepRevealed = useCallback(
    (stepId: string): boolean => revealedRef.current[stepId] === true,
    [],
  );

  return {
    recordCheckResult,
    getRevealUi,
    consumeWasRevealedForSave,
    isStepRevealed,
    totalRevealsUsed,
  };
}
