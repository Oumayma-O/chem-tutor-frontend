import { useEffect } from "react";

/**
 * Shared session-storage helpers for kinetics simulations.
 *
 * Handles two persisted values per sim:
 *   - tutorial step  (integer)
 *   - reaction id    (string, optional)
 *
 * Usage:
 *   const { clearSession } = useSimSession({
 *     stepKey:      "zero_step",
 *     reactionKey:  "zero_reaction",          // omit if no reaction to persist
 *     totalSteps:   TUTORIAL_STEPS.length,
 *     onLoad: ({ step, reactionId }) => {
 *       setTutorialStep(step);
 *       if (reactionId) setReactionId(reactionId);
 *     },
 *     tutorialStep,
 *     reactionId,                             // omit if no reaction to persist
 *   });
 */

interface Options {
  stepKey: string;
  reactionKey?: string;
  totalSteps: number;
  tutorialStep: number;
  reactionId?: string;
  onLoad: (saved: { step: number; reactionId?: string }) => void;
}

export function useSimSession({
  stepKey,
  reactionKey,
  totalSteps,
  tutorialStep,
  reactionId,
  onLoad,
}: Options): { clearSession: () => void } {
  // Hydrate once on mount
  useEffect(() => {
    const savedStep     = sessionStorage.getItem(stepKey);
    const savedReaction = reactionKey ? sessionStorage.getItem(reactionKey) : undefined;

    const step = savedStep ? parseInt(savedStep, 10) : NaN;
    onLoad({
      step: !isNaN(step) && step >= 0 && step < totalSteps ? step : 0,
      reactionId: savedReaction ?? undefined,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on change
  useEffect(() => {
    sessionStorage.setItem(stepKey, tutorialStep.toString());
  }, [stepKey, tutorialStep]);

  useEffect(() => {
    if (reactionKey && reactionId !== undefined) {
      sessionStorage.setItem(reactionKey, reactionId);
    }
  }, [reactionKey, reactionId]);

  function clearSession() {
    sessionStorage.removeItem(stepKey);
    if (reactionKey) sessionStorage.removeItem(reactionKey);
  }

  return { clearSession };
}
