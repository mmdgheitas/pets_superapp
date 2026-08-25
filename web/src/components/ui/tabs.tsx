'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Tabs({
  tabs,
  defaultValue,
}: {
  tabs: { value: string; label: string; content: ReactNode }[];
  defaultValue?: string;
}) {
  const [active, setActive] = useState(defaultValue ?? tabs[0]?.value);
  const activeTab = tabs.find((t) => t.value === active) ?? tabs[0];

  return (
    <div className="min-w-0">
      <div
        role="tablist"
        className="-mx-1 flex gap-0.5 overflow-x-auto border-b px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active === tab.value}
            onClick={() => setActive(tab.value)}
            className={cn(
              'relative shrink-0 px-3 py-2.5 text-sm font-semibold leading-none text-muted-foreground transition-colors hover:text-foreground sm:px-4 sm:py-3',
              active === tab.value && 'text-primary',
            )}
          >
            {tab.label}
            {active === tab.value && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="animate-fade-in py-4 sm:py-5">
        {activeTab?.content}
      </div>
    </div>
  );
}
