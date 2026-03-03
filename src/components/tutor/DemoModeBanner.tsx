import { AlertTriangle } from "lucide-react";

interface DemoModeBannerProps {
  message?: string;
}

export function DemoModeBanner({ message }: DemoModeBannerProps) {
  return (
    <div className="bg-warning/20 border border-warning/40 rounded-lg px-4 py-2 flex items-center gap-2 mb-4">
      <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
      <span className="text-sm text-foreground font-medium">
        {message || "Demo Mode — Sample Content Loaded"}
      </span>
    </div>
  );
}
