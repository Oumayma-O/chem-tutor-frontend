import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FlaskConical, Calculator as CalcIcon, Atom, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calculator } from "./Calculator";
import { PeriodicTablePanel } from "./PeriodicTablePanel";
import { cn } from "@/lib/utils";

const FAB_BASE =
  "fixed z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all";

export const TOOL_KEYS = ["calculator", "periodic_table"] as const;
export type ToolKey = (typeof TOOL_KEYS)[number];

interface ToolDef {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface ToolsWidgetProps {
  /** Tool keys required for the current lesson. Calculator is always available. */
  requiredTools?: string[];
}

export function ToolsWidget({ requiredTools = [] }: ToolsWidgetProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const hasPeriodicTable = requiredTools.some((t) => {
    const normalized = String(t).toLowerCase().replace(/[\s-_]/g, "");
    return normalized === "periodictable";
  });

  const availableTools: ToolDef[] = [
    { id: "calculator", label: "Calculator", icon: <CalcIcon className="w-5 h-5" /> },
    ...(hasPeriodicTable
      ? [{ id: "periodic_table", label: "Periodic Table", icon: <Atom className="w-5 h-5" /> }]
      : []),
  ];

  const handleToolSelect = (toolId: string) => {
    setActiveTool((prev) => (prev === toolId ? null : toolId));
    setMenuOpen(false);
  };

  const handleFlaskClick = () => {
    if (activeTool) {
      setActiveTool(null);
      setMenuOpen(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open && activeTool) setMenuOpen(false);
    else setMenuOpen(open);
  };

  const isOpen = menuOpen || !!activeTool;

  return (
    <>
      <Popover open={menuOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            onClick={handleFlaskClick}
            className={cn("bottom-6 right-6", FAB_BASE, "bg-primary text-primary-foreground hover:bg-primary/90")}
            aria-label={activeTool ? "Close tool" : "Open tools"}
          >
            {activeTool ? (
              <X className="w-5 h-5" />
            ) : (
              <span
                className={cn(
                  "inline-flex transition-transform duration-200 ease-out",
                  isOpen && "-rotate-12"
                )}
                style={{ transformOrigin: "bottom center" }}
              >
                <FlaskConical className="w-5 h-5" />
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          sideOffset={12}
          className="bg-transparent border-0 shadow-none p-0 min-w-0 w-auto"
        >
          <div className="flex flex-col gap-3">
            {availableTools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => handleToolSelect(tool.id)}
                className={cn(
                  FAB_BASE,
                  "relative w-12 h-12 shadow-md",
                  activeTool === tool.id
                    ? "bg-accent text-accent-foreground ring-2 ring-primary"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                title={tool.label}
                aria-label={`Open ${tool.label}`}
              >
                {tool.icon}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <AnimatePresence mode="wait">
        {activeTool === "calculator" && (
          <motion.div
            key="calculator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-20 right-6 z-40 pointer-events-auto"
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
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed z-40"
            style={{ bottom: "5.5rem", right: "1.5rem" }}
          >
            <PeriodicTablePanel onClose={() => setActiveTool(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
