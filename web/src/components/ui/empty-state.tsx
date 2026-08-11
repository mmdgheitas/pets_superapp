import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

/**
 * A consistent, encouraging empty state instead of a bare sentence.
 * Psychology: give the user a clear next action (avoid dead ends / the "paradox of choice"
 * by offering exactly one primary path forward).
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card/50 px-6 py-16 text-center animate-fade-in">
      {icon && <div className="text-5xl">{icon}</div>}
      <h3 className="text-lg font-bold">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="mt-2">
          <Button>{actionLabel}</Button>
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <Button className="mt-2" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
