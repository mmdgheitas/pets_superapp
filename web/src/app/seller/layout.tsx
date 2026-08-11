'use client';

import { LayoutDashboard, Package } from 'lucide-react';
import { DashboardShell, type DashboardNavItem } from '@/components/dashboard-shell';
import { PageSpinner } from '@/components/ui/page-spinner';
import { useRoleGuard } from '@/lib/use-role-guard';

const NAV_ITEMS: DashboardNavItem[] = [
  { href: '/seller', label: 'داشبورد', icon: LayoutDashboard, exact: true },
  { href: '/seller/products', label: 'محصولات من', icon: Package },
];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const { ready } = useRoleGuard('SELLER');

  if (!ready) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-6xl">
      <DashboardShell navItems={NAV_ITEMS}>{children}</DashboardShell>
    </div>
  );
}
