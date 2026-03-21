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
import { useState } from "react";
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
import { REACTIONS, TUTORIAL_STEPS, INITIAL_CONC } from "./content";

interface Props {
  onBackToOverview: () => void;
  onStartPractice: () => void;
}

/* ── Compact ± stepper ─────────────────────────────────────────────── */
function Stepper({
  label,
  value,
  unit,
  onDec,
  onInc,
}: {
  label: string;
  value: string;
  unit: string;
  onDec: () => void;
  onInc: () => void;
}) {
  const btn =
    "w-5 h-5 flex items-center justify-center rounded border border-border " +
    "text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 text-sm leading-none";
  return (
    <span className="flex items-center gap-1 text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <button className={btn} onClick={onDec}>−</button>
      <span className="font-mono tabular-nums w-11 text-center text-foreground">{value}</span>
      <button className={btn} onClick={onInc}>+</button>
      <span className="text-muted-foreground">{unit}</span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────

export function ZeroOrderSim({ onBackToOverview, onStartPractice }: Props) {
  const [reactionId, setReactionId]     = useState(REACTIONS[0].id);
  const [k, setK]                       = useState(REACTIONS[0].k);
  const [initialConc, setInitialConc]   = useState(INITIAL_CONC);
  const [tCurrent, setTCurrent]         = useState(0);
  const [playing, setPlaying]           = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const reaction = REACTIONS.find((r) => r.id === reactionId) ?? REACTIONS[0];
  const { series, concAtT, productAtT, halfLife, fractionA } = useKinetics(k, initialConc, tCurrent);
  const tutorial  = TUTORIAL_STEPS[tutorialStep];
  const isLastStep = tutorialStep === TUTORIAL_STEPS.length - 1;

  function handleReactionChange(id: string) {
    const r = REACTIONS.find((rx) => rx.id === id);
    if (!r) return;
    setReactionId(id);
    setK(r.k);
    setTCurrent(0);
    setPlaying(false);
  }

  function handleReset() {
    setK(reaction.k);
    setInitialConc(INITIAL_CONC);
    setTCurrent(0);
    setPlaying(false);
  }

  const step = (delta: number, setter: (fn: (v: number) => number) => void, min: number, max: number, digits: number) =>
    setter((v) => parseFloat(Math.max(min, Math.min(max, v + delta)).toFixed(digits)));

  return (
    <div className="w-full h-full max-w-[1400px] mx-auto">
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
          <Select value={reactionId} onValueChange={handleReactionChange}>
            <SelectTrigger className="h-6 text-xs w-32 rounded-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REACTIONS.map((r) => (
                <SelectItem key={r.id} value={r.id} className="text-xs">{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="h-4 w-px bg-border" />

        {/* Settings toggle */}
        <button
          onClick={() => setSettingsOpen((o) => !o)}
          className={`flex items-center gap-1 text-xs border rounded px-2 py-0.5 transition-colors ${
            settingsOpen
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Settings2 className="w-3 h-3" />
          Parameters
        </button>

        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* ── Settings panel (collapsible) ───────────────────── */}
      {settingsOpen && (
        <div className="flex items-center gap-4 px-2 py-2 rounded-lg border border-border bg-muted/40 shrink-0 flex-wrap">
          <Stepper
            label="k"
            value={k.toFixed(3)}
            unit="mol·L⁻¹s⁻¹"
            onDec={() => step(-0.005, setK, 0.01, 0.20, 3)}
            onInc={() => step( 0.005, setK, 0.01, 0.20, 3)}
          />
          <div className="h-4 w-px bg-border" />
          <Stepper
            label={`[${reaction.reactant}]₀`}
            value={initialConc.toFixed(2)}
            unit="mol/L"
            onDec={() => { step(-0.10, setInitialConc, 0.20, 2.00, 2); setTCurrent(0); }}
            onInc={() => { step( 0.10, setInitialConc, 0.20, 2.00, 2); setTCurrent(0); }}
          />
        </div>
      )}

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
        <div className="flex-1 rounded-xl border border-border bg-card/40 p-2 min-h-0 flex flex-col">
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
        <div className="rounded-xl border border-border bg-card/40 px-4 py-3 flex-1 min-h-0">
          <DynamicMath
            k={k}
            initialConc={initialConc}
            tCurrent={tCurrent}
            concAtT={concAtT}
            halfLife={halfLife}
            reactantLabel={reaction.reactant}
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
                  {tutorial.body}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* Nav row */}
          <div className="flex items-center justify-between border-t border-border pt-3 shrink-0">
            <button
              onClick={() => setTutorialStep((s) => Math.max(0, s - 1))}
              disabled={tutorialStep === 0}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <div className="flex gap-1.5">
              {TUTORIAL_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setTutorialStep(i)}
                  className="w-1.5 h-1.5 rounded-full transition-colors"
                  style={{
                    backgroundColor:
                      i === tutorialStep
                        ? "hsl(var(--primary))"
                        : "hsl(var(--muted-foreground) / 0.3)",
                  }}
                />
              ))}
            </div>

            {isLastStep ? (
              <button
                onClick={onStartPractice}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:opacity-80 transition-opacity"
              >
                Start Practice
                <Zap className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => setTutorialStep((s) => s + 1)}
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
