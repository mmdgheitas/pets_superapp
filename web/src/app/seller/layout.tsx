'use client';

import { LayoutDashboard, Package } from 'lucide-react';
import { DashboardShell, type DashboardNavItem } from '@/components/dashboard-shell';
import { PageSpinner } from '@/components/ui/page-spinner';
import { useAuthGate } from '@/lib/use-auth-gate';
import { SellerProvider } from '@/lib/seller-context';

const NAV_ITEMS: DashboardNavItem[] = [
  { href: '/seller', label: 'داشبورد', icon: LayoutDashboard, exact: true },
  { href: '/seller/products', label: 'محصولات من', icon: Package },
];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const { ready } = useAuthGate();

  if (!ready) return <PageSpinner />;

  return (
    <SellerProvider>
      <div className="mx-auto max-w-6xl">
        <DashboardShell navItems={NAV_ITEMS}>{children}</DashboardShell>
      </div>
    </SellerProvider>
  );
}
