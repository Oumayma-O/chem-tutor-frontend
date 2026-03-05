import defaultPng from "@/assets/mascot/default.png";
import happyPng from "@/assets/mascot/happy.png";
import thinkingPng from "@/assets/mascot/thinking.png";
import sleepingPng from "@/assets/mascot/sleeping.png";
import relaxedPng from "@/assets/mascot/relaxed.png";
import { cn } from "@/lib/utils";

export type MascotMood = "default" | "happy" | "thinking" | "sleeping" | "relaxed";

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
};

const POSE_TO_MOOD: Record<MascotPose, MascotMood> = {
  idle: "default",
  explaining: "default",
  encouraging: "happy",
  curious: "thinking",
  celebrating: "happy",
  thinking: "thinking",
  pointing: "default",
  warning: "thinking",
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
      alt="ChemTutor mascot"
      width={size}
      height={size}
      className={cn("inline-block shrink-0 select-none object-contain", className)}
      style={direction === "left" ? { transform: "scaleX(-1)" } : undefined}
      draggable={false}
    />
  );
}
