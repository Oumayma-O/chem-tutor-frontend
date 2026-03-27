import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FlaskConical, Calculator as CalcIcon, Atom, X } from "lucide-react";
import { Calculator } from "./Calculator";
import { PeriodicTablePanel } from "./PeriodicTablePanel";
import { cn } from "@/lib/utils";

type FabState = "idle" | "menu" | "close";

const RADIUS = 72;
const FAB_SIZE = 48;
const FAB_RIGHT = 24;
const FAB_BOTTOM = 24;

function fanOffset(i: number, total: number): { x: number; y: number } {
  const start = Math.PI;
  const end = Math.PI / 2;
  const angle = total === 1
    ? (start + end) / 2
    : start + (end - start) * (i / (total - 1));
  return {
    x: Math.round(RADIUS * Math.cos(angle)),
    y: Math.round(-RADIUS * Math.sin(angle)),
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

  const fabState: FabState = activeTool ? "close" : menuOpen ? "menu" : "idle";

  const handleFlaskClick = () => {
    if (activeTool) {
      setActiveTool(null);
      setMenuOpen(false);
      return;
    }
    if (availableTools.length === 1) {
      setActiveTool(availableTools[0].id);
    } else {
      setMenuOpen((prev) => !prev);
    }
  };

  const handleToolSelect = (toolId: string) => {
    setActiveTool((prev) => (prev === toolId ? null : toolId));
    setMenuOpen(false);
  };

  return (
    <>
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
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
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
            <PeriodicTablePanel onClose={() => setActiveTool(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

