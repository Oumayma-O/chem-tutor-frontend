import { useState, useEffect } from "react";
import { Lightbulb, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HintMarkdown } from "@/lib/mathDisplay";

interface HintToggleProps {
  showHint: boolean;
  hintText?: string;
  hintLoading?: boolean;
  onRequestHint: () => void;
}

export function HintToggle({ showHint, hintText, hintLoading, onRequestHint }: HintToggleProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hintLoading && !showHint) {
      setVisible(false);
    }
  }, [hintLoading, showHint]);

  const handleToggle = () => {
    if (!visible) {
      if (!showHint && !hintLoading) onRequestHint();
      setVisible(true);
    } else {
      setVisible(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        disabled={hintLoading && !visible}
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
            {visible ? "Hide Hint" : "Show Hint"}
          </>
        )}
      </Button>

      {visible && showHint && hintText && (
        <div className="bg-warning/20 border border-warning/40 rounded-md p-3 fade-in">
          <HintMarkdown>{hintText}</HintMarkdown>
        </div>
      )}
    </div>
  );
}

