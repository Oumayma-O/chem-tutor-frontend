import { CheckCircle } from "lucide-react";

export function CorrectFeedback() {
  return (
    <div className="flex items-center gap-2 text-success fade-in">
      <CheckCircle className="w-5 h-5" />
      <span className="font-medium">Correct!</span>
    </div>
  );
}
