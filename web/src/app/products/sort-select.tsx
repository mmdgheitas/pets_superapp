'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpDown, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const SORTS = [
  { value: 'newest', label: 'جدیدترین' },
  { value: 'best_selling', label: 'پرفروش‌ترین' },
  { value: 'top_rated', label: 'محبوب‌ترین' },
  { value: 'price_asc', label: 'ارزان‌ترین' },
  { value: 'price_desc', label: 'گران‌ترین' },
] as const;

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = SORTS.find((s) => s.value === value) ?? SORTS[0];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const setSort = (sort: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('sort', sort);
    next.set('page', '1');
    router.push(`/products?${next.toString()}`);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-medium leading-none shadow-xs transition-colors hover:border-primary/40 sm:w-auto"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-start sm:flex-none">مرتب‌سازی: {current.label}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute end-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-popover animate-scale-in"
        >
          {SORTS.map((s) => (
            <button
              key={s.value}
              role="option"
              aria-selected={s.value === value}
              onClick={() => setSort(s.value)}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                s.value === value && 'font-semibold text-primary',
              )}
            >
              {s.label}
              {s.value === value && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
