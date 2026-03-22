/**
 * Second-Order Kinetics — interactive simulation.
 *
 * Two-row, three-column layout:
 *
 *   ROW 1  [Collision Beaker ~22%]  |  [[A] vs t + scrubber, flex-1]  |  [Bar Chart ~300px]
 *   ROW 2  [1/[A] vs t ~28%]        |  [Equations flex-1.5]           |  [Guide flex-1]
 */
import React, { useState, useEffect, useRef, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, Settings2, Zap } from "lucide-react";
import { BeakerMascot } from "@/components/tutor/BeakerMascot";
import type { MascotMood } from "@/components/tutor/BeakerMascot";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSecondOrder } from "./useSecondOrder";
import { SecondOrderVisualizer } from "./SecondOrderVisualizer";
import { InvAChart } from "./InvAChart";
import { DynamicMath } from "./DynamicMath";
import { SecondOrderBeaker, BEAKER_TOTAL_AA, BEAKER_AB_EACH } from "./SecondOrderBeaker";
import { ConcentrationBarChart } from "../shared/ConcentrationBarChart";
import { REACTIONS, TUTORIAL_STEPS, INITIAL_CONC, MAX_TIME } from "./content";

interface Props {
  onBackToOverview: () => void;
  onStartPractice: () => void;
}

// ── Chemistry variable highlighter ───────────────────────────────────
const CHEM_VAR_RE = /(\[[\w]+\][₀t]?(?:\s*=\s*[\d.]+\s*\w+)?|k\s*=\s*[\d.]+(?:\s*[\w·⁻¹]+)*|t½\s*=\s*[\d.∞]+\s*\w*)/g;

function highlightChemVars(text: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(CHEM_VAR_RE.source, "g");
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) result.push(<Fragment key={last}>{text.slice(last, match.index)}</Fragment>);
    result.push(<span key={match.index} className="font-semibold text-blue-600 dark:text-blue-400">{match[0]}</span>);
    last = match.index + match[0].length;
  }
  if (last < text.length) result.push(<Fragment key={last}>{text.slice(last)}</Fragment>);
  return result;
}

// ── Session storage ───────────────────────────────────────────────────
const SS_STEP     = "secondOrder_step";
const SS_REACTION = "secondOrder_reaction";
function clearSession() {
  sessionStorage.removeItem(SS_STEP);
  sessionStorage.removeItem(SS_REACTION);
}

// ─────────────────────────────────────────────────────────────────────

export function SecondOrderSim({ onBackToOverview, onStartPractice }: Props) {
  const [reactionId, setReactionId]     = useState(REACTIONS[0].id);
  const [initialConc, setInitialConc]   = useState(INITIAL_CONC);
  const [tCurrent, setTCurrent]         = useState(0);
  const [playing, setPlaying]           = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reactionDropdownOpen, setReactionDropdownOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Hydrate from sessionStorage once on mount
  useEffect(() => {
    const savedStep     = sessionStorage.getItem(SS_STEP);
    const savedReaction = sessionStorage.getItem(SS_REACTION);
    if (savedReaction) {
      const r = REACTIONS.find((rx) => rx.id === savedReaction);
      if (r) { setReactionId(r.id); setInitialConc(r.defaultConc); }
    }
    if (savedStep) {
      const s = parseInt(savedStep, 10);
      if (!isNaN(s) && s >= 0 && s < TUTORIAL_STEPS.length) setTutorialStep(s);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(SS_STEP, tutorialStep.toString());
    sessionStorage.setItem(SS_REACTION, reactionId);
  }, [tutorialStep, reactionId]);

  const reaction = REACTIONS.find((r) => r.id === reactionId) ?? REACTIONS[0];
  const k        = reaction.k;
  const isAB     = reaction.reactionType === "ab";
  const { series, concAtT, productAtT, invAatT, halfLife, fractionA } =
    useSecondOrder(k, initialConc, tCurrent);

  // Particle counts for SecondOrderBeaker (visual only — derived from fractionA)
  const beakerCountA = Math.round(fractionA * (isAB ? BEAKER_AB_EACH : BEAKER_TOTAL_AA));
  const beakerCountB = isAB ? Math.round(fractionA * BEAKER_AB_EACH) : 0;
  // 2→1 merge: one particle becomes product, one disappears
  const beakerCountP = isAB
    ? (BEAKER_AB_EACH - beakerCountA)                          // A+B→C: only A slots become P
    : Math.floor((BEAKER_TOTAL_AA - beakerCountA) / 2);        // A+A→B: half the consumed become P
  const tutorial   = TUTORIAL_STEPS[tutorialStep];
  const isLastStep = tutorialStep === TUTORIAL_STEPS.length - 1;

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
    if (tutorialStep === 1 || tutorialStep === 2) setSettingsOpen(true);
  }, [tutorialStep]);

  // Auto-open reaction dropdown at hand-off steps
  useEffect(() => {
    setReactionDropdownOpen(tutorialStep === 12 || tutorialStep === 16);
  }, [tutorialStep]);

  // Close settings on outside click
  useEffect(() => {
    if (!settingsOpen) return;
    const h = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node))
        setSettingsOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [settingsOpen]);

  // Auto-play steps: 11 (A+A), 15 (A+B), 18 (A+A-fast)
  const isAutoPlayStep = (s: number) => s === 11 || s === 15 || s === 18;
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
  }, [tutorialStep]);

  useEffect(() => {
    if (isAutoPlayStep(tutorialStep) && tCurrent >= MAX_TIME)
      setTutorialStep((s) => s + 1);
  }, [tutorialStep, tCurrent]);

  // Pagination dots
  const reactionIdx = REACTIONS.findIndex((r) => r.id === reactionId);
  const dotStart    = reaction.firstTutorialStep;
  const dotEnd      = REACTIONS[reactionIdx + 1]
    ? REACTIONS[reactionIdx + 1].firstTutorialStep - 1
    : TUTORIAL_STEPS.length - 1;

  return (
    <div className="flex flex-col w-full max-w-[1600px] mx-auto xl:h-full xl:overflow-hidden">

      {/* ── Sticky control bar ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 px-4 lg:px-6 py-2 border-b border-border bg-white dark:bg-card w-full sticky top-0 z-10 shrink-0">

        <button onClick={() => { clearSession(); onBackToOverview(); }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3 h-3" />
          Overview
        </button>
        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Reaction:
          <Select value={reactionId} onValueChange={handleReactionChange}
            open={reactionDropdownOpen} onOpenChange={setReactionDropdownOpen}>
            <SelectTrigger className={`h-6 text-xs w-36 rounded-md transition-all duration-300 ${
              tutorialStep === 12 || tutorialStep === 16
                ? "border-blue-400 ring-2 ring-blue-300 dark:ring-blue-500 ring-offset-1" : ""}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REACTIONS.map((r) => {
                const isSuggested = (tutorialStep === 12 && r.id === "ab") || (tutorialStep === 16 && r.id === "aa-fast");
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

        <div className="relative" ref={settingsRef}>
          <button onClick={() => setSettingsOpen((o) => !o)}
            className={`flex items-center gap-1 text-xs border rounded px-2 py-0.5 transition-colors ${
              settingsOpen ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            } ${tutorialStep === 1 || tutorialStep === 2 ? "ring-2 ring-primary ring-offset-1" : ""}`}>
            <Settings2 className="w-3 h-3" />
            Parameters
          </button>
          {settingsOpen && (
            <div className="absolute top-full left-0 mt-1.5 z-50 flex items-center gap-4 px-3 py-2.5 rounded-xl border border-border bg-card shadow-lg flex-wrap min-w-max">
              <span className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground">k:</span>
                <span className="font-mono tabular-nums text-foreground">{k.toFixed(3)}</span>
                <span className="text-muted-foreground">M⁻¹s⁻¹</span>
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

        <button onClick={handleReset}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>

        <button onClick={() => { clearSession(); onStartPractice(); }}
          className="ml-auto flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors">
          Skip to Practice
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 px-4 xl:px-6 py-2 xl:flex-1 xl:min-h-0 xl:overflow-hidden">

        {/* ── ROW 1: Beaker | [A] vs t | Bar Chart ─────────────── */}
        <div className="flex flex-col xl:flex-row items-stretch gap-2 xl:flex-1 xl:min-h-0">

          {/* COLLISION BEAKER */}
          <div className="w-full xl:w-[22%] xl:max-w-[380px] xl:flex-shrink-0
            rounded-xl border border-border bg-card p-3 flex flex-col
            min-h-[250px] xl:min-h-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 shrink-0">
              Collision View
            </p>
            <div className="flex-1 min-h-0">
              <SecondOrderBeaker
                reactionType={reaction.reactionType}
                countA={beakerCountA}
                countB={beakerCountB}
                countProduct={beakerCountP}
                playing={playing}
                reactantColor={reaction.color}
                productColor={reaction.productColor}
                bColor={reaction.bColor ?? "#f43f5e"}
                reactantLabel={reaction.reactant}
                productLabel={reaction.product}
                bLabel={reaction.bReactant ?? "B"}
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
              <SecondOrderVisualizer
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
                highlightTimeControls={tutorialStep === 1 || tutorialStep === 11}
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
                concB={isAB ? concAtT : productAtT}
                concC={isAB ? productAtT : undefined}
                cColor={isAB ? reaction.productColor : undefined}
                cLabel={isAB ? reaction.product : undefined}
                initialConc={initialConc}
                reactantColor={reaction.color}
                productColor={isAB ? (reaction.bColor ?? "#f43f5e") : reaction.productColor}
                reactantLabel={reaction.reactant}
                productLabel={isAB ? (reaction.bReactant ?? "B") : reaction.product}
              />
            </div>
          </div>
        </div>

        {/* ── ROW 2: 1/[A] | Equations | Guide ─────────────────── */}
        <div className="flex flex-col lg:flex-row items-stretch gap-2 xl:flex-1 xl:min-h-0">

          {/* 1/[A] vs t CHART */}
          <div className="w-full lg:w-[28%] lg:flex-shrink-0
            rounded-xl border border-border bg-card p-3 flex flex-col
            min-h-[240px] lg:min-h-0">
            <div className="h-[220px] lg:flex-1 lg:min-h-0">
              <InvAChart
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
              Second-Order Kinetics Equations
            </p>
            <div className="flex-1 min-h-0 flex flex-col">
              <DynamicMath
                k={k}
                initialConc={initialConc}
                tCurrent={tCurrent}
                concAtT={concAtT}
                invAatT={invAatT}
                halfLife={halfLife}
                reactantLabel={reaction.reactant}
                bReactantLabel={reaction.bReactant}
                tutorialStep={tutorialStep}
                rateDisplay={reaction.rateDisplay}
              />
            </div>
          </div>

          {/* GUIDE / MASCOT */}
          <div className="w-full lg:flex-1 overflow-hidden
            rounded-xl border border-border bg-card flex flex-col p-3 gap-2
            min-h-[240px] lg:min-h-0">
            <div className="flex items-start gap-3 flex-1 min-h-0 overflow-hidden">
              <BeakerMascot
                mood={tutorial.mascotMood as MascotMood}
                size={64}
                className="shrink-0 self-end"
              />
              <div className="flex-1 min-h-0 rounded-2xl bg-muted/60 border border-border p-3 relative overflow-y-auto">
                <span className="absolute -left-2 bottom-6 w-2.5 h-2.5 rotate-45 bg-muted/60 border-l border-b border-border" />
                <p className="text-sm font-semibold text-foreground leading-snug">{tutorial.title}</p>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={tutorialStep}
                    className="text-xs text-muted-foreground mt-1.5 leading-relaxed whitespace-pre-line"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                  >
                    {highlightChemVars(tutorial.body)}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>

            {/* Nav row */}
            <div className="flex items-center justify-between border-t border-border pt-2 shrink-0">
              <button
                onClick={() => {
                  if (isAutoPlayStep(tutorialStep)) { setPlaying(false); setTCurrent(0); }
                  setTutorialStep((s) => Math.max(0, s - 1));
                }}
                disabled={tutorialStep === 0}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>

              <div className="flex gap-1.5">
                {Array.from({ length: dotEnd - dotStart + 1 }, (_, i) => (
                  <button key={i} onClick={() => setTutorialStep(dotStart + i)}
                    className="w-1.5 h-1.5 rounded-full transition-colors"
                    style={{
                      backgroundColor: dotStart + i === tutorialStep
                        ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)",
                    }} />
                ))}
              </div>

              {isLastStep ? (
                <button onClick={() => { clearSession(); onStartPractice(); }}
                  className="flex items-center gap-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-1.5 transition-colors">
                  Start Practice
                  <Zap className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (isAutoPlayStep(tutorialStep)) { setPlaying(false); setTCurrent(MAX_TIME); }
                    setTutorialStep((s) => s + 1);
                  }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

        </div>{/* end row 2 */}

      </div>
    </div>
  );
}
