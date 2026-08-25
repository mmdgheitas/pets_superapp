'use client';

import { TrendingUp, Users, Store, Image as ImageIcon, DollarSign, Ticket } from 'lucide-react';
import { DashboardShell, type DashboardNavItem } from '@/components/dashboard-shell';
import { PageSpinner } from '@/components/ui/page-spinner';
import { useRoleGuard } from '@/lib/use-role-guard';

const NAV_ITEMS: DashboardNavItem[] = [
  { href: '/admin', label: 'نمای کلی', icon: TrendingUp, exact: true },
  { href: '/admin/users', label: 'کاربران', icon: Users },
  { href: '/admin/sellers', label: 'فروشندگان', icon: Store },
  { href: '/admin/banners', label: 'بنرها', icon: ImageIcon },
  { href: '/admin/reports', label: 'گزارش‌ها', icon: DollarSign },
  { href: '/admin/tickets', label: 'تیکت‌ها', icon: Ticket },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { ready } = useRoleGuard('ADMIN');

  if (!ready) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-6xl" data-skin="admin">
      <DashboardShell navItems={NAV_ITEMS}>{children}</DashboardShell>
    </div>
  );
}
