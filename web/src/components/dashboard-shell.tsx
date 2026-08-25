'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

/**
 * Shared app-shell for the back-office areas (seller + admin). Before this,
 * every sub-page was an island — the only way to move between sections was the
 * browser's back button or navigating all the way back to the dashboard first.
 * A persistent nav (sidebar on desktop, scrollable chips on mobile) turns
 * frequent cross-navigation from a multi-step detour into a single click.
 */
export function DashboardShell({
  navItems,
  children,
}: {
  navItems: DashboardNavItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();

  const isActive = (item: DashboardNavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <div className="grid gap-5 lg:grid-cols-[200px_1fr] xl:grid-cols-[220px_1fr]">
      {/* Mobile/tablet: horizontal scroll chips */}
      <nav className="-mx-1 flex gap-2 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium leading-none transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-card text-foreground/80 hover:bg-accent',
              )}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Desktop: persistent sidebar */}
      <aside className="hidden lg:block">
        <div className="sticky top-20 space-y-0.5 rounded-xl border bg-card p-2 shadow-xs">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm leading-snug transition-colors',
                  active
                    ? 'bg-primary font-semibold text-primary-foreground shadow-soft'
                    : 'text-foreground/80 hover:bg-accent',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </aside>

      <div className="min-w-0 space-y-0">{children}</div>
    </div>
  );
}
