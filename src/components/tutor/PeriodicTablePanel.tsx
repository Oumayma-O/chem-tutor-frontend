import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GripVertical } from "lucide-react";
import {
  getMainGrid,
  getLanthanoidRow,
  getActinoidRow,
  getCategoryColor,
  CATEGORY_LABELS,
  type ElementCategory,
  type Cell,
} from "@/data/periodicTableElements";
import { cn } from "@/lib/utils";

const LEGEND_ITEMS: { label: string; category: ElementCategory }[] = [
  { label: "Alkali metals", category: "alkali" },
  { label: "Alkaline-earth metals", category: "alkaline" },
  { label: "Transition metals", category: "transition" },
  { label: "Rare-earth (21, 39, 57–71) / Lanthanoid (57–71)", category: "lanthanide" },
  { label: "Actinoid elements", category: "actinide" },
  { label: "Other metals", category: "post-transition" },
  { label: "Metalloids", category: "metalloid" },
  { label: "Halogens", category: "halogen" },
  { label: "Noble gases", category: "noble" },
  { label: "Other nonmetals", category: "nonmetal" },
];

interface PeriodicTablePanelProps {
  onClose: () => void;
  /** @deprecated Position is now responsive (anchor bottom-right on desktop, center on mobile). */
  initialX?: number;
  initialY?: number;
}

function ElementCell({
  cell,
  className,
  onMouseEnter,
  onMouseLeave,
}: {
  cell: Cell;
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const massDisplay = Number.isInteger(cell.atomicMass)
    ? `[${cell.atomicMass}]`
    : cell.atomicMass.toFixed(2);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center border border-border min-w-[28px] min-h-[42px] py-0.5 px-0.5 cursor-default hover:ring-1 hover:ring-primary hover:z-10 hover:relative",
        getCategoryColor(cell.category),
        className
      )}
      title={`${cell.symbol} — ${cell.number}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <span className="text-[9px] text-muted-foreground leading-none self-start">{cell.number}</span>
      <span className="text-xs font-bold leading-tight -mt-0.5">{cell.symbol}</span>
      <span className="text-[8px] text-muted-foreground leading-none mt-0.5">{massDisplay}</span>
    </div>
  );
}

const MIN_WIDTH = 320;
const MIN_HEIGHT = 340;

const MAX_W = "calc(100vw - 32px)";
const MAX_H = "calc(100vh - 120px)";

export function PeriodicTablePanel({ onClose }: PeriodicTablePanelProps) {
  /** When false, use responsive CSS (anchor bottom-right on desktop, center on mobile). When true, use position state after user drag. */
  const [hasUserMoved, setHasUserMoved] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  /** null = wrap contents; set to explicit size when user resizes */
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [hoveredElement, setHoveredElement] = useState<Cell | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const isDragging = useRef(false);
  const isResizing = useRef(false);

  const clampPosition = useCallback((x: number, y: number) => {
    const el = panelRef.current;
    if (!el) return { x, y };
    const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
    const vh = typeof window !== "undefined" ? window.innerHeight : 768;
    const { width, height } = el.getBoundingClientRect();
    return {
      x: Math.max(16, Math.min(vw - width - 16, x)),
      y: Math.max(16, Math.min(vh - height - 16, y)),
    };
  }, []);

  const startDrag = useCallback((clientX: number, clientY: number, target: EventTarget | null) => {
    if ((target as HTMLElement)?.closest("button")) return;
    const el = panelRef.current;
    if (el && !hasUserMoved) {
      const r = el.getBoundingClientRect();
      setPosition({ x: r.left, y: r.top });
      setHasUserMoved(true);
      dragStart.current = { x: clientX, y: clientY, left: r.left, top: r.top };
    } else {
      dragStart.current = { x: clientX, y: clientY, left: position.x, top: position.y };
    }
    isDragging.current = true;
  }, [hasUserMoved, position.x, position.y]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY, e.target);
  }, [startDrag]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    startDrag(t.clientX, t.clientY, e.target);
  }, [startDrag]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const x = dragStart.current.left + e.clientX - dragStart.current.x;
      const y = dragStart.current.top + e.clientY - dragStart.current.y;
      const next = clampPosition(x, y);
      setPosition(next);
      dragStart.current = { x: e.clientX, y: e.clientY, left: next.x, top: next.y };
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const t = e.touches[0];
      const x = dragStart.current.left + t.clientX - dragStart.current.x;
      const y = dragStart.current.top + t.clientY - dragStart.current.y;
      const next = clampPosition(x, y);
      setPosition(next);
      dragStart.current = { x: t.clientX, y: t.clientY, left: next.x, top: next.y };
    };
    const onUp = () => { isDragging.current = false; isResizing.current = false; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const dw = e.clientX - resizeStart.current.x;
      const dh = e.clientY - resizeStart.current.y;
      const newW = Math.max(MIN_WIDTH, resizeStart.current.w + dw);
      const newH = Math.max(MIN_HEIGHT, resizeStart.current.h + dh);
      setSize({ w: newW, h: newH });
      resizeStart.current = { x: e.clientX, y: e.clientY, w: newW, h: newH };
    };
    const onUp = () => { isResizing.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = panelRef.current;
    if (el) {
      const { width, height } = el.getBoundingClientRect();
      const w = Math.max(MIN_WIDTH, width);
      const h = Math.max(MIN_HEIGHT, height);
      setSize({ w, h });
      resizeStart.current = { x: e.clientX, y: e.clientY, w, h };
    }
    isResizing.current = true;
  }, []);

  const mainGrid = getMainGrid();
  const lanthanoidRow = getLanthanoidRow();
  const actinoidRow = getActinoidRow();

  return (
    <div
      ref={panelRef}
      className={cn(
        "fixed z-50 flex flex-col bg-card border border-border rounded-xl shadow-xl overflow-hidden w-fit max-w-[calc(100vw-32px)] max-h-[calc(100vh-120px)]",
        !hasUserMoved && "max-md:left-1/2 max-md:top-1/2 max-md:-translate-x-1/2 max-md:-translate-y-1/2 md:right-20 md:bottom-20"
      )}
      style={
        hasUserMoved
          ? { left: position.x, top: position.y, pointerEvents: "auto", ...(size && { width: size.w, height: size.h }) }
          : { pointerEvents: "auto", ...(size && { width: size.w, height: size.h }) }
      }
    >
      {/* Header — draggable */}
      <div
        role="presentation"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className="flex items-center gap-2 px-3 py-2 bg-muted/60 border-b border-border cursor-grab active:cursor-grabbing select-none"
        style={{ touchAction: "none" }}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium flex-1">Interactive Periodic Table of the Elements</span>
      </div>

      {/* Hover info panel — always visible, not inside scroll area */}
      <div className="px-3 pt-2 pb-1 border-b border-border/50 shrink-0">
        <div
          className="flex items-center rounded border border-dashed border-border/40 bg-muted/20"
          style={{ minHeight: "48px" }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {hoveredElement == null ? (
              <motion.span
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="text-[10px] text-muted-foreground italic px-3"
              >
                Hover over an element for details
              </motion.span>
            ) : (
              <motion.div
                key={hoveredElement.number}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="flex items-center gap-3 px-3 w-full py-1"
              >
                {/* Symbol badge */}
                <div className={cn(
                  "flex flex-col items-center justify-center rounded border border-border min-w-[40px] h-10 shrink-0",
                  getCategoryColor(hoveredElement.category)
                )}>
                  <span className="text-[9px] text-muted-foreground leading-none">{hoveredElement.number}</span>
                  <span className="text-base font-bold leading-tight">{hoveredElement.symbol}</span>
                </div>
                {/* Details */}
                <div className="flex flex-col gap-0">
                  <span className="text-[11px] font-semibold text-foreground leading-tight">{hoveredElement.name}</span>
                  <span className="text-[9px] text-muted-foreground leading-tight">
                    Atomic mass: {Number.isInteger(hoveredElement.atomicMass) ? `[${hoveredElement.atomicMass}]` : hoveredElement.atomicMass.toFixed(3)} u
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className={cn("w-2.5 h-2.5 rounded-sm border border-border/60 shrink-0", getCategoryColor(hoveredElement.category))} />
                    <span className="text-[9px] text-muted-foreground">{CATEGORY_LABELS[hoveredElement.category]}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="p-3 overflow-auto flex-1 min-h-0">
        {/* Legend — two columns, color key */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3 text-[10px]">
          {LEGEND_ITEMS.map(({ label, category }) => (
            <div key={category} className="flex items-center gap-2">
              <div className={cn("w-3 h-3 shrink-0 rounded border border-border", getCategoryColor(category))} />
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* Main table: group labels 1–18 */}
        <div className="inline-block">
          <div className="flex gap-0.5 mb-0.5 pl-6">
            <span className="text-[9px] text-muted-foreground w-6 shrink-0">group</span>
            {Array.from({ length: 18 }, (_, i) => (
              <span key={i} className="text-[9px] text-muted-foreground min-w-[28px] text-center">
                {i + 1}
              </span>
            ))}
          </div>
          {mainGrid.map((row, ri) => (
            <div key={ri} className="flex gap-0.5 mb-0.5 items-stretch">
              <span className="text-[9px] text-muted-foreground w-6 shrink-0 flex items-center">
                period {ri + 1}
              </span>
              <div className="flex gap-0.5">
                {row.map((cell, ci) =>
                  cell ? (
                    <ElementCell
                      key={`${ri}-${ci}`}
                      cell={cell}
                      onMouseEnter={() => setHoveredElement(cell)}
                      onMouseLeave={() => setHoveredElement(null)}
                    />
                  ) : (
                    <div key={`${ri}-${ci}`} className="min-w-[28px] min-h-[42px]" />
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Lanthanoid series */}
        <div className="mt-2">
          <div className="text-[10px] text-muted-foreground mb-1">Lanthanoid series (period 6)</div>
          <div className="flex gap-0.5 flex-wrap">
            {lanthanoidRow.map((cell) => (
              <ElementCell
                key={cell.number}
                cell={cell}
                onMouseEnter={() => setHoveredElement(cell)}
                onMouseLeave={() => setHoveredElement(null)}
              />
            ))}
          </div>
        </div>

        {/* Actinoid series */}
        <div className="mt-2">
          <div className="text-[10px] text-muted-foreground mb-1">Actinoid series (period 7)</div>
          <div className="flex gap-0.5 flex-wrap">
            {actinoidRow.map((cell) => (
              <ElementCell
                key={cell.number}
                cell={cell}
                onMouseEnter={() => setHoveredElement(cell)}
                onMouseLeave={() => setHoveredElement(null)}
              />
            ))}
          </div>
        </div>

        <p className="text-[9px] text-muted-foreground mt-3">
          Numbering adopted by the International Union of Pure and Applied Chemistry (IUPAC).
        </p>
      </div>

      {/* Resize handle — bottom-right, visible on hover */}
      <div
        role="presentation"
        onMouseDown={handleResizeStart}
        className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end pr-0.5 pb-0.5 border-l border-t border-border/50 rounded-tl bg-muted/30 opacity-0 hover:opacity-100 transition-opacity"
        title="Resize"
      >
        <svg className="w-3 h-3 text-muted-foreground" viewBox="0 0 12 12" fill="currentColor">
          <path d="M12 12H8v-4h4v4zM8 8H4V4h4v4zM4 4H0V0h4v4z" />
        </svg>
      </div>
    </div>
  );
}
