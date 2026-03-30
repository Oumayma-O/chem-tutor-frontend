import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolbarButton {
  label: string;
  title: string;
  /**
   * How to insert into MathLive:
   * - 'cmd'   → structural LaTeX (frac, sqrt, ^, _, …)
   * - 'write' → raw LaTeX at cursor (×, →, Δ, …)
   */
  type: 'cmd' | 'write';
  value: string;
}

const BUTTONS: ToolbarButton[] = [
  // ── Math operators ─────────────────────────────────────────────────────
  { label: "×",     title: "Multiply",           type: 'write', value: "\\times "        },
  { label: "×10ⁿ", title: "Scientific notation", type: 'write', value: "\\times10^{}"   },
  { label: "x²",   title: "Exponent / power",    type: 'cmd',   value: "^"              },
  { label: "xₐ",   title: "Subscript",           type: 'cmd',   value: "_"              },
  { label: "( )",  title: "Parentheses",          type: 'write', value: "()"             },
  { label: "a/b",  title: "Fraction",             type: 'cmd',   value: "\\frac"         },
  { label: "√",    title: "Square root",          type: 'cmd',   value: "\\sqrt"         },
  { label: "|x|",  title: "Absolute value",       type: 'write', value: "|  |"           },
  { label: "∫",    title: "Integral",             type: 'cmd',   value: "\\int"          },
  { label: "ln",   title: "Natural log",          type: 'write', value: "\\ln("          },
  { label: "eˣ",   title: "Exponential",          type: 'write', value: "e^{}"           },
  { label: "∑",    title: "Sum / Sigma",           type: 'cmd',   value: "\\sum"          },
  // ── Chemistry symbols ──────────────────────────────────────────────────
  { label: "→",    title: "Reaction arrow",       type: 'write', value: "\\rightarrow "  },
  { label: "Δ",    title: "Delta (ΔH, ΔT…)",      type: 'write', value: "\\Delta "       },
  { label: "x̄",    title: "Overbar (average)",    type: 'cmd',   value: "\\bar"          },
];

const SCROLL_STEP = 120;

export interface MathToolbarProps {
  /** Called with the button's insert type and value. */
  onInsert: (type: 'cmd' | 'write', value: string) => void;
  className?: string;
}

export function MathToolbar({ onInsert, className }: MathToolbarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -SCROLL_STEP : SCROLL_STEP,
      behavior: "smooth",
    });
  };

  return (
    <div
      className={cn(
        "w-full flex items-stretch gap-0 p-1 bg-slate-100 border border-slate-200 rounded-lg",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Scroll toolbar left"
        onMouseDown={(e) => { e.preventDefault(); scroll("left"); }}
        className="shrink-0 flex items-center justify-center w-6 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      <div
        ref={scrollRef}
        className="flex-1 min-w-0 overflow-x-auto scrollbar-hide flex items-center gap-1.5 px-0.5"
      >
        {BUTTONS.map((btn) => (
          <button
            key={btn.label}
            type="button"
            title={btn.title}
            onMouseDown={(e) => {
              e.preventDefault(); // keep math field focused
              onInsert(btn.type, btn.value);
            }}
            className="flex-shrink-0 bg-white shadow-sm hover:bg-blue-50 active:bg-blue-100 text-slate-700 text-sm px-2 py-1 rounded-md transition-colors border border-slate-200 font-mono leading-none select-none"
          >
            {btn.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        aria-label="Scroll toolbar right"
        onMouseDown={(e) => { e.preventDefault(); scroll("right"); }}
        className="shrink-0 flex items-center justify-center w-6 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
