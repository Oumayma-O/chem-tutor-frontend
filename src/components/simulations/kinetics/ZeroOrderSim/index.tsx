/**
 * Zero-Order Kinetics — interactive simulation.
 *
 * Desktop layout (2 rows):
 *   Row 1: [Beaker ~27%] [Line chart flex-1] [Bar chart ~150px]
 *   Row 2: [Equations flex-1]  [Mascot guide ~42%]
 *
 * Mobile: every panel is w-full and stacks vertically.
 */
import React, { useState, useEffect, useRef, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, Settings2, Zap } from "lucide-react";
import { BeakerMascot } from "@/components/tutor/BeakerMascot";
import type { MascotMood } from "@/components/tutor/BeakerMascot";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useKinetics } from "./useKinetics";
import { Visualizer } from "./Visualizer";
import { DynamicMath } from "./DynamicMath";
import { ParticulateBeaker } from "../shared/ParticulateBeaker";
import { ConcentrationBarChart } from "../shared/ConcentrationBarChart";
import { REACTIONS, TUTORIAL_STEPS, INITIAL_CONC, MAX_TIME } from "./content";

interface Props {
  onBackToOverview: () => void;
  onStartPractice: () => void;
}

// ── Chemistry variable highlighter ───────────────────────────────────
const CHEM_VAR_RE = /(\[[\w]+\][₀]?(?:\s*=\s*[\d.]+\s*\w+)?|k\s*=\s*[\d.]+(?:\s*[\w·⁻¹]+)*|t½\s*=\s*[\d.∞]+\s*\w*|−[\d.]+)/g;

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

  // Auto-open parameters at tutorial steps that need it
  useEffect(() => {
    if (tutorialStep === 1 || tutorialStep === 9 || tutorialStep === 12) setSettingsOpen(true);
  }, [tutorialStep]);

  // Auto-open reaction dropdown at steps 7 and 12
  useEffect(() => {
    setReactionDropdownOpen(tutorialStep === 7 || tutorialStep === 12);
  }, [tutorialStep]);

  // Close settings on outside click
  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node))
        setSettingsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [settingsOpen]);

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

  // Pagination dots for current reaction only
  const reactionIdx = REACTIONS.findIndex((r) => r.id === reactionId);
  const dotStart    = reaction.firstTutorialStep;
  const dotEnd      = REACTIONS[reactionIdx + 1]
    ? REACTIONS[reactionIdx + 1].firstTutorialStep - 1
    : TUTORIAL_STEPS.length - 1;

  return (
    <div className="w-full max-w-[1600px] mx-auto">

      {/* ── Sticky control bar ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 px-4 lg:px-6 py-3 border-b border-border bg-white dark:bg-card w-full sticky top-0 z-10">

        <button
          onClick={() => { clearSession(); onBackToOverview(); }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Overview
        </button>

        <div className="h-4 w-px bg-border" />

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

      {/* ── Content wrapper ──────────────────────────────────────────────
           Mobile  (<md):  everything stacks
           Tablet  (md–xl): top row = Beaker|Bar flex-wrap; Line below; Eq|Guide row
           Desktop (≥xl):  Beaker|Line(flex-1)|Bar in one row; Eq|Guide below
           Ultra-wide: max-w-[1600px] on outer wrapper keeps proportions    */}
      <div className="w-full px-4 xl:px-10 py-4 flex flex-col gap-3
        xl:h-[calc(100vh-110px)] xl:overflow-hidden">

        {/* ── TOP ROW: Beaker | Line Chart | Bar Chart ─────────────────
             Tablet:  Beaker + Bar side-by-side (50/50), Line below (order-3)
             Desktop: Beaker (26%) | Line (flex-1) | Bar (14%) in one row   */}
        <div className="flex flex-wrap xl:flex-nowrap items-stretch gap-3 xl:flex-[3] xl:min-h-0">

          {/* BEAKER — tablet left col, desktop far-left */}
          <div className="order-1 xl:order-1
            w-full md:w-[calc(50%-6px)] xl:flex-shrink-0 xl:w-1/4 xl:h-full
            rounded-xl border border-border bg-card p-3 flex flex-col
            max-h-[360px] xl:max-h-none">
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

          {/* BAR CHART — tablet right col, desktop far-right */}
          <div className="order-2 xl:order-3
            w-full md:w-[calc(50%-6px)] xl:flex-shrink-0 xl:w-1/4 xl:h-full
            rounded-xl border border-border bg-card p-3 flex flex-col
            max-h-[360px] xl:max-h-none">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 shrink-0">
              Current [conc]
            </p>
            <div className="flex-1 min-h-0">
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

          {/* LINE CHART — tablet full-width second row, desktop center */}
          <div className={`order-3 xl:order-2
            w-full xl:flex-1 xl:min-w-[400px] xl:h-full
            rounded-xl border bg-card p-3 flex flex-col
            md:min-h-[220px] md:max-h-[420px] xl:max-h-none
            transition-all duration-300 ${
              tutorialStep === 6
                ? "border-blue-400 dark:border-blue-500 ring-2 ring-blue-300 dark:ring-blue-600 ring-offset-1"
                : "border-border"
            }`}>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 shrink-0">
              [Concentration] vs Time
            </p>
            <div className="h-[260px] md:h-auto md:flex-1 md:min-h-0">
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
        <div className="flex flex-col md:flex-row gap-3 xl:flex-[2] xl:min-h-0">

          {/* EQUATIONS */}
          <div className="md:flex-[1.5] xl:min-h-0
            rounded-xl border border-border bg-card px-3 py-2.5 flex flex-col gap-2">
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
          <div className="md:flex-1 min-h-0 overflow-hidden
            rounded-xl border border-border bg-card flex flex-col p-4 gap-3">
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
            <div className="flex items-center justify-between border-t border-border pt-3 shrink-0">
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
                  <button
                    key={i}
                    onClick={() => setTutorialStep(dotStart + i)}
                    className="w-1.5 h-1.5 rounded-full transition-colors"
                    style={{
                      backgroundColor:
                        dotStart + i === tutorialStep
                          ? "hsl(var(--primary))"
                          : "hsl(var(--muted-foreground) / 0.3)",
                    }}
                  />
                ))}
              </div>

              {isLastStep ? (
                <button
                  onClick={() => { clearSession(); onStartPractice(); }}
                  className="flex items-center gap-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-1.5 transition-colors"
                >
                  Start Practice
                  <Zap className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (isAutoPlayStep(tutorialStep)) {
                      setPlaying(false);
                      setTCurrent(MAX_TIME);
                    }
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

        </div>{/* end bottom row */}

      </div>
    </div>
  );
}
