import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ' +
    'transition-[background-color,color,box-shadow,transform] duration-150 ease-spring ' +
    'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-soft hover:bg-primary-hover hover:shadow-card',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
        destructive: 'bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90',
        success: 'bg-success text-success-foreground shadow-soft hover:bg-success/90',
        outline: 'border border-input bg-background hover:border-primary/40 hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-[13px]',
        lg: 'h-12 rounded-lg px-6 text-[15px]',
        xl: 'h-14 rounded-xl px-8 text-base',
        icon: 'h-10 w-10 shrink-0',
        'icon-sm': 'h-8 w-8 shrink-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

export { Button, buttonVariants };
