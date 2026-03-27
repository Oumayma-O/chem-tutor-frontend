import defaultPng from "@/assets/mascot/moods/default.png";
import happyPng from "@/assets/mascot/moods/happy.png";
import thinkingPng from "@/assets/mascot/moods/thinking.png";
import sleepingPng from "@/assets/mascot/moods/sleeping.png";
import relaxedPng from "@/assets/mascot/moods/relaxed.png";
import sadPng from "@/assets/mascot/moods/sad.png";
import explainingPng from "@/assets/mascot/moods/explaining.png";
import excitedPng from "@/assets/mascot/moods/excited.png";
import pointingPng from "@/assets/mascot/moods/pointing.png";
import solverPng from "@/assets/mascot/blueprints/solver.png";
import recipePng from "@/assets/mascot/blueprints/recipe.png";
import architectPng from "@/assets/mascot/blueprints/architect.png";
import detectivePng from "@/assets/mascot/blueprints/detective.png";
import lawyerPng from "@/assets/mascot/blueprints/lawyer.png";
import { cn } from "@/lib/utils";
import type { CognitiveBlueprint } from "@/types/chemistry";

export type MascotMood =
  | "default"
  | "happy"
  | "thinking"
  | "sleeping"
  | "relaxed"
  | "sad"
  | "explaining"
  | "excited"
  | "pointing";

export type MascotPose =
  | "idle"
  | "explaining"
  | "encouraging"
  | "curious"
  | "celebrating"
  | "thinking"
  | "pointing"
  | "warning";

const MOOD_ASSETS: Record<MascotMood, string> = {
  default: defaultPng,
  happy: happyPng,
  thinking: thinkingPng,
  sleeping: sleepingPng,
  relaxed: relaxedPng,
  sad: sadPng,
  explaining: explainingPng,
  excited: excitedPng,
  pointing: pointingPng,
};

const BLUEPRINT_ASSETS: Record<CognitiveBlueprint, string> = {
  solver: solverPng,
  recipe: recipePng,
  architect: architectPng,
  detective: detectivePng,
  lawyer: lawyerPng,
};

export function BlueprintMascot({
  blueprint,
  className,
}: {
  blueprint: CognitiveBlueprint;
  className?: string;
}) {
  return (
    <img
      src={BLUEPRINT_ASSETS[blueprint] ?? relaxedPng}
      alt={`${blueprint} mascot`}
      draggable={false}
      className={cn("select-none object-contain drop-shadow-xl", className)}
    />
  );
}

const POSE_TO_MOOD: Record<MascotPose, MascotMood> = {
  idle: "default",
  explaining: "explaining",
  encouraging: "happy",
  curious: "thinking",
  celebrating: "happy",
  thinking: "thinking",
  pointing: "default",
  warning: "sad",
};

interface BeakerMascotProps {
  pose?: MascotPose;
  mood?: MascotMood;
  size?: number;
  className?: string;
  direction?: "left" | "right";
}

export function BeakerMascot({
  pose = "idle",
  mood,
  size = 80,
  className,
  direction = "right",
}: BeakerMascotProps) {
  const resolvedMood = mood ?? POSE_TO_MOOD[pose] ?? "default";
  const src = MOOD_ASSETS[resolvedMood];

  return (
    <img
      src={src}
      alt="Catalyst mascot"
      width={size}
      height={size}
      className={cn("inline-block shrink-0 select-none object-contain", className)}
      style={direction === "left" ? { transform: "scaleX(-1)" } : undefined}
      draggable={false}
    />
  );
}

