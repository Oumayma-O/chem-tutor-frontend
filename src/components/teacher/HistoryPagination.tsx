import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HistoryPaginationProps {
  page: number;
  totalPages: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
}

export function HistoryPagination({ page, totalPages, isLoading, onPageChange }: HistoryPaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-border/60">
      <Button
        variant="outline" size="sm"
        disabled={page <= 1 || isLoading}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" /> Previous
      </Button>
      <span className="text-sm text-muted-foreground tabular-nums">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline" size="sm"
        disabled={page >= totalPages || isLoading}
        onClick={() => onPageChange(page + 1)}
      >
        Next <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
