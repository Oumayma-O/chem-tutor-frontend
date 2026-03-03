import { useState, useEffect } from "react";
import { Calculator as CalcIcon, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { evaluateExpression } from "@/lib/mathEval";
import { cn } from "@/lib/utils";

interface CalculatorProps {
  enabled: boolean;
}

export function Calculator({ enabled }: CalculatorProps) {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const [hasResult, setHasResult] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!enabled) return null;

  const handleInput = (val: string) => {
    if (hasResult && /\d|\./.test(val)) {
      setDisplay(val);
      setHasResult(false);
      return;
    }
    setHasResult(false);
    setDisplay((prev) => (prev === "0" && val !== "." ? val : prev + val));
  };

  const handleClear = () => {
    setDisplay("0");
    setHasResult(false);
  };

  const handleBackspace = () => {
    setDisplay((prev) => (prev.length <= 1 ? "0" : prev.slice(0, -1)));
  };

  const handleEquals = () => {
    const result = evaluateExpression(display);
    if (result !== null) {
      const rounded = Math.round(result * 1e10) / 1e10;
      setDisplay(String(rounded));
      setHasResult(true);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(display).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  // Keyboard support when calculator is open
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when focus is in an input/textarea (step answer fields)
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (/^[0-9]$/.test(e.key) || e.key === ".") {
        handleInput(e.key);
      } else if (e.key === "+") {
        handleInput("+");
      } else if (e.key === "-") {
        handleInput("-");
      } else if (e.key === "*") {
        handleInput("*");
      } else if (e.key === "/") {
        e.preventDefault();
        handleInput("/");
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        handleEquals();
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Escape" || e.key === "c" || e.key === "C") {
        handleClear();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, display, hasResult]); // eslint-disable-line react-hooks/exhaustive-deps

  const buttons = [
    ["7", "8", "9", "÷"],
    ["4", "5", "6", "×"],
    ["1", "2", "3", "−"],
    ["0", ".", "=", "+"],
  ];

  return (
    <>
      {/* Floating toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all",
          "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
        aria-label="Toggle calculator"
      >
        {open ? <X className="w-5 h-5" /> : <CalcIcon className="w-5 h-5" />}
      </button>

      {/* Calculator popup */}
      {open && (
        <div className="fixed bottom-20 right-6 z-40 w-64 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          {/* Display */}
          <div className="bg-secondary p-3 text-right">
            <div className="text-xs text-muted-foreground h-4 overflow-hidden">
              {hasResult ? "Result" : ""}
            </div>
            <div className="text-xl font-mono text-foreground truncate">{display}</div>
          </div>

          {/* Controls row */}
          <div className="flex gap-1 px-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={handleClear}>
              C
            </Button>
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={handleBackspace}>
              ⌫
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs gap-1"
              onClick={handleCopy}
              title="Copy result"
            >
              {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          {/* Number pad */}
          <div className="grid grid-cols-4 gap-1 p-2">
            {buttons.flat().map((btn) => (
              <Button
                key={btn}
                variant={["+", "−", "×", "÷"].includes(btn) ? "secondary" : btn === "=" ? "default" : "ghost"}
                size="sm"
                className="h-10 text-base font-medium"
                onClick={() => {
                  if (btn === "=") handleEquals();
                  else if (btn === "×") handleInput("*");
                  else if (btn === "÷") handleInput("/");
                  else if (btn === "−") handleInput("-");
                  else handleInput(btn);
                }}
              >
                {btn}
              </Button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
