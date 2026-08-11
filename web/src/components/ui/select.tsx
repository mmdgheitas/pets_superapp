'use client';

import * as React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectContextValue {
  value: string | null;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  registerLabel: (value: string, label: React.ReactNode) => void;
  getLabel: (value: string) => React.ReactNode | undefined;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const ctx = React.useContext(SelectContext);
  if (!ctx) throw new Error('Select components must be wrapped in a <Select>');
  return ctx;
}

/**
 * A small dependency-free select/combobox. Functionally equivalent to a native
 * <select> (click to open, click an option to choose, click outside/Escape to close)
 * but themeable to match the rest of the design system.
 */
export function Select({
  value,
  onValueChange,
  children,
  className,
  ...props
}: {
  value?: string | null;
  onValueChange?: (value: string) => void;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const labelsRef = React.useRef(new Map<string, React.ReactNode>());

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const ctx: SelectContextValue = {
    value: value ?? null,
    onValueChange: (v) => {
      onValueChange?.(v);
      setOpen(false);
    },
    open,
    setOpen,
    registerLabel: (v, label) => labelsRef.current.set(v, label),
    getLabel: (v) => labelsRef.current.get(v),
  };

  return (
    <SelectContext.Provider value={ctx}>
      <div ref={rootRef} className={cn('relative', className)} {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = useSelectContext();
  return (
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      className={cn(
        'inline-flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground/70 hover:border-primary/40 focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
        className,
      )}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {children ?? <SelectValue />}
      <ChevronDown className={cn('h-4 w-4 shrink-0 opacity-50 transition-transform', open && 'rotate-180')} />
    </button>
  );
}

export function SelectContent({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { open } = useSelectContext();
  if (!open) return null;
  return (
    <div
      role="listbox"
      className={cn(
        'absolute end-0 start-0 top-full z-50 mt-1.5 max-h-72 min-w-[8rem] overflow-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-popover animate-scale-in',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SelectItem({
  value,
  children,
  className,
  ...props
}: { value: string; children?: React.ReactNode } & Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'>) {
  const { value: sel, onValueChange, registerLabel } = useSelectContext();
  const active = sel === value;

  registerLabel(value, children ?? value);

  return (
    <div
      role="option"
      aria-selected={active}
      className={cn(
        'flex cursor-pointer select-none items-center justify-between gap-2 rounded-md px-3 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground',
        active && 'bg-accent font-medium text-accent-foreground',
        className,
      )}
      onClick={() => onValueChange(value)}
      {...props}
    >
      {children ?? value}
      {active && <Check className="h-3.5 w-3.5" />}
    </div>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value, getLabel } = useSelectContext();
  if (value == null) return <span className="text-muted-foreground/70">{placeholder ?? ''}</span>;
  return <span>{getLabel(value) ?? value}</span>;
}
