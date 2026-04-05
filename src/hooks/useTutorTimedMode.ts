import { useCallback, useEffect, useState } from "react";

export function useTutorTimedMode() {
  const [showExitTicket, setShowExitTicket] = useState(false);
  const [timedModeActive, setTimedModeActive] = useState(false);
  const [timedPracticeMinutes, setTimedPracticeMinutes] = useState<number | null>(null);
  const [timedStartedAt, setTimedStartedAt] = useState<string | null>(null);
  const [showLaunchScreen, setShowLaunchScreen] = useState(false);
  const [showTransitionScreen, setShowTransitionScreen] = useState(false);
  const [timedExitTicketConfigId, setTimedExitTicketConfigId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!timedModeActive || !timedStartedAt || !timedPracticeMinutes) {
      setTimeRemaining(null);
      return;
    }
    const tick = () => {
      const elapsed = (Date.now() - new Date(timedStartedAt).getTime()) / 1000;
      const remaining = Math.max(0, timedPracticeMinutes * 60 - elapsed);
      setTimeRemaining(Math.ceil(remaining));
      if (remaining <= 0 && !showTransitionScreen && !showExitTicket) {
        setShowTransitionScreen(true);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [timedModeActive, timedStartedAt, timedPracticeMinutes, showTransitionScreen, showExitTicket]);

  const handleTimedTransitionComplete = useCallback(async () => {
    setShowTransitionScreen(false);
    setShowExitTicket(true);
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  return {
    showExitTicket,
    setShowExitTicket,
    timedModeActive,
    setTimedModeActive,
    timedPracticeMinutes,
    setTimedPracticeMinutes,
    timedStartedAt,
    setTimedStartedAt,
    showLaunchScreen,
    setShowLaunchScreen,
    showTransitionScreen,
    setShowTransitionScreen,
    timedExitTicketConfigId,
    setTimedExitTicketConfigId,
    timeRemaining,
    handleTimedTransitionComplete,
    formatTime,
  };
}

export type TutorTimedModeApi = ReturnType<typeof useTutorTimedMode>;

