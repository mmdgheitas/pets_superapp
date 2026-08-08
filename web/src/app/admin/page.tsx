'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Users,
  Store,
  Package,
  DollarSign,
  AlertCircle,
  Ticket,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api, errorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { toPersianDigits, formatToman, formatDate } from '@/lib/format';
import Link from 'next/link';
import type { AdminDashboard } from '@/lib/types';

const NAV_ITEMS = [
  {
    href: '/admin',
    label: 'نمای کلی',
    icon: TrendingUp,
    roles: ['ADMIN' as const],
  },
  {
    href: '/admin/users',
    label: 'مدیریت کاربران',
    icon: Users,
    roles: ['ADMIN' as const],
  },
  {
    href: '/admin/sellers',
    label: 'مدیریت فروشندگان',
    icon: Store,
    roles: ['ADMIN' as const],
  },
  {
    href: '/admin/banners',
    label: 'مدیریت بنرها',
    icon: Package,
    roles: ['ADMIN' as const],
  },
  {
    href: '/admin/reports',
    label: 'گزارش‌های روزانه',
    icon: DollarSign,
    roles: ['ADMIN' as const],
  },
  {
    href: '/admin/tickets',
    label: 'تیکت‌های پشتیبانی',
    icon: Ticket,
    roles: ['ADMIN' as const],
  },
];

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  color: string;
  delay?: number;
}) {
  return (
    <Card
      className="transition-all hover:shadow-md"
      style={{ animationDelay: `${delay ?? 0}ms` }}
    >
      <CardContent className="flex items-start gap-3 p-4">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}18`, color }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-primary">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      router.replace('/login');
      return;
    }
    if (user?.role !== 'ADMIN') {
      router.replace('/');
      return;
    }
    loadData();
  }, [token, user, router]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<AdminDashboard>('/admin/dashboard');
      setDashboard(data);
    } catch (e) {
      setError(errorMessage(e, 'بارگذاری داده‌ها ناموفق بود'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="mx-auto max-w-2xl text-center py-20">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <p className="mt-3 text-lg font-medium">خطا در بارگذاری</p>
        <p className="mt-1 text-sm text-muted-foreground">{error || 'داده‌ای دریافت نشد'}</p>
        <Button className="mt-4" onClick={loadData}>
          تلاش مجدد
        </Button>
      </div>
    );
  }

  const { users, sellers, products, orders, tickets } = dashboard;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">پنل مدیریت پت‌شاپ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ورود با account مدیر · {formatDate(new Date().toISOString())}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="تعداد کاربران"
          value={toPersianDigits(users.total)}
          sub={`${toPersianDigits(users.customers)} خریدار`}
          color="#7c3aed"
          delay={0}
        />
        <StatCard
          icon={Store}
          label="فروشندگان"
          value={toPersianDigits(sellers.APPROVED)}
          sub={`${toPersianDigits(sellers.PENDING)} در انتظار تأیید`}
          color="#0891b2"
          delay={80}
        />
        <StatCard
          icon={Package}
          label="محصولات"
          value={toPersianDigits(products.ACTIVE)}
          sub={`${toPersianDigits(products.DRAFT)} پیش‌نویس`}
          color="#16a34a"
          delay={160}
        />
        <StatCard
          icon={DollarSign}
          label="سفارش امروز"
          value={toPersianDigits(orders.today)}
          sub={`درآمد: ${formatToman(orders.revenueToday)}`}
          color="#dc2626"
          delay={240}
        />
      </div>

      {/* Navigation cards */}
      <div>
        <h2 className="mb-4 text-lg font-bold">작업‌ها</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="text-base font-medium">{item.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Tickets alert */}
      {tickets.open > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-yellow-200 text-yellow-800">
              <Ticket className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium">تیکت‌های باز برخوردارند</p>
              <p className="text-sm text-yellow-700">
                {toPersianDigits(tickets.open)} تیکت پاسخ‌دهی‌نشده وجود دارد —
                حتماً بررسی شوند.
              </p>
            </div>
            <Link href="/admin/tickets">
              <Button size="sm">مشاهده تیکت‌ها</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Pending sellers alert */}
      {sellers.PENDING > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-200 text-blue-800">
              <Store className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium">درخواست‌های فروشندگی در انتظار</p>
              <p className="text-sm text-blue-700">
                {toPersianDigits(sellers.PENDING)} فروشنده جدید نیاز به تأیید/رد دارند.
              </p>
            </div>
            <Link href="/admin/sellers?status=PENDING">
              <Button size="sm">مدیریت فروشندگان</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Open orders alert */}
      {orders.today > 0 && (
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700">
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium">فعالیت امروز</p>
              <p className="text-sm text-green-700">
                {toPersianDigits(orders.today)} سفارش امروز ثبت شد · درآمد: {formatToman(orders.revenueToday)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
