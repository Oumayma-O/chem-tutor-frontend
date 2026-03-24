/**
 * Shared mascot guide panel used by kinetics simulations.
 *
 * Footer navigation is shared via {@link SimTutorialNavBar}.
 */
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { BeakerMascot } from "@/components/tutor/BeakerMascot";
import type { MascotMood } from "@/components/tutor/BeakerMascot";
import { highlightChemVars } from "./chemHighlight";
import { SimTutorialNavBar } from "./SimTutorialNavBar";

interface TutorialStep {
  title: string;
  body: string;
  mascotMood: string;
}

interface Props {
  tutorial: TutorialStep;
  tutorialStep: number;
  /** Total tutorial steps (for “Step i of n” and last-step padding). */
  totalStepCount: number;
  onBack: () => void;
  onNext: () => void;
  onStartPractice: () => void;
  practiceButtonClassName?: string;
  nextDisabled?: boolean;
  /**
   * Fill a fixed-height parent (e.g. Arrhenius right rail) without min-height jumps.
   * Bubble text scrolls inside; omit default lg:flex-1 and min-h-[240px].
   */
  fixedLayout?: boolean;
  /** Tighter padding + smaller mascot to leave room for content above (e.g. equation stack). */
  dense?: boolean;
}

export function SimGuidePanel({
  tutorial,
  tutorialStep,
  totalStepCount,
  onBack,
  onNext,
  onStartPractice,
  practiceButtonClassName,
  nextDisabled = false,
  fixedLayout = false,
  dense = false,
}: Props) {
  const isLastStep = tutorialStep >= Math.max(0, totalStepCount - 1);

  return (
    <div
      className={cn(
        "w-full rounded-xl border border-border bg-card flex flex-col",
        dense ? "gap-1.5 p-2.5" : "gap-2 p-3",
        fixedLayout
          ? "h-full min-h-0 flex-none overflow-hidden"
          : "lg:flex-1 min-h-[240px] lg:min-h-0 overflow-visible",
        isLastStep && "pb-4 pr-4",
      )}
    >
      <div className={cn("flex items-start flex-1 min-h-0 overflow-hidden", dense ? "gap-2" : "gap-3")}>
        <BeakerMascot
          mood={tutorial.mascotMood as MascotMood}
          size={dense ? 52 : 64}
          className="shrink-0 self-end"
        />
        <div className="flex-1 min-h-0 flex flex-col rounded-2xl bg-muted/60 border border-border relative overflow-hidden">
          <span className="absolute -left-2 bottom-6 w-2.5 h-2.5 rotate-45 bg-muted/60 border-l border-b border-border z-10" />
          <div
            className={cn(
              "overflow-y-auto min-h-0",
              dense ? "p-2.5" : "p-3",
              fixedLayout ? "flex-1 max-h-none" : "max-h-[60vh]",
            )}
          >
            <p className="text-sm font-semibold text-foreground leading-snug">{tutorial.title}</p>
            <AnimatePresence mode="wait">
              <motion.div
                key={tutorialStep}
                className="text-xs text-muted-foreground mt-1.5 leading-relaxed whitespace-pre-line"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                {highlightChemVars(tutorial.body)}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="shrink-0">
        <SimTutorialNavBar
          tutorialStep={tutorialStep}
          totalStepCount={totalStepCount}
          onBack={onBack}
          onNext={onNext}
          onStartPractice={onStartPractice}
          practiceButtonClassName={practiceButtonClassName}
          nextDisabled={nextDisabled}
        />
      </div>
    </div>
  );
}
