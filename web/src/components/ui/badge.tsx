import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        success: 'border-transparent bg-success-bg text-success',
        warning: 'border-transparent bg-warning-bg text-warning',
        info: 'border-transparent bg-info-bg text-info',
        destructive: 'border-transparent bg-destructive-bg text-destructive',
        outline: 'border-border bg-background text-foreground',
        solid: 'border-transparent bg-foreground text-background',
        money: 'border-transparent bg-money-bg text-money',
        /* Admin seller-queue triage — fixed hues used nowhere else */
        pending: 'border-transparent bg-status-pending-bg text-status-pending',
        approved: 'border-transparent bg-status-approved-bg text-status-approved',
        rejected: 'border-transparent bg-status-rejected-bg text-status-rejected',
        suspended: 'border-transparent bg-status-suspended-bg text-status-suspended',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
