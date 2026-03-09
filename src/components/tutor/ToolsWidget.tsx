import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FlaskConical, Calculator as CalcIcon, Atom, X } from "lucide-react";
import { Calculator } from "./Calculator";
import { PeriodicTablePanel } from "./PeriodicTablePanel";
import { cn } from "@/lib/utils";

// fab visual state: idle | menu | close
type FabState = "idle" | "menu" | "close";

const RADIUS = 72; // px — arc radius
const FAB_SIZE = 48;
const FAB_RIGHT = 24;
const FAB_BOTTOM = 24;

// Spread N tool buttons in a 90° arc from "left" (π) to "up" (π/2)
function fanOffset(i: number, total: number): { x: number; y: number } {
  const start = Math.PI;       // 180° → left
  const end   = Math.PI / 2;  // 90°  → up
  const angle = total === 1
    ? (start + end) / 2        // single tool: diagonal
    : start + (end - start) * (i / (total - 1));
  return {
    x: Math.round(RADIUS * Math.cos(angle)),   // negative = left
    y: Math.round(-RADIUS * Math.sin(angle)),  // negative = up (CSS y-flip)
  };
}

export const TOOL_KEYS = ["calculator", "periodic_table"] as const;
export type ToolKey = (typeof TOOL_KEYS)[number];

interface ToolDef {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface ToolsWidgetProps {
  requiredTools?: string[];
}

export function ToolsWidget({ requiredTools = [] }: ToolsWidgetProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const hasPeriodicTable = requiredTools.some((t) => {
    const normalized = String(t).toLowerCase().replace(/[\s-_]/g, "");
    return normalized === "periodictable";
  });

  /** True if the only required tool is the calculator (or none specified) → show Calculator icon on FAB. */
  const isCalculatorOnly =
    requiredTools.length === 0 ||
    (requiredTools.length === 1 &&
      (() => {
        const n = String(requiredTools[0]).toLowerCase().replace(/[\s-_]/g, "");
        return n === "calculator" || n === "calc";
      })());

  const availableTools: ToolDef[] = [
    { id: "calculator", label: "Calculator", icon: <CalcIcon className="w-5 h-5" /> },
    ...(hasPeriodicTable
      ? [{ id: "periodic_table", label: "Periodic Table", icon: <Atom className="w-5 h-5" /> }]
      : []),
  ];

  // Derive FAB state from app state
  const fabState: FabState = activeTool ? "close" : menuOpen ? "menu" : "idle";

  const handleFlaskClick = () => {
    if (activeTool) {
      // State 3 → close active tool, return to idle
      setActiveTool(null);
      setMenuOpen(false);
      return;
    }
    if (availableTools.length === 1) {
      // Single tool — open it directly
      setActiveTool(availableTools[0].id);
    } else {
      // Multiple tools — toggle menu
      setMenuOpen((prev) => !prev);
    }
  };

  const handleToolSelect = (toolId: string) => {
    setActiveTool((prev) => (prev === toolId ? null : toolId));
    setMenuOpen(false);
  };

  return (
    <>
      {/* Fan arc tool buttons */}
      <AnimatePresence>
        {menuOpen &&
          availableTools.map((tool, i) => {
            const { x, y } = fanOffset(i, availableTools.length);
            return (
              <motion.button
                key={tool.id}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.6 }}
                animate={{ opacity: 1, x, y, scale: 1 }}
                exit={{ opacity: 0, x: 0, y: 0, scale: 0.6 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 26,
                  delay: i * 0.05,
                }}
                style={{
                  position: "fixed",
                  bottom: FAB_BOTTOM,
                  right: FAB_RIGHT,
                  width: FAB_SIZE,
                  height: FAB_SIZE,
                  zIndex: 40,
                  borderRadius: "9999px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "none",
                  cursor: "pointer",
                }}
                className={cn(
                  "transition-colors",
                  activeTool === tool.id
                    ? "bg-accent text-accent-foreground ring-2 ring-primary"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                title={tool.label}
                aria-label={`Open ${tool.label}`}
                onClick={() => handleToolSelect(tool.id)}
              >
                {tool.icon}
              </motion.button>
            );
          })}
      </AnimatePresence>

      {/* Main FAB */}
      <button
        onClick={handleFlaskClick}
        style={{
          position: "fixed",
          bottom: FAB_BOTTOM,
          right: FAB_RIGHT,
          width: FAB_SIZE,
          height: FAB_SIZE,
          zIndex: 55,
          borderRadius: "9999px",
          boxShadow: "0 4px 14px rgba(0,0,0,0.22)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          cursor: "pointer",
        }}
        className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        aria-label={fabState === "close" ? "Close tool" : "Open tools"}
      >
        {/* Icons are absolute so enter/exit overlap without layout shift */}
        <AnimatePresence mode="sync" initial={false}>
          {fabState === "close" ? (
            <motion.span
              key="close"
              initial={{ rotate: 90, opacity: 0, scale: 0.7 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              style={{ position: "absolute", display: "inline-flex" }}
            >
              <X className="w-5 h-5" />
            </motion.span>
          ) : isCalculatorOnly ? (
            <motion.span
              key="calc"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ position: "absolute", display: "inline-flex" }}
            >
              <CalcIcon className="w-5 h-5" />
            </motion.span>
          ) : fabState === "menu" ? (
            <motion.span
              key="flask-menu"
              initial={{ rotate: 0, opacity: 0 }}
              animate={{ rotate: 25, opacity: 1 }}
              exit={{ rotate: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 22 }}
              style={{ position: "absolute", display: "inline-flex" }}
            >
              <FlaskConical className="w-5 h-5" />
            </motion.span>
          ) : (
            <motion.span
              key="flask-idle"
              initial={{ rotate: 25, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 25, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 22 }}
              style={{ position: "absolute", display: "inline-flex" }}
            >
              <FlaskConical className="w-5 h-5" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Calculator panel — wrapper matches Calculator position (bottom-20 right-6) so no jump */}
      <AnimatePresence mode="wait">
        {activeTool === "calculator" && (
          <motion.div
            key="calculator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-20 right-6 z-40"
          >
            <Calculator
              enabled
              embedded
              open
              onOpenChange={() => setActiveTool(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Periodic Table panel — responsive: anchored bottom-right on desktop, centered on mobile */}
      <AnimatePresence mode="wait">
        {activeTool === "periodic_table" && (
          <motion.div
            key="periodic_table"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{ position: "fixed", zIndex: 50, inset: 0, pointerEvents: "none" }}
            className="origin-bottom-right max-md:origin-center"
          >
            {/* pointerEvents: none on wrapper — PeriodicTablePanel is fixed-positioned and handles its own events */}
            <PeriodicTablePanel onClose={() => setActiveTool(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
