/**
 * Zero-Order Kinetics — interactive simulation.
 *
 * TWO STRICT LAYOUTS — no mixing:
 *
 * Mobile (< xl): flex-col, infinite vertical scroll
 *   [Beaker] [Line chart] [Bar chart] [Equations] [Guide] — each w-full
 *
 * Desktop (≥ xl): grid-cols-12, fits entirely on one screen (max-h viewport)
 *   Col 1 (span-4): Beaker (h-45%) + Equations (h-55%)
 *   Col 2 (span-8): Charts row (h-60%) + Guide (h-40%)
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
    setInitialConc(reaction.defaultConc);
    setTCurrent(0);
    setPlaying(false);
  }

  useEffect(() => {
    if (tutorialStep === 1 || tutorialStep === 9 || tutorialStep === 12) setSettingsOpen(true);
  }, [tutorialStep]);

  useEffect(() => {
    setReactionDropdownOpen(tutorialStep === 7 || tutorialStep === 12);
  }, [tutorialStep]);

  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node))
        setSettingsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [settingsOpen]);

  const isAutoPlayStep = (s: number) => s === 5 || s === 10 || s === 14;
  const prevTutorialStep = useRef(tutorialStep);
  useEffect(() => {
    const prev = prevTutorialStep.current;
    prevTutorialStep.current = tutorialStep;
    if (isAutoPlayStep(tutorialStep)) {
      setTCurrent(0);
      setPlaying(true);
    } else if (isAutoPlayStep(prev)) {
      setPlaying(false);
      setTCurrent(0);
    }
  }, [tutorialStep]);

  useEffect(() => {
    if (isAutoPlayStep(tutorialStep) && tCurrent >= MAX_TIME)
      setTutorialStep((s) => s + 1);
  }, [tutorialStep, tCurrent]);

  const reactionIdx = REACTIONS.findIndex((r) => r.id === reactionId);
  const dotStart    = reaction.firstTutorialStep;
  const dotEnd      = REACTIONS[reactionIdx + 1]
    ? REACTIONS[reactionIdx + 1].firstTutorialStep - 1
    : TUTORIAL_STEPS.length - 1;

  return (
    <div className="w-full">

      {/* ── Sticky control bar ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 px-4 lg:px-6 py-3 border-b border-border bg-white dark:bg-card w-full sticky top-0 z-10">
        <button
          onClick={onBackToOverview}
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
          onClick={onStartPractice}
          className="ml-auto flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
        >
          Skip to Practice
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Dual-state content wrapper ───────────────────────────────────
           Mobile: flex-col → vertical scroll
           Desktop (≥xl): grid-cols-12 → locked to one viewport height    */}
      <div className="w-full max-w-[1400px] mx-auto px-4 py-4 flex flex-col xl:grid xl:grid-cols-12 gap-4 xl:gap-6 xl:max-h-[calc(100vh-140px)]">

        {/* ── COLUMN 1 (xl:col-span-4): Beaker + Equations ─────────────── */}
        <div className="w-full xl:col-span-4 flex flex-col gap-4 xl:min-h-0">

          {/* Beaker */}
          <div className="w-full xl:flex-[45] rounded-xl border border-border bg-card p-3 flex flex-col min-h-[300px] xl:min-h-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 shrink-0">
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

          {/* Equations */}
          <div className="w-full xl:flex-[55] rounded-xl border border-border bg-card px-3 py-2 flex flex-col gap-2 xl:min-h-0 xl:overflow-y-auto">
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
        </div>

        {/* ── COLUMN 2 (xl:col-span-8): Charts + Guide ─────────────────── */}
        <div className="w-full xl:col-span-8 flex flex-col gap-4 xl:min-h-0">

          {/* Charts row: Line chart + Bar chart */}
          <div className="flex flex-col sm:flex-row gap-4 xl:flex-[60] xl:min-h-0">

            {/* Line chart — explicit mobile height so Recharts renders */}
            <div className={`flex-1 w-full min-h-[300px] sm:min-h-[350px] xl:min-h-0 rounded-xl border bg-card p-3 flex flex-col transition-all duration-300 ${
              tutorialStep === 6
                ? "border-blue-400 dark:border-blue-500 ring-2 ring-blue-300 dark:ring-blue-600 ring-offset-1"
                : "border-border"
            }`}>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 shrink-0">
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

            {/* Bar chart — full width on mobile, 200px on sm+ */}
            <div className="w-full sm:w-[200px] shrink-0 min-h-[300px] sm:min-h-0 rounded-xl border border-border bg-card p-3 flex flex-col">
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
          </div>

          {/* Guide / mascot — takes remaining height on desktop */}
          <div className="w-full xl:flex-[40] xl:min-h-0 rounded-xl border border-border bg-card flex flex-col p-4 gap-3 min-h-[260px]">
            <div className="flex items-start gap-3 flex-1 min-h-0">
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
                  onClick={onStartPractice}
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
        </div>

      </div>
    </div>
  );
}
