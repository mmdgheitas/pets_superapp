'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import { toPersianDigits } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Default matches backend ORDER_PAYMENT_TIMEOUT_MINUTES */
export const RESERVATION_MINUTES = 15;

function formatMmSs(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Calm stock-reservation countdown — turns the 15-minute auto-cancel job into
 * a trust + mild-urgency cue (not a red panic timer).
 */
export function ReservationCountdown({
  totalSeconds = RESERVATION_MINUTES * 60,
  startedAt,
  className,
  label = 'سفارش برای شما رزرو شده',
}: {
  totalSeconds?: number;
  /** ISO or ms — if omitted, counts down from mount */
  startedAt?: string | number;
  className?: string;
  label?: string;
}) {
  const startMs = useMemo(() => {
    if (startedAt == null) return Date.now();
    return typeof startedAt === 'number' ? startedAt : new Date(startedAt).getTime();
  }, [startedAt]);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = Math.max(0, Math.floor((now - startMs) / 1000));
  const remaining = Math.max(0, totalSeconds - elapsed);
  const pct = Math.max(0, Math.min(100, (remaining / totalSeconds) * 100));
  const urgent = remaining > 0 && remaining <= 120;

  if (remaining <= 0) {
    return (
      <div className={cn('rounded-xl border border-warning/30 bg-warning-bg/60 px-3 py-2.5 text-xs text-warning', className)}>
        <p className="flex items-center gap-1.5 font-medium">
          <Clock className="h-3.5 w-3.5" /> مهلت رزرو به پایان رسید — موجودی آزاد می‌شود
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2 rounded-xl border bg-card px-3 py-2.5 shadow-xs', className)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className={cn('h-3.5 w-3.5', urgent ? 'text-warning' : 'text-primary')} />
          {label}
        </span>
        <span className={cn('font-bold num-tabular', urgent ? 'text-warning' : 'text-foreground')} dir="ltr">
          {toPersianDigits(formatMmSs(remaining))}
        </span>
      </div>
      <div className="countdown-track" aria-hidden>
        <div
          className={cn('countdown-fill', urgent && '!bg-warning')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] leading-5 text-muted-foreground">
        تا پایان این زمان موجودی برای شما نگه داشته می‌شود؛ در صورت عدم پرداخت سفارش به‌صورت خودکار لغو می‌شود.
      </p>
    </div>
  );
}

/** Slim bar for OTP resend timer */
export function OtpCountdownBar({
  remaining,
  total,
}: {
  remaining: number;
  total: number;
}) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="countdown-track">
        <div className="countdown-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
