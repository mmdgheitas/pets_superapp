import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toPersianDigits } from '@/lib/format';

export function Pagination({
  page,
  totalPages,
  total,
  itemLabel,
  onChange,
}: {
  page: number;
  totalPages: number;
  total?: number;
  itemLabel?: string;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {total != null && itemLabel && (
        <p className="text-sm text-muted-foreground num-tabular">
          {toPersianDigits(total)} {itemLabel}
        </p>
      )}
      <div className="me-0 ms-auto flex items-center gap-2">
        <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="صفحه قبل">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-muted-foreground num-tabular">
          صفحه {toPersianDigits(page)} از {toPersianDigits(totalPages)}
        </span>
        <Button variant="outline" size="icon-sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="صفحه بعد">
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
