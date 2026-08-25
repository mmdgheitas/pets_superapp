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
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card/50 px-5 py-12 text-center animate-fade-in sm:px-8 sm:py-16">
      {icon != null && (
        <div className="mb-1 flex items-center justify-center text-5xl leading-none [&_svg]:mx-auto">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold sm:text-lg">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm leading-7 text-muted-foreground">{description}</p>
      )}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="mt-1">
          <Button>{actionLabel}</Button>
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <Button className="mt-1" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
