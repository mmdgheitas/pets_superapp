import { Check, Clock, Package, Truck, XCircle, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/lib/types';

const FLOW: { key: OrderStatus; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'PENDING_PAYMENT', label: 'ثبت سفارش', icon: Clock },
  { key: 'PAID', label: 'پرداخت', icon: Check },
  { key: 'PROCESSING', label: 'آماده‌سازی', icon: Package },
  { key: 'SHIPPED', label: 'ارسال', icon: Truck },
  { key: 'DELIVERED', label: 'تحویل', icon: Check },
];

const RANK: Record<OrderStatus, number> = {
  PENDING_PAYMENT: 0,
  PAID: 1,
  PROCESSING: 2,
  SHIPPED: 3,
  DELIVERED: 4,
  CANCELLED: -1,
  REFUNDED: -2,
};

/**
 * Calm progressive steps for order status (10s poll feels instant when the
 * active step is already highlighted — no spinner, no "refreshing" chrome).
 */
export function OrderTimeline({ status, className }: { status: OrderStatus; className?: string }) {
  if (status === 'CANCELLED' || status === 'REFUNDED') {
    const Icon = status === 'CANCELLED' ? XCircle : RotateCcw;
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-sm text-muted-foreground',
          className,
        )}
      >
        <Icon className="h-4 w-4 shrink-0 text-destructive" />
        <span>{status === 'CANCELLED' ? 'این سفارش لغو شده است' : 'این سفارش مرجوع شده است'}</span>
      </div>
    );
  }

  const current = RANK[status] ?? 0;

  return (
    <ol className={cn('flex w-full items-start', className)} aria-label="وضعیت سفارش">
      {FLOW.map((step, i) => {
        const active = current === i;
        const completed = current > i;
        const Icon = step.icon;
        const isLast = i === FLOW.length - 1;
        return (
          <li
            key={step.key}
            className={cn('relative flex flex-col items-center gap-1.5 text-center', isLast ? 'shrink-0' : 'min-w-0 flex-1')}
          >
            <div className="relative flex w-full items-center justify-center">
              {!isLast && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute start-1/2 top-1/2 z-0 h-0.5 w-full -translate-y-1/2',
                    current > i ? 'bg-primary' : 'bg-border',
                  )}
                />
              )}
              <span
                className={cn(
                  'relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-card text-[11px] transition-colors',
                  completed
                    ? 'border-primary bg-primary text-primary-foreground'
                    : active
                      ? 'border-primary text-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]'
                      : 'border-border text-muted-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
            </div>
            <span
              className={cn(
                'px-0.5 text-[10px] leading-tight sm:text-[11px]',
                active || completed ? 'font-bold text-foreground' : 'text-muted-foreground',
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
