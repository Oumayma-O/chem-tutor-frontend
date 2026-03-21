/**
 * Zero-Order Kinetics — interactive simulation.
 *
 * Layout (2 rows, no scroll):
 *
 *   ┌─ control strip ──────────────────────────────────────────────┐
 *   ├─ TOP ROW (≈55 % height) ──────────────────────────────────────┤
 *   │  Beaker (28 %)  │  Line chart + time control (flex-1)  │  Bar chart (22 %)  │
 *   ├─ BOTTOM ROW (flex-1) ─────────────────────────────────────────┤
 *   │  Equations + params (55 %)       │  Mascot chat (45 %)        │
 *   └──────────────────────────────────────────────────────────────┘
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
import { ParticulateBeaker } from "./ParticulateBeaker";
import { ConcentrationBarChart } from "./ConcentrationBarChart";
import { REACTIONS, TUTORIAL_STEPS, INITIAL_CONC, MAX_TIME } from "./content";

interface Props {
  onBackToOverview: () => void;
  onStartPractice: () => void;
}


// ── Chemistry variable highlighter ───────────────────────────────────
// Matches: k = 0.07, [A]₀ = 1.0 M, t½ = 7.14 s, [C]₀, slope (−0.03)
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

export function ZeroOrderSim({ onBackToOverview, onStartPractice }: Props) {
  const [reactionId, setReactionId]     = useState(REACTIONS[0].id);
  const [initialConc, setInitialConc]   = useState(INITIAL_CONC);
  const [tCurrent, setTCurrent]         = useState(0);
  const [playing, setPlaying]           = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reactionDropdownOpen, setReactionDropdownOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const reaction = REACTIONS.find((r) => r.id === reactionId) ?? REACTIONS[0];
  const k = reaction.k;
  const { series, concAtT, productAtT, halfLife, fractionA } = useKinetics(k, initialConc, tCurrent);
  const tutorial  = TUTORIAL_STEPS[tutorialStep];
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
    setInitialConc(reaction.defaultConc);
    setTCurrent(0);
    setPlaying(false);
  }

  // Auto-open parameters panel at steps 0 and 7
  useEffect(() => {
    if (tutorialStep === 1 || tutorialStep === 9 || tutorialStep === 12) setSettingsOpen(true);
  }, [tutorialStep]);

  // Auto-open reaction dropdown at steps 7 and 12
  useEffect(() => {
    setReactionDropdownOpen(tutorialStep === 7 || tutorialStep === 12);
  }, [tutorialStep]);

  // Close settings popover on outside click
  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [settingsOpen]);

  // Auto-play steps: forward OR back-to-step → replay from 0; leaving → abort
  const isAutoPlayStep = (s: number) => s === 5 || s === 10 || s === 14;
  const prevTutorialStep = useRef(tutorialStep);
  useEffect(() => {
    const prev = prevTutorialStep.current;
    prevTutorialStep.current = tutorialStep;

    if (isAutoPlayStep(tutorialStep)) {
      // Arrived at auto-play step (forward or back): always replay from 0
      setTCurrent(0);
      setPlaying(true);
    } else if (isAutoPlayStep(prev)) {
      // Left an auto-play step (back to pre-step): abort cleanly
      setPlaying(false);
      setTCurrent(0);
    }
  }, [tutorialStep]);

  // Auto-advance when animation finishes at steps 5 and 10
  useEffect(() => {
    if ((tutorialStep === 5 || tutorialStep === 10 || tutorialStep === 14) && tCurrent >= MAX_TIME) {
      setTutorialStep((s) => s + 1);
    }
  }, [tutorialStep, tCurrent]);

  return (
    <div className="w-full h-full max-w-[1400px] mx-auto relative">

      {/* Skip to Practice — top-right corner */}
      <button
        onClick={onStartPractice}
        className="absolute top-0 right-0 z-10 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 rounded-full px-3 py-1 transition-all bg-white/60 dark:bg-white/5 hover:bg-white/90 dark:hover:bg-white/10 backdrop-blur-sm"
      >
        Skip to Practice
        <ChevronRight className="w-3 h-3" />
      </button>

    <div className="flex flex-col h-full gap-2 min-h-0">

      {/* ── Control strip ──────────────────────────────────── */}
      <div className="flex items-center gap-3 px-1 shrink-0 flex-wrap">
        <button
          onClick={onBackToOverview}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Overview
        </button>

        <div className="h-4 w-px bg-border" />

        {/* Reaction dropdown */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Reaction:
          <Select
            value={reactionId}
            onValueChange={handleReactionChange}
            open={reactionDropdownOpen}
            onOpenChange={setReactionDropdownOpen}
          >
            <SelectTrigger className={`h-6 text-xs w-32 rounded-md transition-all duration-300 ${
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

        {/* Settings toggle + floating popover */}
        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => setSettingsOpen((o) => !o)}
            className={`flex items-center gap-1 text-xs border rounded px-2 py-0.5 transition-colors ${
              settingsOpen
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            } ${tutorialStep === 1 ? "ring-2 ring-primary ring-offset-1 " : ""}`}
          >
            <Settings2 className="w-3 h-3" />
            Parameters
          </button>

          {/* Floating popover — does not push layout */}
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

      </div>

      {/* ── Top row: Beaker | Line chart | Bar chart ────────── */}
      <div className="flex gap-3 min-h-0" style={{ flex: "0 0 52%" }}>

        {/* Beaker */}
        <div className="rounded-xl border border-border bg-card/40 p-2 flex flex-col min-h-0"
          style={{ width: "27%" }}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1 shrink-0">
            Particulate View
          </p>
          <div className="flex-1 min-h-0">
            <ParticulateBeaker
              fractionA={fractionA}
              reactantColor={reaction.color}
              productColor={reaction.productColor}
              reactantLabel={reaction.reactant}
              productLabel={reaction.product}
            />
          </div>
        </div>

        {/* Line chart + time control */}
        <div className={`flex-1 rounded-xl border bg-card/40 p-2 min-h-0 flex flex-col transition-all duration-300 ${
          tutorialStep === 6 ? "border-blue-400 dark:border-blue-500 ring-2 ring-blue-300 dark:ring-blue-600 ring-offset-1" : "border-border"
        }`}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1 shrink-0">
            [Concentration] vs Time
          </p>
          <div className="flex-1 min-h-0">
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

        {/* Bar chart */}
        <div className="rounded-xl border border-border bg-card/40 p-2 flex flex-col min-h-0"
          style={{ width: "21%" }}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1 shrink-0">
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
      </div>

      {/* ── Bottom row: Equations | Mascot ─────────────────── */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* Equations */}
        <div className="rounded-xl border border-border bg-card/40 px-4 py-3 flex-1 min-h-0 flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground shrink-0">
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

        {/* Mascot chat */}
        <div className="rounded-xl border border-border bg-card flex flex-col p-4 gap-3 min-h-0"
          style={{ width: "42%" }}>

          {/* Mascot + bubble */}
          <div className="flex items-start gap-3 flex-1 min-h-0">
            <BeakerMascot
              mood={tutorial.mascotMood as MascotMood}
              size={64}
              className="shrink-0 self-end"
            />

            {/* Speech bubble */}
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
              {(() => {
                const reactionIdx = REACTIONS.findIndex((r) => r.id === reactionId);
                const start = reaction.firstTutorialStep;
                const end = REACTIONS[reactionIdx + 1]
                  ? REACTIONS[reactionIdx + 1].firstTutorialStep - 1
                  : TUTORIAL_STEPS.length - 1;
                return Array.from({ length: end - start + 1 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setTutorialStep(start + i)}
                    className="w-1.5 h-1.5 rounded-full transition-colors"
                    style={{
                      backgroundColor:
                        start + i === tutorialStep
                          ? "hsl(var(--primary))"
                          : "hsl(var(--muted-foreground) / 0.3)",
                    }}
                  />
                ));
              })()}
            </div>

            {isLastStep ? (
              <button
                onClick={onStartPractice}
                className="flex items-center gap-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-1.5 transition-colors"
              >
                Start Practice
                <Zap className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => {
                  if (tutorialStep === 5 || tutorialStep === 10 || tutorialStep === 14) {
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
      </div>
    </div>
    </div>
  );
}
