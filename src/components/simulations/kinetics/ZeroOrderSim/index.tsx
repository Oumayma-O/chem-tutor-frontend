/**
 * Zero-Order Kinetics — interactive simulation.
 *
 * Desktop layout (2 rows):
 *   Row 1: [Beaker ~27%] [Line chart flex-1] [Bar chart ~150px]
 *   Row 2: [Equations flex-1]  [Mascot guide ~42%]
 *
 * Mobile: every panel is w-full and stacks vertically.
 */
import React, { useState, useEffect, useRef } from "react";
import { Settings2 } from "lucide-react";
import { SimControlBar } from "@/components/simulations/shared/SimControlBar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useKinetics } from "./useKinetics";
import { Visualizer } from "./Visualizer";
import { DynamicMath } from "./DynamicMath";
import { ParticulateBeaker } from "../shared/ParticulateBeaker";
import { ConcentrationBarChart } from "../shared/ConcentrationBarChart";
import { SimGuidePanel } from "../shared/SimGuidePanel";
import { REACTIONS, TUTORIAL_STEPS, INITIAL_CONC, MAX_TIME } from "./content";
import { useClickOutside } from "@/components/simulations/shared/useClickOutside";

interface Props {
  onBackToOverview: () => void;
  onStartPractice: () => void;
}

// ─────────────────────────────────────────────────────────────────────
const SS_STEP     = "zeroOrder_step";
const SS_REACTION = "zeroOrder_reaction";

function clearSession() {
  sessionStorage.removeItem(SS_STEP);
  sessionStorage.removeItem(SS_REACTION);
}

export function ZeroOrderSim({ onBackToOverview, onStartPractice }: Props) {
  const [reactionId, setReactionId]     = useState(REACTIONS[0].id);
  const [initialConc, setInitialConc]   = useState(INITIAL_CONC);
  const [tCurrent, setTCurrent]         = useState(0);
  const [playing, setPlaying]           = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reactionDropdownOpen, setReactionDropdownOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  useClickOutside(settingsRef, settingsOpen, () => setSettingsOpen(false));

  // Hydrate from sessionStorage once on mount
  useEffect(() => {
    const savedStep     = sessionStorage.getItem(SS_STEP);
    const savedReaction = sessionStorage.getItem(SS_REACTION);
    if (savedReaction) {
      const r = REACTIONS.find((rx) => rx.id === savedReaction);
      if (r) {
        setReactionId(r.id);
        setInitialConc(r.defaultConc);
      }
    }
    if (savedStep) {
      const s = parseInt(savedStep, 10);
      if (!isNaN(s) && s >= 0 && s < TUTORIAL_STEPS.length) setTutorialStep(s);
    }
  }, []);

  // Persist on change
  useEffect(() => {
    sessionStorage.setItem(SS_STEP, tutorialStep.toString());
    sessionStorage.setItem(SS_REACTION, reactionId);
  }, [tutorialStep, reactionId]);

  const reaction   = REACTIONS.find((r) => r.id === reactionId) ?? REACTIONS[0];
  const k          = reaction.k;
  const { series, concAtT, productAtT, halfLife, fractionA } = useKinetics(k, initialConc, tCurrent);
  const tutorial   = TUTORIAL_STEPS[tutorialStep];

  function handleReactionChange(id: string) {
    const r = REACTIONS.find((rx) => rx.id === id);
    if (!r) return;
    setReactionId(id);
    setInitialConc(r.defaultConc);
    setTCurrent(0);
    setPlaying(false);
    setTutorialStep(r.firstTutorialStep);
  }

  function handleReset() {
    clearSession();
    setReactionId(REACTIONS[0].id);
    setInitialConc(REACTIONS[0].defaultConc);
    setTCurrent(0);
    setPlaying(false);
    setTutorialStep(0);
  }

  // Auto-open parameters at tutorial steps that need it
  useEffect(() => {
    if (tutorialStep === 1 || tutorialStep === 9 || tutorialStep === 12) setSettingsOpen(true);
  }, [tutorialStep]);

  // Auto-open reaction dropdown at steps 7 and 12
  useEffect(() => {
    setReactionDropdownOpen(tutorialStep === 7 || tutorialStep === 12);
  }, [tutorialStep]);

  // Auto-play: arriving at step → replay; leaving → abort
  const isAutoPlayStep = (s: number) => s === 5 || s === 10 || s === 14;
  const prevTutorialStep = useRef(tutorialStep);
  useEffect(() => {
    const prev = prevTutorialStep.current;
    prevTutorialStep.current = tutorialStep;
    if (isAutoPlayStep(tutorialStep)) {
      // Arrived at an auto-play step → always restart from t=0
      setTCurrent(0);
      setPlaying(true);
    } else if (isAutoPlayStep(prev)) {
      setPlaying(false);
      if (tutorialStep < prev) {
        // Going backward past an auto-play step → reset chart to start
        setTCurrent(0);
      }
      // Going forward: leave tCurrent at MAX_TIME (already set by Next button / auto-advance)
    }
  }, [tutorialStep]);

  // Auto-advance when animation reaches end
  useEffect(() => {
    if (isAutoPlayStep(tutorialStep) && tCurrent >= MAX_TIME)
      setTutorialStep((s) => s + 1);
  }, [tutorialStep, tCurrent]);

  return (
    <div className="flex flex-col w-full max-w-[1600px] mx-auto xl:h-full xl:overflow-hidden">

      {/* ── Sticky control bar ───────────────────────────────────────── */}
      <SimControlBar
        onBack={() => { clearSession(); onBackToOverview(); }}
        onReset={handleReset}
        onStartPractice={() => { clearSession(); onStartPractice(); }}
      >
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Reaction:
          <Select
            value={reactionId}
            onValueChange={handleReactionChange}
            open={reactionDropdownOpen}
            onOpenChange={setReactionDropdownOpen}
          >
            <SelectTrigger className={`h-6 text-xs w-28 rounded-md transition-all duration-300 ${
              tutorialStep === 7 || tutorialStep === 12
                ? "border-blue-400 ring-2 ring-blue-300 dark:ring-blue-500 ring-offset-1"
                : ""
            }`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REACTIONS.map((r) => {
                const isSuggested =
                  (tutorialStep === 7 && r.id === "cd") ||
                  (tutorialStep === 12 && r.id === "ef");
                return (
                  <SelectItem
                    key={r.id}
                    value={r.id}
                    style={isSuggested ? { backgroundColor: "#f59e0b", color: "white" } : undefined}
                    className={`text-xs cursor-pointer ${
                      isSuggested
                        ? "font-medium data-[highlighted]:brightness-110"
                        : "data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-800 data-[highlighted]:text-foreground"
                    }`}
                  >
                    {r.label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="h-4 w-px bg-border" />

        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => setSettingsOpen((o) => !o)}
            className={`flex items-center gap-1 text-xs border rounded px-2 py-0.5 transition-colors ${
              settingsOpen
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            } ${tutorialStep === 1 ? "ring-2 ring-primary ring-offset-1" : ""}`}
          >
            <Settings2 className="w-3 h-3" />
            Parameters
          </button>
          {settingsOpen && (
            <div className="absolute top-full left-0 mt-1.5 z-50 flex items-center gap-4 px-3 py-2.5 rounded-xl border border-border bg-card shadow-lg flex-wrap min-w-max">
              <span className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground">k:</span>
                <span className="font-mono tabular-nums text-foreground">{k.toFixed(3)}</span>
                <span className="text-muted-foreground">mol·L⁻¹s⁻¹</span>
              </span>
              <div className="h-4 w-px bg-border" />
              <span className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground">[{reaction.reactant}]₀:</span>
                <span className="font-mono tabular-nums text-foreground">{initialConc.toFixed(2)}</span>
                <span className="text-muted-foreground">mol/L</span>
              </span>
            </div>
          )}
        </div>
      </SimControlBar>

      {/* ── Content wrapper ──────────────────────────────────────────────
           Mobile  (<md):  everything stacks
           Tablet  (md–xl): top row = Beaker|Bar flex-wrap; Line below; Eq|Guide row
           Desktop (≥xl):  Beaker|Line(flex-1)|Bar in one row; Eq|Guide below
           Ultra-wide: max-w-[1600px] on outer wrapper keeps proportions    */}
      <div className="flex flex-col gap-2 px-4 xl:px-6 py-2 xl:flex-1 xl:min-h-0 xl:overflow-hidden">

        {/* ── TOP ROW: Beaker | Line Chart | Bar Chart ─────────────────
             Tablet:  Beaker + Bar side-by-side (50/50), Line below (order-3)
             Desktop: Beaker (26%) | Line (flex-1) | Bar (14%) in one row   */}
        <div className="flex flex-col xl:flex-row items-stretch gap-2 xl:flex-1 xl:min-h-0">

          {/* BEAKER */}
          <div className="w-full xl:w-[22%] xl:max-w-[380px] xl:flex-shrink-0
            rounded-xl border border-border bg-card p-3 flex flex-col
            min-h-[250px] xl:min-h-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 shrink-0">
              Particulate View
            </p>
            <div className="flex-1 min-h-0">
              <ParticulateBeaker
                fractionA={fractionA}
                playing={playing}
                reactantColor={reaction.color}
                productColor={reaction.productColor}
                reactantLabel={reaction.reactant}
                productLabel={reaction.product}
                showCatalyst={true}
              />
            </div>
          </div>

          {/* BAR CHART */}
          <div className="w-full xl:w-[300px] xl:flex-shrink-0
            rounded-xl border border-border bg-card p-3 flex flex-col
            min-h-[250px] xl:min-h-0 xl:h-full">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 shrink-0">
              Current [conc]
            </p>
            <div className="h-[220px] xl:flex-1 xl:min-h-0">
              <ConcentrationBarChart
                concA={concAtT}
                concB={productAtT}
                initialConc={initialConc}
                reactantColor={reaction.color}
                productColor={reaction.productColor}
                reactantLabel={reaction.reactant}
                productLabel={reaction.product}
              />
            </div>
          </div>

          {/* LINE CHART */}
          <div className={`w-full xl:flex-1
            rounded-xl border bg-card p-3 flex flex-col
            min-h-[250px] sm:min-h-[300px] xl:min-h-0 xl:h-full
            transition-all duration-300 ${
              tutorialStep === 6
                ? "border-blue-400 dark:border-blue-500 ring-2 ring-blue-300 dark:ring-blue-600 ring-offset-1"
                : "border-border"
            }`}>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 shrink-0">
              [Concentration] vs Time
            </p>
            <div className="h-[260px] xl:h-auto xl:flex-1 xl:min-h-0">
              <Visualizer
                series={series}
                tCurrent={tCurrent}
                playing={playing}
                onTimeChange={setTCurrent}
                onTogglePlay={() => setPlaying((p) => !p)}
                halfLife={halfLife}
                initialConc={initialConc}
                reactantColor={reaction.color}
                productColor={reaction.productColor}
                reactantLabel={reaction.reactant}
                productLabel={reaction.product}
                highlightTimeControls={tutorialStep === 2 || tutorialStep === 9}
              />
            </div>
          </div>

        </div>{/* end top row */}

        {/* ── BOTTOM ROW: Equations | Guide ────────────────────────────
             Mobile: stacked. Tablet+: side-by-side, Equations wider.       */}
        <div className="flex flex-col lg:flex-row items-stretch gap-2 xl:flex-1 xl:min-h-0">

          {/* EQUATIONS */}
          <div className="w-full lg:flex-[1.5]
            rounded-xl border border-border bg-card px-3 py-2.5 flex flex-col gap-2
            min-h-[240px] lg:min-h-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Zero-Order Kinetics Equations
            </p>
            <DynamicMath
              k={k}
              initialConc={initialConc}
              tCurrent={tCurrent}
              concAtT={concAtT}
              halfLife={halfLife}
              reactantLabel={reaction.reactant}
              tutorialStep={tutorialStep}
            />
          </div>

          {/* GUIDE / MASCOT */}
          <SimGuidePanel
            tutorial={tutorial}
            tutorialStep={tutorialStep}
            totalStepCount={TUTORIAL_STEPS.length}
            onBack={() => {
              if (isAutoPlayStep(tutorialStep)) { setPlaying(false); setTCurrent(0); }
              setTutorialStep((s) => Math.max(0, s - 1));
            }}
            onNext={() => {
              if (isAutoPlayStep(tutorialStep)) { setPlaying(false); setTCurrent(MAX_TIME); }
              setTutorialStep((s) => s + 1);
            }}
            onStartPractice={() => { clearSession(); onStartPractice(); }}
          />

        </div>{/* end bottom row */}

      </div>
    </div>
  );
}
