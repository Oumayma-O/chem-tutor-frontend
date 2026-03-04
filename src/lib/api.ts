/**
 * Public API surface — re-exports from domain modules.
 * All existing imports from "@/lib/api" continue to work unchanged.
 *
 * To import only what you need:
 *   import { apiGetMastery } from "@/lib/api/mastery"
 *   import { apiGenerateProblemV2 } from "@/lib/api/problems"
 */
export * from "./api/core";
export * from "./api/auth";
export * from "./api/units";
export * from "./api/problems";
export * from "./api/mastery";
