'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, Users, Package, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api, errorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { toPersianDigits, formatToman, formatDate } from '@/lib/format';
import type { DailyReport } from '@/lib/types';

export default function AdminReportsPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    if (token && useAuthStore.getState().user?.role !== 'ADMIN') { router.replace('/'); return; }
    loadReports();
  }, [token, router]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<DailyReport[]>('/admin/reports/daily');
      setReports(data);
    } catch (e) {
      setError(errorMessage(e, 'بارگذاری گزارش‌ها ناموفق بود'));
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

  const totalRevenue = reports.reduce((s, r) => s + Number(r.revenue), 0);
  const totalCommission = reports.reduce((s, r) => s + Number(r.commission), 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">گزارش‌های روزانه</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          داده‌های تولیدشده خودکار توسط سیستم (Job زمان‌بندی هر شب)
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">گزارش‌های تولیدشده</p>
              <p className="text-xl font-bold text-primary">{toPersianDigits(reports.length)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700">
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">ساختار درآمد کل</p>
              <p className="text-xl font-bold text-primary">{formatToman(totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
              <Package className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">کمیسیون پلتفرم (کل)</p>
              <p className="text-xl font-bold text-primary">{formatToman(totalCommission)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">کاربران جدید (کل)</p>
              <p className="text-xl font-bold text-primary">
                {toPersianDigits(reports.reduce((s, r) => s + r.newUsers, 0))}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Table */}
      <div>
        <h2 className="mb-3 text-lg font-bold">جدول گزارش‌های روزانه</h2>
        {reports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              هنوز گزارشی تولیدشده نیست. سیستم هر شب ساعت ۰۰:۰۵ گزارش روز before را تولید می‌کند.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {['تاریخ', 'سفارش‌ها', 'پرداخت شده', 'درآمد (تومان)', 'کمیسیون (تومان)', 'کاربران جدید', 'فروشندگان جدید'].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reports.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{formatDate(r.date)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{toPersianDigits(r.ordersCount)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{toPersianDigits(r.paidOrdersCount)}</td>
                        <td className="px-4 py-3 font-medium text-green-700">{formatToman(r.revenue)}</td>
                        <td className="px-4 py-3 font-medium text-orange-700">{formatToman(r.commission)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{toPersianDigits(r.newUsers)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{toPersianDigits(r.newSellers)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Refresh button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={loadReports}>
          <Calendar className="mr-2 h-4 w-4" /> تازه‌سازی
        </Button>
      </div>
    </div>
  );
}
