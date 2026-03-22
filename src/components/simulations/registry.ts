/**
 * Maps unit_id + lesson_index pairs to their simulation component.
 * Import lazily in SimulationPage to keep the main bundle small.
 */
import { lazy, type ComponentType } from "react";

export interface SimEntry {
  unitId: string;
  lessonIndex: number;
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.LazyExoticComponent<ComponentType<any>>;
}

export const SIM_REGISTRY: SimEntry[] = [
  {
    unitId: "ap-unit-5",
    lessonIndex: 1,
    title: "Zero-Order Kinetics",
    component: lazy(() =>
      import("./kinetics/ZeroOrderSim/index").then((m) => ({ default: m.ZeroOrderSim }))
    ),
  },
  {
    unitId: "ap-unit-5",
    lessonIndex: 2,
    title: "First-Order Reactions",
    component: lazy(() =>
      import("./kinetics/FirstOrderSim/index").then((m) => ({ default: m.FirstOrderSim }))
    ),
  },
  {
    unitId: "ap-unit-5",
    lessonIndex: 3,
    title: "Second-Order Reactions",
    component: lazy(() =>
      import("./kinetics/SecondOrderSim/index").then((m) => ({ default: m.SecondOrderSim }))
    ),
  },
];

export function getSimEntry(unitId: string, lessonIndex: number): SimEntry | undefined {
  return SIM_REGISTRY.find((s) => s.unitId === unitId && s.lessonIndex === lessonIndex);
}
