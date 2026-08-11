import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Field({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      {children}
      {error && <span className="block text-xs text-destructive">{error}</span>}
    </label>
  );
}
