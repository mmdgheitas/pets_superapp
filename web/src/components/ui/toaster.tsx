'use client';

import { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { useToastStore, type Toast as ToastItem } from '@/lib/toast-store';
import { cn } from '@/lib/utils';

const ICONS: Record<string, typeof CheckCircle2> = {
  success: CheckCircle2,
  destructive: XCircle,
  warning: AlertTriangle,
  default: Info,
};

const STYLES: Record<string, string> = {
  success: 'border-success/20 bg-success-bg text-success',
  destructive: 'border-destructive/20 bg-destructive-bg text-destructive',
  warning: 'border-warning/20 bg-warning-bg text-warning',
  default: 'border-border bg-card text-foreground',
};

function ToastCard({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const Icon = ICONS[item.variant ?? 'default'];

  useEffect(() => {
    const t = setTimeout(() => dismiss(item.id), item.duration ?? 3500);
    return () => clearTimeout(t);
  }, [item.id, item.duration, dismiss]);

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 shadow-raised animate-toast-in',
        STYLES[item.variant ?? 'default'],
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{item.title}</p>
        {item.description && <p className="mt-0.5 text-xs opacity-90">{item.description}</p>}
      </div>
      <button
        aria-label="بستن"
        onClick={() => dismiss(item.id)}
        className="shrink-0 rounded-md p-0.5 opacity-60 transition-opacity hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} item={t} />
      ))}
    </div>
  );
}
