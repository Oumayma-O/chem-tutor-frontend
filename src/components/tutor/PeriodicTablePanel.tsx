import { useState, useRef, useEffect, useCallback } from "react";
import { X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMainGrid, getCategoryColor, type ElementCategory } from "@/data/periodicTableElements";
import { cn } from "@/lib/utils";

const LEGEND: { label: string; category: ElementCategory }[] = [
  { label: "alkali", category: "alkali" },
  { label: "alkaline", category: "alkaline" },
  { label: "transition", category: "transition" },
  { label: "post-transition", category: "post-transition" },
  { label: "metalloid", category: "metalloid" },
  { label: "nonmetal", category: "nonmetal" },
  { label: "halogen", category: "halogen" },
  { label: "noble", category: "noble" },
  { label: "lanthanide", category: "lanthanide" },
  { label: "actinide", category: "actinide" },
];

const MIN_WIDTH = 320;
const MIN_HEIGHT = 340;
const DEFAULT_WIDTH = 520;
const DEFAULT_HEIGHT = 420;

interface PeriodicTablePanelProps {
  onClose: () => void;
  initialX?: number;
  initialY?: number;
}

export function PeriodicTablePanel({ onClose, initialX, initialY }: PeriodicTablePanelProps) {
  const [position, setPosition] = useState({ x: initialX ?? 24, y: initialY ?? 80 });
  const [size, setSize] = useState({ w: DEFAULT_WIDTH, h: DEFAULT_HEIGHT });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if ((e.target as HTMLElement).closest("button")) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, left: position.x, top: position.y };
  }, [position.x, position.y]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
  }, [size.w, size.h]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setPosition((prev) => ({
          x: Math.max(0, dragStart.current.left + dx),
          y: Math.max(0, dragStart.current.top + dy),
        }));
      }
      if (isResizing) {
        const dw = e.clientX - resizeStart.current.x;
        const dh = e.clientY - resizeStart.current.y;
        setSize({
          w: Math.max(MIN_WIDTH, resizeStart.current.w + dw),
          h: Math.max(MIN_HEIGHT, resizeStart.current.h + dh),
        });
      }
    };
    const onUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, isResizing]);

  const grid = getMainGrid();

  return (
    <div
      className="fixed z-50 flex flex-col bg-card border border-border rounded-xl shadow-xl overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        width: size.w,
        height: size.h,
      }}
    >
      {/* Header: draggable, with title and close */}
      <div
        role="presentation"
        onMouseDown={handleDragStart}
        className="flex items-center gap-2 px-3 py-2 bg-muted/60 border-b border-border cursor-grab active:cursor-grabbing select-none"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium flex-1">Periodic Table</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close periodic table"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-1.5 px-2 py-1.5 border-b border-border bg-muted/30">
        {LEGEND.map(({ label, category }) => (
          <span
            key={category}
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded font-medium text-foreground/90",
              getCategoryColor(category)
            )}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Table grid — scrollable */}
      <div className="flex-1 overflow-auto p-2 min-h-0">
        <div className="inline-block">
          {grid.map((row, ri) => (
            <div key={ri} className="flex gap-0.5 mb-0.5">
              {row.map((cell, ci) =>
                cell ? (
                  <div
                    key={`${ri}-${ci}`}
                    className={cn(
                      "w-7 h-7 flex flex-col items-center justify-center rounded text-[10px] font-medium border border-border/50",
                      getCategoryColor(cell.category)
                    )}
                    title={`${cell.symbol} (${cell.number})`}
                  >
                    <span className="text-[8px] text-muted-foreground">{cell.number}</span>
                    <span className="leading-tight">{cell.symbol}</span>
                  </div>
                ) : (
                  <div key={`${ri}-${ci}`} className="w-7 h-7" />
                )
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Resize handle — bottom-right corner */}
      <div
        role="presentation"
        onMouseDown={handleResizeStart}
        className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-end justify-end pr-0.5 pb-0.5 border-l border-t border-border/50 rounded-tl bg-muted/30 hover:bg-muted/50"
        title="Resize"
      >
        <svg className="w-3 h-3 text-muted-foreground" viewBox="0 0 12 12" fill="currentColor">
          <path d="M12 12H8v-4h4v4zM8 8H4V4h4v4zM4 4H0V0h4v4z" />
        </svg>
      </div>
    </div>
  );
}
