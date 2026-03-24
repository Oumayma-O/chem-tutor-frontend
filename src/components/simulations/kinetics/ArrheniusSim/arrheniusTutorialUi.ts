import { TUTORIAL_STEPS, type TutorialHighlight } from "./content";

/** Visual + interaction state derived from `tutorialStep` index. */
export interface ArrheniusTutorialUiState {
  step: number;
  highlights: TutorialHighlight[];
  ringClass: string;
  lockTemperatureSlider: boolean;
  lockCatalystVials: boolean;
  lockPlayButton: boolean;
  shouldAutoPlayBeaker: boolean;
  collisionProbabilityScale: number;
  particleSpeedScale: number;
  flameTutorialBoost: number;
  pulseEnergyProfileEa: boolean;
  pulseEnergyProfileDeltaH: boolean;
  pulseAverageKeLine: boolean;
  animateCatalysedPathDraw: boolean;
  animateArrheniusDot: boolean;
  showSlopeTriangle: boolean;
}

const RING_BASE =
  "ring-2 ring-blue-400/80 dark:ring-blue-500/70 ring-offset-1 ring-offset-background " +
  "shadow-[0_0_0_1px_rgba(59,130,246,0.1),0_0_14px_-4px_rgba(59,130,246,0.22)]";

/** Default tutorial ring for Arrhenius panels. */
const RING = `rounded-xl ${RING_BASE}`;

/** Same style as panel ring, adapted to beaker wrapper radius. */
export const TUTORIAL_RING_BEAKER = `rounded-lg ${RING_BASE}`;

/** Same style as panel ring, adapted to equation card radius. */
export const TUTORIAL_RING_EQUATION_PILL = `rounded-lg ${RING_BASE}`;

export function highlightsForStep(step: number): TutorialHighlight[] {
  const meta = TUTORIAL_STEPS[step];
  if (!meta?.highlight) return [];
  return Array.isArray(meta.highlight) ? meta.highlight : [meta.highlight];
}

export function getArrheniusTutorialUiState(
  tutorialStep: number,
  temperature: number,
): ArrheniusTutorialUiState {
  const step = Math.max(0, Math.min(tutorialStep, TUTORIAL_STEPS.length - 1));
  const hl = highlightsForStep(step);

  const lockTemperatureSlider = step < 15;
  const lockCatalystVials = step < 13;
  const lockPlayButton = step === 0;
  const shouldAutoPlayBeaker = step >= 1 && step <= 2;

  let collisionProbabilityScale = 1;
  if (step <= 2) collisionProbabilityScale = 0.12;
  else if (step === 16 && temperature >= 400) collisionProbabilityScale = 2.8;
  else if (step === 16 && temperature >= 350) collisionProbabilityScale = 1.6;

  let particleSpeedScale = 1;
  if (step === 16 && temperature >= 420) particleSpeedScale = 1.45;
  else if (step === 16 && temperature >= 380) particleSpeedScale = 1.22;

  let flameTutorialBoost = 0;
  if (step >= 15) flameTutorialBoost = Math.min(0.35, Math.max(0, (temperature - 298) / 900));
  if (step === 16 && temperature >= 400) flameTutorialBoost += 0.2;

  return {
    step,
    highlights: hl,
    ringClass: RING,
    lockTemperatureSlider,
    lockCatalystVials,
    lockPlayButton,
    shouldAutoPlayBeaker,
    collisionProbabilityScale,
    particleSpeedScale,
    flameTutorialBoost,
    pulseEnergyProfileEa: step >= 9 && step <= 11,
    pulseEnergyProfileDeltaH: step >= 10 && step <= 11,
    pulseAverageKeLine: step >= 16,
    animateCatalysedPathDraw: step >= 14,
    animateArrheniusDot: step === 16,
    showSlopeTriangle: step >= 7 && step <= 8,
  };
}

/** Single helper for “does this tutorial step highlight this UI target?” */
export function hasTutorialHighlight(
  highlights: TutorialHighlight[],
  target: TutorialHighlight,
): boolean {
  return highlights.includes(target);
}
