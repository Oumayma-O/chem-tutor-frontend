import { useState, useEffect } from "react";
import { Calculator as CalcIcon, X, Copy, Check, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { evaluateExpression } from "@/lib/mathEval";
import { cn } from "@/lib/utils";

interface CalculatorProps {
  enabled: boolean;
  /** When true, no floating button; open/close controlled by parent (e.g. from ToolsWidget). */
  embedded?: boolean;
  /** Controlled open state when embedded. */
  open?: boolean;
  /** Called when embedded panel should close. */
  onOpenChange?: (open: boolean) => void;
}

export function Calculator({
  enabled,
  embedded = false,
  open: controlledOpen,
  onOpenChange,
}: CalculatorProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = embedded ? (controlledOpen ?? false) : internalOpen;
  const setOpen = embedded ? (onOpenChange ?? (() => {})) : setInternalOpen;
  const [display, setDisplay] = useState("0");
  const [hasResult, setHasResult] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scientific, setScientific] = useState(false);

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

  const handleFunc = (fn: string) => {
    if (hasResult) {
      setDisplay(`${fn}(${display})`);
      setHasResult(false);
    } else {
      setDisplay((prev) => (prev === "0" ? `${fn}(` : prev + `${fn}(`));
    }
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

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (/^[0-9]$/.test(e.key) || e.key === ".") {
        handleInput(e.key);
      } else if (["+", "-", "*", "/", "^"].includes(e.key)) {
        if (e.key === "/") e.preventDefault();
        handleInput(e.key);
      } else if (e.key === "(" || e.key === ")") {
        handleInput(e.key);
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

  const basicButtons = [
    ["7", "8", "9", "÷"],
    ["4", "5", "6", "×"],
    ["1", "2", "3", "−"],
    ["0", ".", "=", "+"],
  ];

  const sciButtons: { label: string; action: () => void }[] = [
    { label: "ln",   action: () => handleFunc("ln") },
    { label: "log",  action: () => handleFunc("log") },
    { label: "exp",  action: () => handleFunc("exp") },
    { label: "√",    action: () => handleFunc("sqrt") },
    { label: "sin",  action: () => handleFunc("sin") },
    { label: "cos",  action: () => handleFunc("cos") },
    { label: "tan",  action: () => handleFunc("tan") },
    { label: "xʸ",   action: () => handleInput("^") },
    { label: "(",    action: () => handleInput("(") },
    { label: ")",    action: () => handleInput(")") },
    { label: "π",    action: () => handleInput("pi") },
    { label: "e",    action: () => handleInput("e") },
  ];

  return (
    <>
      {/* Floating toggle — only when not embedded */}
      {!embedded && (
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all",
            "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
          aria-label="Toggle calculator"
        >
          {open ? <X className="w-5 h-5" /> : <CalcIcon className="w-5 h-5" />}
        </button>
      )}

      {/* Calculator popup — when embedded, no fixed (wrapper in ToolsWidget owns position) to prevent jump */}
      {open && (
        <div
          className={cn(
            "bg-card border border-border rounded-xl shadow-xl overflow-hidden",
            embedded ? "relative" : "fixed bottom-20 right-6 z-40 transition-all",
            scientific ? "w-80" : "w-64",
          )}
        >
          {/* Display */}
          <div className="bg-secondary p-3 text-right">
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-2">
                {embedded && (
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="p-1 rounded hover:bg-muted"
                    aria-label="Close calculator"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setScientific((s) => !s)}
                className={cn(
                  "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors",
                  scientific
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title="Toggle scientific mode"
              >
                <FlaskConical className="w-3 h-3" />
                SCI
              </button>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {hasResult ? "Result" : ""}
              </span>
            </div>
            <div className="text-xl font-mono text-foreground truncate">
              {display}
            </div>
          </div>

          {/* Controls row */}
          <div className="flex gap-1 px-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={handleClear}
            >
              C
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={handleBackspace}
            >
              ⌫
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs gap-1"
              onClick={handleCopy}
              title="Copy result"
            >
              {copied ? (
                <Check className="w-3 h-3 text-success" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          <div className={cn("p-2", scientific && "flex gap-1.5")}>
            {/* Scientific panel */}
            {scientific && (
              <div className="grid grid-cols-3 gap-1 shrink-0">
                {sciButtons.map((btn) => (
                  <Button
                    key={btn.label}
                    variant="outline"
                    size="sm"
                    className="h-9 text-[11px] font-medium px-1"
                    onClick={btn.action}
                  >
                    {btn.label}
                  </Button>
                ))}
              </div>
            )}

            {/* Number pad */}
            <div className={cn("grid grid-cols-4 gap-1", scientific && "flex-1")}>
              {basicButtons.flat().map((btn) => (
                <Button
                  key={btn}
                  variant={
                    ["+", "−", "×", "÷"].includes(btn)
                      ? "secondary"
                      : btn === "="
                        ? "default"
                        : "ghost"
                  }
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
        </div>
      )}
    </>
  );
}
