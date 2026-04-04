import { CheckCircle } from "lucide-react";

interface CorrectFeedbackProps {
  message?: string;
}

export function CorrectFeedback({ message }: CorrectFeedbackProps) {
  return (
    <div className="flex items-center gap-2 text-success fade-in">
      <CheckCircle className="w-5 h-5" />
      <span className="font-medium">{message ?? "Correct!"}</span>
    </div>
  );
}

