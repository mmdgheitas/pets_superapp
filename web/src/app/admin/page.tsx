'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Users,
  Store,
  Package,
  DollarSign,
  AlertCircle,
  Ticket,
  RefreshCcw,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { PageSpinner } from '@/components/ui/page-spinner';
import { api, errorMessage } from '@/lib/api';
import { toPersianDigits, formatToman, formatDate } from '@/lib/format';
import type { AdminDashboard } from '@/lib/types';

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

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

  if (loading) return <PageSpinner />;

  if (error || !dashboard) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <p className="mt-3 text-lg font-bold">خطا در بارگذاری</p>
        <p className="mt-1 text-sm text-muted-foreground">{error || 'داده‌ای دریافت نشد'}</p>
        <Button className="mt-4 gap-1.5" onClick={loadData}>
          <RefreshCcw className="h-4 w-4" /> تلاش مجدد
        </Button>
      </div>
    );
  }

  const { users, sellers, products, orders, tickets } = dashboard;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-extrabold sm:text-2xl">عملیات پلتفرم</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          گزارش روزانه و صف‌های نیازمند تصمیم · {formatDate(new Date().toISOString())}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="تعداد کاربران" value={toPersianDigits(users.total)} sub={`${toPersianDigits(users.customers)} خریدار`} tone="primary" />
        <StatCard icon={Store} label="فروشندگان تأییدشده" value={toPersianDigits(sellers.APPROVED)} sub={`${toPersianDigits(sellers.PENDING)} در انتظار تأیید`} tone="info" />
        <StatCard icon={Package} label="محصولات فعال" value={toPersianDigits(products.ACTIVE)} sub={`${toPersianDigits(products.DRAFT)} پیش‌نویس`} tone="success" />
        <StatCard icon={DollarSign} label="سفارش امروز" value={toPersianDigits(orders.today)} sub={`GMV: ${formatToman(orders.revenueToday)}`} tone="money" />
      </div>

      {/* Actionable alerts first — the things that actually need a human decision today */}
      <div className="space-y-3">
        {tickets.open > 0 && (
          <Card className="border-warning/25 bg-warning-bg/50">
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
                <Ticket className="h-5 w-5" />
              </div>
              <div className="min-w-[180px] flex-1">
                <p className="font-bold">تیکت‌های باز</p>
                <p className="text-sm text-muted-foreground">
                  {toPersianDigits(tickets.open)} تیکت پاسخ‌داده‌نشده وجود دارد.
                </p>
              </div>
              <Link href="/admin/tickets">
                <Button size="sm">مشاهده تیکت‌ها</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {sellers.PENDING > 0 && (
          <Card className="border-info/25 bg-info-bg/50">
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info/15 text-info">
                <Store className="h-5 w-5" />
              </div>
              <div className="min-w-[180px] flex-1">
                <p className="font-bold">درخواست‌های فروشندگی در انتظار</p>
                <p className="text-sm text-muted-foreground">
                  {toPersianDigits(sellers.PENDING)} فروشنده جدید نیاز به تأیید یا رد دارند.
                </p>
              </div>
              <Link href="/admin/sellers?status=PENDING">
                <Button size="sm">مدیریت فروشندگان</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
