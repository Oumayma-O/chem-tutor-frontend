import { useRef, useEffect } from "react";

/**
 * Shared auto-play logic for kinetics simulations.
 *
 * Handles:
 *  - Arriving at an auto-play step  → reset tCurrent to 0 and start playing
 *  - Leaving an auto-play step      → stop playing; if going backward, also reset tCurrent
 *  - Auto-advance                   → advance to the next tutorial step when tCurrent reaches maxTime
 */
export function useAutoPlay({
  tutorialStep,
  setTutorialStep,
  tCurrent,
  maxTime,
  setTCurrent,
  setPlaying,
  isAutoPlayStep,
}: {
  tutorialStep: number;
  setTutorialStep: React.Dispatch<React.SetStateAction<number>>;
  tCurrent: number;
  maxTime: number;
  setTCurrent: (t: number) => void;
  setPlaying: (p: boolean) => void;
  isAutoPlayStep: (step: number) => boolean;
}) {
  const prevStepRef = useRef(tutorialStep);

  useEffect(() => {
    const prev = prevStepRef.current;
    prevStepRef.current = tutorialStep;
    if (isAutoPlayStep(tutorialStep)) {
      setTCurrent(0);
      setPlaying(true);
    } else if (isAutoPlayStep(prev)) {
      setPlaying(false);
      if (tutorialStep < prev) setTCurrent(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialStep]);

  useEffect(() => {
    if (isAutoPlayStep(tutorialStep) && tCurrent >= maxTime)
      setTutorialStep((s) => s + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialStep, tCurrent]);
}
