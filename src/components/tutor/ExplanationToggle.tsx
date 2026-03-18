import { useState } from "react";
import { BookOpen } from "lucide-react";
import { formatMathContent } from "@/lib/mathDisplay";

interface ExplanationToggleProps {
  explanation: string;
}

export function ExplanationToggle({ explanation }: ExplanationToggleProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary transition-colors py-1"
        aria-expanded={open}
      >
        <BookOpen className="w-3.5 h-3.5 shrink-0" />
        <span>{open ? "Hide explanation" : "Show explanation"}</span>
      </button>
      {open && (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 mt-1">
          <p className="text-sm text-slate-600 leading-snug">
            {formatMathContent(explanation)}
          </p>
        </div>
      )}
    </div>
  );
}
