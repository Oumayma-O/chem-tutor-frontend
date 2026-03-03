import mascotPng from "@/assets/beaker-mascot.png";
import { cn } from "@/lib/utils";

export type MascotPose =
  | "idle"
  | "explaining"
  | "encouraging"
  | "curious"
  | "celebrating"
  | "thinking"
  | "pointing"
  | "warning";

interface BeakerMascotProps {
  pose?: MascotPose;
  size?: number;
  className?: string;
  direction?: "left" | "right";
}

export function BeakerMascot({
  size = 80,
  className,
  direction = "right",
}: BeakerMascotProps) {
  return (
    <img
      src={mascotPng}
      alt="ChemTutor mascot"
      width={size}
      height={size}
      className={cn("inline-block shrink-0 select-none object-contain", className)}
      style={direction === "left" ? { transform: "scaleX(-1)" } : undefined}
      draggable={false}
    />
  );
}
