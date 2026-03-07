import { cn } from "@/lib/utils";

interface PhaseHeaderProps {
  name: string;
  description?: string | null;
  className?: string;
}

export function PhaseHeader({ name, description, className }: PhaseHeaderProps) {
  return (
    <div className={cn("flex items-center gap-4 pt-8 pb-3 first:pt-0", className)}>
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground whitespace-nowrap">
        {name}
      </h3>
      <div className="flex-1 h-px bg-border" />
      {description && (
        <p className="text-[11px] text-muted-foreground/70 whitespace-nowrap hidden sm:block">
          {description}
        </p>
      )}
    </div>
  );
}
