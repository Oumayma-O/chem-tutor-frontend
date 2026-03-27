import { useState, useEffect } from "react";
import { BeakerMascot } from "@/components/tutor/widgets";

const SUBTEXT_PHASES = [
  "Analyzing difficulty and selecting the best fit",
  "Building your personalized problem",
  "Almost ready…",
];

const MOLECULE_COUNT = 4;
const ORBIT_RADIUS = 38;
const DOT_SIZE = 5;

export function ProblemLoadingState() {
  const [showFullLoader, setShowFullLoader] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setShowFullLoader(true), 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!showFullLoader) return;
    const id = setInterval(() => {
      setPhaseIndex((i) => (i + 1) % SUBTEXT_PHASES.length);
    }, 1800);
    return () => clearInterval(id);
  }, [showFullLoader]);

  if (!showFullLoader) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">Preparing your problem...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative flex flex-col items-center">
        <div
          className="relative flex items-center justify-center pointer-events-none"
          style={{ width: (ORBIT_RADIUS + DOT_SIZE) * 2, height: (ORBIT_RADIUS + DOT_SIZE) * 2 }}
          aria-hidden
        >
          {Array.from({ length: MOLECULE_COUNT }).map((_, i) => {
            const orbitDelay = (i / MOLECULE_COUNT) * 6;
            const pulseDelay = (i / MOLECULE_COUNT) * 1.5;
            return (
              <div
                key={i}
                className="absolute rounded-full bg-primary"
                style={{
                  width: DOT_SIZE,
                  height: DOT_SIZE,
                  top: "50%",
                  left: "50%",
                  marginLeft: -ORBIT_RADIUS - DOT_SIZE / 2,
                  marginTop: -DOT_SIZE / 2,
                  transformOrigin: `${ORBIT_RADIUS + DOT_SIZE / 2}px ${DOT_SIZE / 2}px`,
                  animation: `molecule-orbit 6s linear ${orbitDelay}s infinite, dot-pulse 1.5s ease-in-out ${pulseDelay}s infinite`,
                }}
              />
            );
          })}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="mascot-breathe">
              <BeakerMascot mood="thinking" size={52} className="opacity-95" />
            </div>
          </div>
        </div>

        <div className="mt-6 text-center space-y-1 min-w-[200px]">
          <p className="text-sm font-semibold text-foreground">
            Preparing your problem...
          </p>
          <p
            className="text-xs text-muted-foreground min-h-[1.25rem] transition-opacity duration-300"
            key={phaseIndex}
          >
            {SUBTEXT_PHASES[phaseIndex]}
          </p>
        </div>
      </div>
    </div>
  );
}

