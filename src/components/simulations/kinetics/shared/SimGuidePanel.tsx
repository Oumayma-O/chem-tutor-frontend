/**
 * Shared mascot guide panel used by all three kinetics simulations.
 *
 * Renders the BeakerMascot, animated tutorial text, pagination dots,
 * and Back / Next / Start-Practice navigation.
 *
 * The parent is responsible for composing onBack / onNext handlers
 * (including auto-play guards) so this component stays presentational.
 */
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { BeakerMascot } from "@/components/tutor/BeakerMascot";
import type { MascotMood } from "@/components/tutor/BeakerMascot";
import { highlightChemVars } from "./chemHighlight";

interface TutorialStep {
  title: string;
  body: string;
  mascotMood: string;
}

interface Props {
  tutorial: TutorialStep;
  tutorialStep: number;
  isLastStep: boolean;
  dotStart: number;
  dotEnd: number;
  onBack: () => void;
  onNext: () => void;
  onDotClick: (step: number) => void;
  onStartPractice: () => void;
}

export function SimGuidePanel({
  tutorial, tutorialStep, isLastStep,
  dotStart, dotEnd,
  onBack, onNext, onDotClick, onStartPractice,
}: Props) {
  return (
    <div className="w-full lg:flex-1 overflow-hidden
      rounded-xl border border-border bg-card flex flex-col p-3 gap-2
      min-h-[240px] lg:min-h-0">

      {/* Mascot + speech bubble */}
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
          onClick={onBack}
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
              onClick={() => onDotClick(dotStart + i)}
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
            onClick={onNext}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
