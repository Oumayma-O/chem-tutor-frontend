import { useEffect, type RefObject } from "react";

/**
 * Calls `onClose` when a mousedown event is detected outside `ref`.
 * Used by all kinetics sims to close the Parameters panel.
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void
) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose, ref]);
}
