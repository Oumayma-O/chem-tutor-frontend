/**
 * Comparing Reaction Orders — interactive simulation.
 *
 * Shows all three kinetics orders (zero / first / second) side-by-side
 * so students can directly compare particle behaviour, curve shapes,
 * integrated rate laws, and half-life patterns.
 *
 * Desktop layout (xl+):
 *   Left  (flex-[1.2]): ComparisonVisuals (beakers + chart + scrubber)
 *   Right (flex-[1]):   ComparisonMath   + SimGuidePanel
 *
 * Mobile: everything stacks vertically.
 */
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, ChevronRight, RotateCcw } from "lucide-react";
import { ComparisonVisuals } from "./ComparisonVisuals";
import { ComparisonMath }    from "./ComparisonMath";
import { SimGuidePanel }     from "../shared/SimGuidePanel";
import { useComparison }     from "./useComparison";
import { TUTORIAL_STEPS, MAX_TIME } from "./content";

const SS_STEP = "comparison_step";

function clearSession() {
  sessionStorage.removeItem(SS_STEP);
}

interface Props {
  onBackToOverview: () => void;
  onStartPractice: () => void;
}

export function ComparisonSim({ onBackToOverview, onStartPractice }: Props) {
  const [tCurrent, setTCurrent]         = useState(0);
  const [playing, setPlaying]           = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [chartsRevealed, setChartsRevealed] = useState(false);

  // Hydrate from sessionStorage once on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(SS_STEP);
    if (saved) {
      const s = parseInt(saved, 10);
      if (!isNaN(s) && s >= 0 && s < TUTORIAL_STEPS.length) {
        setTutorialStep(s);
        if (s >= 3) setChartsRevealed(true);
      }
    }
  }, []);

  // Persist on step change
  useEffect(() => {
    sessionStorage.setItem(SS_STEP, tutorialStep.toString());
  }, [tutorialStep]);

  const { snapshots, series, halfLives } = useComparison(tCurrent);
  const tutorial   = TUTORIAL_STEPS[tutorialStep];
  const isLastStep = tutorialStep === TUTORIAL_STEPS.length - 1;

  // Auto-play steps
  const isAutoPlayStep = (s: number) => TUTORIAL_STEPS[s]?.autoPlay === true;
  const prevStep = useRef(tutorialStep);
  useEffect(() => {
    const prev = prevStep.current;
    prevStep.current = tutorialStep;

    if (isAutoPlayStep(tutorialStep)) {
      setTCurrent(0);
      setPlaying(true);
    } else if (isAutoPlayStep(prev)) {
      setPlaying(false);
    }
  }, [tutorialStep]);

  // Auto-advance when animation reaches end on auto-play steps
  useEffect(() => {
    if (isAutoPlayStep(tutorialStep) && tCurrent >= MAX_TIME) {
      setTutorialStep((s) => s + 1);
    }
  }, [tutorialStep, tCurrent]);

  // Reveal charts at step 3
  useEffect(() => {
    if (tutorialStep >= 3) setChartsRevealed(true);
  }, [tutorialStep]);

  function handleReset() {
    clearSession();
    setTCurrent(0);
    setPlaying(false);
    setTutorialStep(0);
    setChartsRevealed(false);
  }

  return (
    <div className="flex flex-col w-full max-w-[1600px] mx-auto xl:h-full xl:overflow-hidden">

      {/* ── Control bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 px-4 lg:px-6 py-2 border-b border-border bg-white dark:bg-card w-full sticky top-0 z-10 shrink-0">
        <button
          onClick={() => { clearSession(); onBackToOverview(); }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Overview
        </button>

        <div className="h-4 w-px bg-border" />

        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>

        <button
          onClick={() => { clearSession(); onStartPractice(); }}
          className="ml-auto flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
        >
          Skip to Practice
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row gap-2 px-4 xl:px-6 py-2 xl:flex-1 xl:min-h-0 xl:overflow-hidden">

        {/* Visuals: beakers + chart + scrubber */}
        <div className="w-full xl:flex-[1.2] min-h-[460px] xl:min-h-0 xl:h-full">
          <ComparisonVisuals
            snapshots={snapshots}
            series={series}
            tCurrent={tCurrent}
            playing={playing}
            chartsRevealed={chartsRevealed}
            onRevealCharts={() => {
              setChartsRevealed(true);
              if (tutorialStep < 3) setTutorialStep(3);
            }}
            onTimeChange={setTCurrent}
            onTogglePlay={() => setPlaying((p) => !p)}
          />
        </div>

        {/* Right column: equations + guide */}
        <div className="w-full xl:flex-[1] flex flex-col gap-2 xl:min-h-0 xl:overflow-hidden">

          {/* Equation pills — shrink-0 so guide panel below gets all remaining space */}
          <div className="w-full shrink-0">
            <ComparisonMath
              snapshots={snapshots}
              tCurrent={tCurrent}
              halfLives={halfLives}
            />
          </div>

          {/* Guide panel */}
          <SimGuidePanel
            tutorial={tutorial}
            tutorialStep={tutorialStep}
            isLastStep={isLastStep}
            dotStart={0}
            dotEnd={TUTORIAL_STEPS.length - 1}
            onBack={() => {
              if (isAutoPlayStep(tutorialStep)) { setPlaying(false); setTCurrent(0); }
              setTutorialStep((s) => Math.max(0, s - 1));
            }}
            onNext={() => {
              if (isAutoPlayStep(tutorialStep)) { setPlaying(false); setTCurrent(MAX_TIME); }
              setTutorialStep((s) => s + 1);
            }}
            onDotClick={setTutorialStep}
            onStartPractice={() => { clearSession(); onStartPractice(); }}
          />
        </div>

      </div>
    </div>
  );
}
