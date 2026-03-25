/**
 * First-Order Kinetics — interactive simulation.
 *
 * Two-row, three-column layout:
 *
 *   ROW 1  [Beaker ~25%]  |  [[A] vs t + scrubber, flex-1]  |  [Bar Chart ~15%]
 *   ROW 2  [ln[A] vs t ~30%]  |  [Equations flex-1.5]  |  [Guide flex-1]
 */
import React, { useState, useEffect } from "react";
import { Settings2 } from "lucide-react";
import { SimControlBar } from "@/components/simulations/shared/SimControlBar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useFirstOrder } from "./useFirstOrder";
import { FirstOrderVisualizer } from "./FirstOrderVisualizer";
import { LnAChart } from "./LnAChart";
import { DynamicMath } from "./DynamicMath";
import { ParticulateBeaker } from "../shared/ParticulateBeaker";
import { ConcentrationBarChart } from "../shared/ConcentrationBarChart";
import { SimGuidePanel } from "../shared/SimGuidePanel";
import { useSimSession } from "../../shared/useSimSession";
import { useAutoPlay } from "../../shared/useAutoPlay";
import { REACTIONS, TUTORIAL_STEPS, INITIAL_CONC, MAX_TIME } from "./content";

interface Props {
  onBackToOverview: () => void;
  onStartPractice: () => void;
}

export function FirstOrderSim({ onBackToOverview, onStartPractice }: Props) {
  const [reactionId, setReactionId]     = useState(REACTIONS[0].id);
  const [initialConc, setInitialConc]   = useState(INITIAL_CONC);
  const [tCurrent, setTCurrent]         = useState(0);
  const [playing, setPlaying]           = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reactionDropdownOpen, setReactionDropdownOpen] = useState(false);

  const { clearSession } = useSimSession({
    stepKey:     "firstOrder_step",
    reactionKey: "firstOrder_reaction",
    totalSteps:  TUTORIAL_STEPS.length,
    tutorialStep,
    reactionId,
    onLoad: ({ step, reactionId: rid }) => {
      setTutorialStep(step);
      if (rid) {
        const r = REACTIONS.find((rx) => rx.id === rid);
        if (r) { setReactionId(r.id); setInitialConc(r.defaultConc); }
      }
    },
  });

  const reaction = REACTIONS.find((r) => r.id === reactionId) ?? REACTIONS[0];
  const k        = reaction.k;
  const { series, concAtT, productAtT, lnAatT, halfLife, fractionA } =
    useFirstOrder(k, initialConc, tCurrent);
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

  // Auto-open parameters at relevant steps
  useEffect(() => {
    if (tutorialStep === 1 || tutorialStep === 3) setSettingsOpen(true);
  }, [tutorialStep]);

  // Auto-open reaction dropdown at hand-off steps
  useEffect(() => {
    setReactionDropdownOpen(tutorialStep === 11 || tutorialStep === 16);
  }, [tutorialStep]);

  const isAutoPlayStep = (s: number) => s === 10 || s === 14 || s === 18;
  useAutoPlay({ tutorialStep, setTutorialStep, tCurrent, maxTime: MAX_TIME, setTCurrent, setPlaying, isAutoPlayStep });

  return (
    <div className="flex flex-col w-full max-w-[1600px] mx-auto xl:h-full xl:overflow-hidden">

      {/* ── Sticky control bar ─────────────────────────────────── */}
      <SimControlBar
        onBack={() => { clearSession(); onBackToOverview(); }}
        onReset={handleReset}
        onStartPractice={() => { clearSession(); onStartPractice(); }}
      >
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Reaction:
          <Select value={reactionId} onValueChange={handleReactionChange}
            open={reactionDropdownOpen} onOpenChange={setReactionDropdownOpen}>
            <SelectTrigger className={`h-6 text-xs w-28 rounded-md transition-all duration-300 ${
              tutorialStep === 11 || tutorialStep === 16
                ? "border-blue-400 ring-2 ring-blue-300 dark:ring-blue-500 ring-offset-1" : ""}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REACTIONS.map((r) => {
                const isSuggested = (tutorialStep === 11 && r.id === "cd") || (tutorialStep === 16 && r.id === "ef");
                return (
                  <SelectItem key={r.id} value={r.id}
                    style={isSuggested ? { backgroundColor: "#f59e0b", color: "white" } : undefined}
                    className={`text-xs cursor-pointer ${isSuggested
                      ? "font-medium data-[highlighted]:brightness-110"
                      : "data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-800 data-[highlighted]:text-foreground"}`}>
                    {r.label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div className="h-4 w-px bg-border" />

        <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
          <PopoverTrigger asChild>
            <button
              className={`flex items-center gap-1 text-xs border rounded px-2 py-0.5 transition-colors ${
                settingsOpen ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              } ${tutorialStep === 1 || tutorialStep === 3 ? "ring-2 ring-primary ring-offset-1" : ""}`}
            >
              <Settings2 className="w-3 h-3" />
              Parameters
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={6} className="w-auto flex items-center gap-4 px-3 py-2.5">
            <span className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">k:</span>
              <span className="font-mono tabular-nums text-foreground">{k.toFixed(3)}</span>
              <span className="text-muted-foreground">s⁻¹</span>
            </span>
            <div className="h-4 w-px bg-border" />
            <span className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">[{reaction.reactant}]₀:</span>
              <span className="font-mono tabular-nums text-foreground">{initialConc.toFixed(2)}</span>
              <span className="text-muted-foreground">mol/L</span>
            </span>
          </PopoverContent>
        </Popover>
      </SimControlBar>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 px-4 xl:px-6 py-2 xl:flex-1 xl:min-h-0 xl:overflow-hidden">

        {/* ── ROW 1: Beaker | [A] vs t | Bar Chart ─────────────── */}
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
                showCatalyst={false}
              />
            </div>
          </div>

          {/* [A] vs t CHART + SCRUBBER */}
          <div className="w-full xl:flex-1
            rounded-xl border border-border bg-card p-3 flex flex-col
            min-h-[250px] sm:min-h-[300px] xl:min-h-0 xl:h-full">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 shrink-0">
              [Concentration] vs Time
            </p>
            <div className="h-[260px] xl:h-auto xl:flex-1 xl:min-h-0">
              <FirstOrderVisualizer
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
                highlightTimeControls={tutorialStep === 1 || tutorialStep === 10}
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
        </div>

        {/* ── ROW 2: ln[A] | Equations | Guide ─────────────────── */}
        <div className="flex flex-col lg:flex-row items-stretch gap-2 xl:flex-1 xl:min-h-0">

          {/* ln[A] vs t CHART */}
          <div className="w-full lg:w-[28%] lg:flex-shrink-0
            rounded-xl border border-border bg-card p-3 flex flex-col
            min-h-[240px] lg:min-h-0">
            <div className="h-[220px] lg:flex-1 lg:min-h-0">
              <LnAChart
                series={series}
                tCurrent={tCurrent}
                halfLife={halfLife}
                initialConc={initialConc}
                reactantColor={reaction.color}
                reactantLabel={reaction.reactant}
              />
            </div>
          </div>

          {/* EQUATIONS */}
          <div className="w-full lg:flex-[1.5]
            rounded-xl border border-border bg-card p-3 flex flex-col gap-1.5
            min-h-[240px] lg:min-h-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground shrink-0">
              First-Order Kinetics Equations
            </p>
            <div className="flex-1 min-h-0 flex flex-col">
            <DynamicMath
              k={k}
              initialConc={initialConc}
              tCurrent={tCurrent}
              concAtT={concAtT}
              lnAatT={lnAatT}
              halfLife={halfLife}
              reactantLabel={reaction.reactant}
              tutorialStep={tutorialStep}
            />
          </div>
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

        </div>{/* end row 2 */}

      </div>
    </div>
  );
}
