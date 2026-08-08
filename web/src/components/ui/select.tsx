import * as React from 'react';
import { cn } from '@/lib/utils';

const SelectContext = React.createContext<{
  value: string | null;
  onValueChange: (value: string) => void;
} | null>(null);

function useSelectContext() {
  const ctx = React.useContext(SelectContext);
  if (!ctx) throw new Error('Select components must be wrapped in a <Select>');
  return ctx;
}

export function Select({ value, onValueChange, children, ...props }: { value?: string | null; onValueChange?: (value: string) => void } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <SelectContext.Provider value={{ value: value ?? null, onValueChange: onValueChange ?? (() => {}) }}>
      <div {...props}>{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { value, onValueChange } = useSelectContext();
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
        className,
      )}
      onClick={() => {}}
      {...props}
    >
      {children ?? <SelectValue />}
      <svg className="ml-2 h-4 w-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}

export function SelectContent({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SelectItem({ value, children, className, ...props }: { value: string; children?: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  const { value: sel, onValueChange } = useSelectContext();
  const active = sel === value;
  return (
    <div
      role="option"
      aria-selected={active}
      className={cn(
        'relative cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
        active && 'bg-accent text-accent-foreground',
        className,
      )}
      onClick={() => onValueChange(value)}
      {...props}
    >
      {children ?? value}
    </div>
  );
}

export function SelectValue() {
  const { value } = useSelectContext();
  return <span>{value ?? ''}</span>;
}
