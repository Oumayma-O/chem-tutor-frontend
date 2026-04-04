import { XCircle } from "lucide-react";
import { HintToggle } from "./HintToggle";

interface StepErrorFeedbackProps {
  message: string;
  showHint: boolean;
  hintText?: string;
  hintLoading?: boolean;
  onRequestHint: () => void;
  hintPanelOpen: boolean;
  onHintPanelOpenChange: (open: boolean) => void;
}

export function StepErrorFeedback({
  message,
  showHint,
  hintText,
  hintLoading,
  onRequestHint,
  hintPanelOpen,
  onHintPanelOpenChange,
}: StepErrorFeedbackProps) {
  return (
    <div className="space-y-2 fade-in">
      <div className="flex items-center gap-2 text-destructive">
        <XCircle className="w-5 h-5" />
        <span className="font-medium">{message}</span>
      </div>
      <HintToggle
        showHint={showHint}
        hintText={hintText}
        hintLoading={hintLoading}
        onRequestHint={onRequestHint}
        hintPanelOpen={hintPanelOpen}
        onHintPanelOpenChange={onHintPanelOpenChange}
      />
    </div>
  );
}
