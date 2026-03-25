import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from "react";
import { SimControlBar } from "@/components/simulations/shared/SimControlBar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { REACTIONS, TUTORIAL_STEPS, type TutorialHighlight } from "./content";
import { useArrhenius, arrheniusRateConstant } from "./useArrhenius";
import { getArrheniusTutorialUiState, hasTutorialHighlight } from "./arrheniusTutorialUi";
import { EnergyProfile } from "./EnergyProfile";
import { ArrheniusGraph } from "./ArrheniusGraph";
import { ArrheniusMath } from "./ArrheniusMath";
import { ArrheniusParticulateBeaker } from "./ParticulateBeaker";
import { SimGuidePanel } from "../shared/SimGuidePanel";

// ── SessionStorage key ────────────────────────────────────────────────────
const SESSION_KEY = "arrhenius_step";

/** Footer shows "Step {tutorialStep + 1}"; sliders + graph two-point dots only on that step (two-point form). */
const TWO_POINT_TEMPERATURE_UI_STEP = 9;

function getPersistedStep(): number {
  try {
    const val = sessionStorage.getItem(SESSION_KEY);
    if (val !== null) return Math.max(0, Math.min(Number(val), TUTORIAL_STEPS.length - 1));
  } catch {
    // ignore
  }
  return 0;
}

function persistStep(step: number) {
  try {
    sessionStorage.setItem(SESSION_KEY, String(step));
  } catch {
    // ignore
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

// ── Props ─────────────────────────────────────────────────────────────────
interface Props {
  onBackToOverview: () => void;
  onStartPractice: () => void;
}

// ── Main component ────────────────────────────────────────────────────────
export function ArrheniusSim({ onBackToOverview, onStartPractice }: Props) {
  const [reactionId, setReactionId]     = useState("decomp");
  const [temperature, setTemperature]   = useState(298);
  const [catalystId, setCatalystId]     = useState("none");
  const [tutorialStep, setTutorialStepRaw] = useState<number>(getPersistedStep);
  const [playing, setPlaying]   = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [twoPointLo, setTwoPointLo] = useState(300);
  const [twoPointHi, setTwoPointHi] = useState(420);
  const [reactionProgress, setReactionProgress] = useState(0);
  /** Captures T when landing on “Use the Flame”; Next unlocks only when T increases. */
  const unlockFlameStartT = useRef<number | null>(null);
  const temperatureRef = useRef(temperature);
  temperatureRef.current = temperature;
  const equationsScrollRef = useRef<HTMLDivElement>(null);

  // Compute Arrhenius state
  const arrhState = useArrhenius(reactionId, temperature, catalystId);

  const tutorialUi = useMemo(
    () => getArrheniusTutorialUiState(tutorialStep, temperature),
    [tutorialStep, temperature],
  );
  const hl = tutorialUi.highlights;

  /** "Pick two temperatures (model)" + ln(k) two-point markers — footer "Step 9 of …" only. */
  const showTwoPointTemperatureModel =
    tutorialStep + 1 === TWO_POINT_TEMPERATURE_UI_STEP;

  // Persist tutorial step
  const setTutorialStep = useCallback((step: number) => {
    setTutorialStepRaw(step);
    persistStep(step);
  }, []);

  useEffect(() => {
    if (tutorialStep === 0) setPlaying(false);
  }, [tutorialStep]);

  useEffect(() => {
    if (tutorialUi.shouldAutoPlayBeaker) setPlaying(true);
  }, [tutorialUi.shouldAutoPlayBeaker, tutorialStep]);

  useLayoutEffect(() => {
    if (TUTORIAL_STEPS[tutorialStep]?.action === "unlock_temperature") {
      unlockFlameStartT.current = temperatureRef.current;
    } else {
      unlockFlameStartT.current = null;
    }
  }, [tutorialStep]);

  /** Two-point controls expand the math column; scroll so sliders stay visible without resizing the chat rail. */
  useEffect(() => {
    if (!showTwoPointTemperatureModel) return;
    const el = equationsScrollRef.current;
    if (!el) return;
    const t = window.setTimeout(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, 50);
    return () => window.clearTimeout(t);
  }, [tutorialStep, showTwoPointTemperatureModel]);

  const handleBack = useCallback(() => {
    setTutorialStep(Math.max(0, tutorialStep - 1));
  }, [tutorialStep, setTutorialStep]);

  const handleNext = useCallback(() => {
    setTutorialStep(Math.min(TUTORIAL_STEPS.length - 1, tutorialStep + 1));
  }, [tutorialStep, setTutorialStep]);

  const handleReset = useCallback(() => {
    clearSession();
    setReactionId("decomp");
    setTemperature(298);
    setCatalystId("none");
    setTutorialStepRaw(0);
    setPlaying(false);
    setResetKey((k) => k + 1);
    setReactionProgress(0);
  }, []);

  const handleStartPractice = useCallback(() => {
    clearSession();
    onStartPractice();
  }, [onStartPractice]);

  const tLo = Math.min(twoPointLo, twoPointHi);
  const tHi = Math.max(twoPointLo, twoPointHi);
  const kTwo1 = arrheniusRateConstant(arrhState.reaction.A, arrhState.reaction.Ea, tLo);
  const kTwo2 = arrheniusRateConstant(arrhState.reaction.A, arrhState.reaction.Ea, tHi);

  const selectedReaction = REACTIONS.find((r) => r.id === reactionId);

  const tutorialAction = TUTORIAL_STEPS[tutorialStep]?.action;
  const nextLockedChooseCatalyst =
    tutorialAction === "choose_catalyst" && catalystId === "none";
  const flameBaseline = unlockFlameStartT.current;
  const nextLockedUnlockFlame =
    tutorialAction === "unlock_temperature" &&
    flameBaseline !== null &&
    temperature <= flameBaseline;
  const nextDisabled = nextLockedChooseCatalyst || nextLockedUnlockFlame;

  return (
    <div className="flex flex-col w-full max-w-[1600px] mx-auto xl:h-full xl:min-h-0 xl:overflow-visible">

      {/* ── Control bar ── */}
      <SimControlBar
        onBack={onBackToOverview}
        onReset={handleReset}
        onStartPractice={handleStartPractice}
        practiceButtonClassName={
          hasTutorialHighlight(hl, "practice-button") ? tutorialUi.ringClass : undefined
        }
      >
        {/* Reaction dropdown */}
        <div
          data-tutorial="reaction-dropdown"
          className={cn(
            "flex items-center gap-1.5 text-xs text-muted-foreground rounded-md p-1 -m-1",
            hasTutorialHighlight(hl, "reaction-dropdown") && tutorialUi.ringClass,
          )}
        >
          Reaction:
          <Select
            value={reactionId}
            onValueChange={(v) => {
              setReactionId(v);
              setResetKey((k) => k + 1);
            }}
          >
            <SelectTrigger
              className="h-6 text-xs w-48 rounded-md"
              title={selectedReaction?.description}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REACTIONS.map((r) => (
                <SelectItem key={r.id} value={r.id} className="text-xs cursor-pointer">
                  <span className="block leading-tight">{r.label}</span>
                  {r.description && (
                    <span className="block text-[10px] text-muted-foreground mt-0.5 max-w-[220px]">
                      {r.description}
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Play / Pause */}
        <button
          type="button"
          disabled={tutorialUi.lockPlayButton}
          onClick={() => setPlaying((p) => !p)}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 transition-colors",
            playing ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-muted hover:bg-muted/80 text-foreground",
            tutorialUi.lockPlayButton && "opacity-40 cursor-not-allowed pointer-events-none",
          )}
        >
          {playing ? "⏸ Pause" : "▶ Play"}
        </button>
      </SimControlBar>

      {/* ── Main content ── */}
      <div className="flex flex-col xl:flex-row gap-3 px-4 xl:px-6 py-3 xl:flex-1 xl:min-h-0 xl:overflow-visible">

        {/* LEFT: Beaker */}
        <div
          data-tutorial="beaker-panel"
          className="w-full xl:w-[280px] xl:flex-shrink-0 min-h-[340px] xl:min-h-0 xl:h-full"
        >
          <ArrheniusParticulateBeaker
            playing={playing}
            catalystId={catalystId}
            onCatalystChange={setCatalystId}
            temperature={temperature}
            onTemperatureChange={setTemperature}
            effectiveEa={arrhState.effectiveEa}
            k={arrhState.k}
            kRefBaseline={arrheniusRateConstant(arrhState.reaction.A, arrhState.reaction.Ea, 298)}
            isCatalystEnabled={!tutorialUi.lockCatalystVials}
            resetKey={resetKey}
            ringBeaker={hasTutorialHighlight(hl, "beaker-container")}
            ringCatalystRow={hasTutorialHighlight(hl, "catalyst-vials")}
            ringTempSlider={hasTutorialHighlight(hl, "temp-slider")}
            tutorialRingClass={tutorialUi.ringClass}
            temperatureLocked={tutorialUi.lockTemperatureSlider}
            collisionProbabilityScale={tutorialUi.collisionProbabilityScale}
            particleSpeedScale={tutorialUi.particleSpeedScale}
            flameTutorialBoost={tutorialUi.flameTutorialBoost}
            onReactionProgress={setReactionProgress}
          />
        </div>

        {/* CENTER: Energy Profile + Arrhenius Graph stacked */}
        <div className="flex flex-col xl:flex-[1.2] gap-3 xl:min-h-0 xl:h-full overflow-visible">

          {/* Energy Profile */}
          <div
            data-tutorial="energy-profile-chart"
            className={cn(
              "flex flex-col flex-1 min-h-[240px] rounded-xl border border-border bg-card p-3",
              hasTutorialHighlight(hl, "energy-profile-chart") && tutorialUi.ringClass,
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              Energy Profile
            </p>
            <div className="w-full h-[200px] xl:h-full xl:flex-1 xl:min-h-0">
              <EnergyProfile
                reaction={arrhState.reaction}
                effectiveEa={arrhState.effectiveEa}
                catalystActive={catalystId !== "none"}
                temperature={temperature}
                reactionProgress={reactionProgress}
                pulseEaHighlight={tutorialUi.pulseEnergyProfileEa}
                pulseDeltaHHighlight={tutorialUi.pulseEnergyProfileDeltaH}
                pulseKineticLine={tutorialUi.pulseAverageKeLine}
                animateCatalysedPath={tutorialUi.animateCatalysedPathDraw}
              />
            </div>
          </div>

          {/* Arrhenius Graph */}
          <div
            data-tutorial="arrhenius-plot"
            className={cn(
              "flex flex-col flex-1 min-h-[240px] rounded-xl border border-border bg-card p-3",
              hasTutorialHighlight(hl, "arrhenius-plot") && tutorialUi.ringClass,
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              ln(k) vs 1/T
            </p>
            <div className="w-full h-[200px] xl:h-full xl:flex-1 xl:min-h-0">
              <ArrheniusGraph
                lineSeries={arrhState.lineSeries}
                currentInvT={arrhState.invT}
                currentLnK={arrhState.lnK}
                animateActiveDot={tutorialUi.animateArrheniusDot}
                showSlopeTriangle={tutorialUi.showSlopeTriangle}
                effectiveEaJ={arrhState.reaction.Ea}
                twoPointInvT1={showTwoPointTemperatureModel ? 1 / tLo : undefined}
                twoPointLnK1={showTwoPointTemperatureModel ? Math.log(kTwo1) : undefined}
                twoPointInvT2={showTwoPointTemperatureModel ? 1 / tHi : undefined}
                twoPointLnK2={showTwoPointTemperatureModel ? Math.log(kTwo2) : undefined}
              />
            </div>
          </div>
        </div>

        {/* RIGHT: pills natural height except Step 9 (sliders → scroll); guide flexes and may shrink */}
        <div className="flex h-full min-h-0 w-full flex-col overflow-x-hidden xl:flex-[1]">
          <div
            ref={equationsScrollRef}
            className={cn(
              "shrink-0 pr-2 px-1 sm:px-1.5 py-1",
              showTwoPointTemperatureModel
                ? "min-h-0 overflow-y-auto xl:max-h-[50%]"
                : "overflow-x-hidden overflow-y-visible",
            )}
          >
            <ArrheniusMath
              reaction={arrhState.reaction}
              effectiveEa={arrhState.effectiveEa}
              temperature={temperature}
              k={arrhState.k}
              lnK={arrhState.lnK}
              invT={arrhState.invT}
              highlightArrheniusPill={hasTutorialHighlight(hl, "equation-arrhenius")}
              highlightLinearPill={hasTutorialHighlight(hl, "equation-linear")}
              highlightTwoPointPill={hasTutorialHighlight(hl, "equation-twopoint")}
              showTwoPointControls={showTwoPointTemperatureModel}
              twoPointT1={twoPointLo}
              twoPointT2={twoPointHi}
              onTwoPointT1={setTwoPointLo}
              onTwoPointT2={setTwoPointHi}
            />
          </div>

          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-hidden",
              showTwoPointTemperatureModel ? "mt-4" : "mt-2",
            )}
          >
            <SimGuidePanel
              fixedLayout
              dense={!showTwoPointTemperatureModel}
              tutorial={TUTORIAL_STEPS[tutorialStep]}
              tutorialStep={tutorialStep}
              totalStepCount={TUTORIAL_STEPS.length}
              onBack={handleBack}
              onNext={handleNext}
              onStartPractice={handleStartPractice}
              nextDisabled={nextDisabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
