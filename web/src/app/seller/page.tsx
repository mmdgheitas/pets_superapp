'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Package,
  ShoppingCart,
  DollarSign,
  Users,
  AlertCircle,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api, errorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { toPersianDigits, formatToman, formatDate } from '@/lib/format';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { SellerDashboard, SalesReport, SalesReportSeries } from '@/lib/types';

const CHART_COLORS = ['#7c3aed', '#a78bfa', '#c4b5fd'];

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

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    PAID: { label: 'پرداخت شد', cls: 'bg-green-100 text-green-800' },
    PROCESSING: { label: 'در تحویل', cls: 'bg-blue-100 text-blue-800' },
    SHIPPED: { label: 'ارسال شده', cls: 'bg-purple-100 text-purple-800' },
    DELIVERED: { label: 'تحویل داده شده', cls: 'bg-emerald-100 text-emerald-800' },
    PENDING_PAYMENT: { label: 'منتظر پرداخت', cls: 'bg-yellow-100 text-yellow-800' },
    CANCELLED: { label: 'لغو شده', cls: 'bg-red-100 text-red-800' },
    REFUNDED: { label: 'استرداد', cls: 'bg-orange-100 text-orange-800' },
  };
  const { label, cls } = cfg[status] ?? { label: status, cls: 'bg-gray-100 text-gray-800' };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

export default function SellerDashboardPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [dashboard, setDashboard] = useState<SellerDashboard | null>(null);
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login');
      return;
    }
    if (!user) {
      // Auth store not yet hydrated — wait for next render
      return;
    }
    if (user.role !== 'SELLER') {
      router.replace('/');
      return;
    }
    loadData();
  }, [accessToken, user, router]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [d, r] = await Promise.all([
        api.get<SellerDashboard>('/sellers/me/dashboard'),
        api.get<SalesReport>('/sellers/me/sales-report?days=30'),
      ]);
      setDashboard(d.data);
      setReport(r.data);
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

  const { seller, stats } = dashboard;

  const chartData: SalesReportSeries[] =
    report?.series ?? [];

  const totalRevenue = chartData.reduce((s, d) => s + d.revenue, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">داشبورد فروشندگی</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            فروشگاه {seller.shopName} — {' '}
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                seller.status === 'APPROVED'
                  ? 'bg-green-100 text-green-800'
                  : seller.status === 'PENDING'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {seller.status === 'APPROVED' ? 'تأیید شده' : seller.status === 'PENDING' ? 'در انتظار تأیید' : 'رد شده/تعلیق'}
            </span>
          </p>
        </div>
        <a
          href="/seller/products"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          مدیریت محصولات
        </a>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Package}
          label="تعداد محصولات"
          value={toPersianDigits(stats.totalProducts)}
          sub={`${stats.activeProducts} فعال · ${stats.outOfStock} موجودی منتهی`}
          color="#7c3aed"
          delay={0}
        />
        <StatCard
          icon={ShoppingCart}
          label="سفارش‌های پرداخت شده"
          value={toPersianDigits(stats.paidOrderItems)}
          sub={`${toPersianDigits(stats.unitsSold)} واحد فروخته شده`}
          color="#16a34a"
          delay={50}
        />
        <StatCard
          icon={DollarSign}
          label="درآمد فروشنده"
          value={formatToman(stats.revenueIrr)}
          sub="از سفارش‌های پذیرفته شده"
          color="#0891b2"
          delay={100}
        />
        <StatCard
          icon={AlertCircle}
          label="سفارش‌های انتظار تحویل"
          value={toPersianDigits(stats.pendingFulfillment)}
          sub="نیاز به بر 패킷/ارسال"
          color="#dc2626"
          delay={150}
        />
      </div>

      {/* Chart + recent sales */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Chart */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              فروش ۳۰ روز گذشته
            </CardTitle>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {chartData.length} روز · کل درآمد {formatToman(totalRevenue)}
            </span>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickFormatter={(v) => {
                        const parts = v.split('/');
                        return parts.length === 3 ? `${parts[2]}/${parts[1]}` : v;
                      }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickFormatter={(v) => {
                        const toman = Math.round(v / 10);
                        return toman >= 1_000_000 ? `${(toman / 1_000_000).toFixed(0)}M` : toman >= 1000 ? `${(toman / 1000).toFixed(0)}k` : String(toman);
                      }}
                      width={42}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatToman(value), 'درآمد (تومان)']}
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#f9fafb',
                        fontSize: '13px',
                        padding: '8px 12px',
                      }}
                      labelFormatter={(label) => {
                        const parts = label.split('/');
                        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : label;
                      }}
                    />
                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center rounded-lg border border-dashed py-12 text-sm text-muted-foreground">
                هنوز سفارشی ثبت نشده است.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent sales */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              فروش‌های اخیر
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.recentSales.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                هنوز فروش‌ای ثبت نشده است.
              </p>
            ) : (
              <div className="space-y-3">
                {dashboard.recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{sale.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {sale.quantity} × {formatToman(sale.sellerAmount)} ·{' '}
                        {formatDate(sale.order.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-sm font-semibold text-green-700">
                        {formatToman(sale.sellerAmount)}
                      </span>
                      <StatusBadge status={sale.order.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom note */}
      <div className="text-center text-sm text-muted-foreground">
        آیا فروشنده هستید؟{' '}
        <a
          href="/login"
          className="text-primary underline-offset-4 hover:underline font-medium"
        >
          ورود با اکانت دیگر
        </a>
      </div>
    </div>
  );
}
