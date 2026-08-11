'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, Users, Package, Calendar, RefreshCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { PageSpinner } from '@/components/ui/page-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { api, errorMessage } from '@/lib/api';
import { toPersianDigits, formatToman, formatDate } from '@/lib/format';
import { toast } from '@/lib/toast-store';
import type { DailyReport } from '@/lib/types';

export default function AdminReportsPage() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<DailyReport[]>('/admin/reports/daily');
      setReports(data);
    } catch (e) {
      toast({ title: 'بارگذاری گزارش‌ها ناموفق بود', description: errorMessage(e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageSpinner />;

  const totalRevenue = reports.reduce((s, r) => s + Number(r.revenue), 0);
  const totalCommission = reports.reduce((s, r) => s + Number(r.commission), 0);
  const totalNewUsers = reports.reduce((s, r) => s + r.newUsers, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl">گزارش‌های روزانه</h1>
          <p className="mt-1 text-sm text-muted-foreground">داده‌های تولیدشده خودکار توسط سیستم (هر شب ساعت ۰۰:۰۵)</p>
        </div>
        <Button variant="outline" onClick={loadReports} className="gap-1.5">
          <RefreshCcw className="h-4 w-4" /> تازه‌سازی
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={TrendingUp} label="گزارش‌های تولیدشده" value={toPersianDigits(reports.length)} tone="primary" />
        <StatCard icon={DollarSign} label="درآمد کل" value={formatToman(totalRevenue)} tone="success" />
        <StatCard icon={Package} label="کمیسیون پلتفرم (کل)" value={formatToman(totalCommission)} tone="warning" />
        <StatCard icon={Users} label="کاربران جدید (کل)" value={toPersianDigits(totalNewUsers)} tone="info" />
      </div>

      {reports.length === 0 ? (
        <EmptyState
          icon={<Calendar className="mx-auto h-12 w-12 text-muted-foreground" />}
          title="هنوز گزارشی تولید نشده است"
          description="سیستم هر شب ساعت ۰۰:۰۵ گزارش روز قبل را تولید می‌کند."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {['تاریخ', 'سفارش‌ها', 'پرداخت‌شده', 'درآمد', 'کمیسیون', 'کاربران جدید', 'فروشندگان جدید'].map((h) => (
                      <th key={h} className="whitespace-nowrap px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reports.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-muted/30">
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="flex items-center gap-2 font-medium">
                          <Calendar className="h-4 w-4 text-muted-foreground" /> {formatDate(r.date)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground num-tabular">{toPersianDigits(r.ordersCount)}</td>
                      <td className="px-4 py-3 text-muted-foreground num-tabular">{toPersianDigits(r.paidOrdersCount)}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-success num-tabular">{formatToman(r.revenue)}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-warning num-tabular">{formatToman(r.commission)}</td>
                      <td className="px-4 py-3 text-muted-foreground num-tabular">{toPersianDigits(r.newUsers)}</td>
                      <td className="px-4 py-3 text-muted-foreground num-tabular">{toPersianDigits(r.newSellers)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
