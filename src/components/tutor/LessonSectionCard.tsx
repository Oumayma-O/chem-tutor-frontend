import { LucideIcon } from "lucide-react";
import { formatMathContent } from "@/lib/mathDisplay";

interface LessonSectionCardProps {
  title: string;
  /** Icon shown in the card header */
  headerIcon: LucideIcon;
  headerIconColor: string;
  items: string[];
  /** When provided, each item row shows this icon on the left (text items). Omit for equation-style rows. */
  itemIcon?: LucideIcon;
  itemIconColor?: string;
}

export function LessonSectionCard({
  title,
  headerIcon: HeaderIcon,
  headerIconColor,
  items,
  itemIcon: ItemIcon,
  itemIconColor,
}: LessonSectionCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm">
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <HeaderIcon className={`w-5 h-5 shrink-0 ${headerIconColor}`} />
        <h2 className="text-base font-bold text-slate-900 dark:text-foreground">{title}</h2>
      </div>
      <div className="px-4 pb-5 space-y-2.5">
        {items.map((item, i) =>
          ItemIcon ? (
            <div
              key={i}
              className="flex items-start gap-3 border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted/40 rounded-xl p-3"
            >
              <ItemIcon className={`w-4 h-4 mt-0.5 shrink-0 ${itemIconColor}`} />
              <span className="text-sm text-slate-700 dark:text-foreground leading-snug">{item}</span>
            </div>
          ) : (
            <div
              key={i}
              className="border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted/40 rounded-xl px-4 py-5 min-h-[4rem] overflow-visible leading-relaxed text-sm text-slate-800 dark:text-foreground"
            >
              {formatMathContent(item)}
            </div>
          )
        )}
      </div>
    </div>
  );
}
