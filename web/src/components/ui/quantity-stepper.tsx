'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toPersianDigits } from '@/lib/format';

/**
 * Stepper instead of a free-text quantity field: fewer keystrokes, no invalid input,
 * and the +/- affordance is immediately understood (Jakob's law — matches every
 * shopping-cart UI shoppers already know).
 */
export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  size = 'default',
  disabled,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  size?: 'sm' | 'default';
  disabled?: boolean;
}) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(max != null ? Math.min(max, value + 1) : value + 1);
  const btnSize = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border bg-background',
        disabled && 'opacity-50',
      )}
    >
      <button
        type="button"
        aria-label="کاهش تعداد"
        className={cn(
          'flex items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40',
          btnSize,
        )}
        onClick={dec}
        disabled={disabled || value <= min}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-8 text-center text-sm font-semibold num-tabular" aria-live="polite">
        {toPersianDigits(value)}
      </span>
      <button
        type="button"
        aria-label="افزایش تعداد"
        className={cn(
          'flex items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40',
          btnSize,
        )}
        onClick={inc}
        disabled={disabled || (max != null && value >= max)}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
