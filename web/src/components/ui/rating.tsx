import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toPersianDigits } from '@/lib/format';

/**
 * Star rating display. Uses filled/half/empty stars — a well-known visual pattern
 * (recognition, not recall) that lets shoppers judge quality at a glance.
 */
export function Rating({
  value,
  count,
  size = 'sm',
  className,
}: {
  value: number;
  count?: number;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}) {
  const sizeClass = size === 'xs' ? 'h-3 w-3' : size === 'md' ? 'h-5 w-5' : 'h-3.5 w-3.5';
  const rounded = Math.round(value * 2) / 2;

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <div className="flex items-center gap-px" dir="ltr" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i + 1 <= rounded;
          const half = !filled && i + 0.5 === rounded;
          return (
            <span key={i} className={cn('relative inline-flex shrink-0', sizeClass)}>
              <Star className={cn(sizeClass, 'text-muted-foreground/25')} />
              {(filled || half) && (
                <Star
                  className={cn(sizeClass, 'absolute inset-0 fill-warning text-warning')}
                  style={half ? { clipPath: 'inset(0 50% 0 0)' } : undefined}
                />
              )}
            </span>
          );
        })}
      </div>
      <span className="text-[11px] font-medium leading-none text-muted-foreground num-tabular sm:text-xs">
        {toPersianDigits(value.toFixed(1))}
        {count != null && <span> ({toPersianDigits(count)})</span>}
      </span>
    </div>
  );
}
