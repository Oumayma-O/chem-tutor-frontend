import { Lightbulb, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HintMarkdown } from "@/lib/mathDisplay";

export interface HintToggleProps {
  showHint: boolean;
  hintText?: string;
  hintLoading?: boolean;
  onRequestHint: () => void;
  /** Parent-owned: whether the hint markdown panel is expanded. */
  hintPanelOpen: boolean;
  onHintPanelOpenChange: (open: boolean) => void;
}

export function HintToggle({
  showHint,
  hintText,
  hintLoading,
  onRequestHint,
  hintPanelOpen,
  onHintPanelOpenChange,
}: HintToggleProps) {
  const handleToggle = () => {
    if (!hintPanelOpen) {
      if (!showHint && !hintLoading) onRequestHint();
      onHintPanelOpenChange(true);
    } else {
      onHintPanelOpenChange(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        disabled={hintLoading && !hintPanelOpen}
        className="text-muted-foreground"
      >
        {hintLoading ? (
          <>
            <Loader2 className="animate-spin w-4 h-4 mr-2" />
            Thinking…
          </>
        ) : (
          <>
            <Lightbulb className="w-4 h-4 mr-2" />
            {hintPanelOpen ? "Hide Hint" : "Show Hint"}
          </>
        )}
      </Button>

      {hintPanelOpen && showHint && hintText && (
        <div className="bg-warning/20 border border-warning/40 rounded-md p-3 fade-in">
          <HintMarkdown>{hintText}</HintMarkdown>
        </div>
      )}
    </div>
  );
}
