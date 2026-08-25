'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Package,
  ShoppingCart,
  DollarSign,
  Users,
  AlertCircle,
  TrendingUp,
  Calendar,
  Store,
  RefreshCcw,
  Clock,
  XCircle,
  Ban,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { PageSpinner } from '@/components/ui/page-spinner';
import { SellerRegisterForm } from '@/components/seller-register-form';
import { CommissionCard } from '@/components/ui/commission-card';
import { useSeller } from '@/lib/seller-context';
import { api, errorMessage } from '@/lib/api';
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
import type { SellerDashboard, SalesReport, SalesReportSeries, OrderStatus } from '@/lib/types';

const CHART_COLORS = ['#1f6f68', '#2a9d8f', '#7bc4bb'];

const ORDER_STATUS: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  PAID: { label: 'پرداخت شد', variant: 'success' },
  PROCESSING: { label: 'در حال آماده‌سازی', variant: 'info' },
  SHIPPED: { label: 'ارسال شده', variant: 'info' },
  DELIVERED: { label: 'تحویل داده شده', variant: 'success' },
  PENDING_PAYMENT: { label: 'منتظر پرداخت', variant: 'warning' },
  CANCELLED: { label: 'لغو شده', variant: 'outline' },
  REFUNDED: { label: 'استرداد', variant: 'secondary' },
};

export default function SellerDashboardPage() {
  const { seller, loading: sellerLoading, notRegistered, refresh } = useSeller();

  if (sellerLoading) return <PageSpinner />;
  if (notRegistered) return <SellerRegisterForm onRegistered={refresh} />;
  if (!seller) return null;

  if (seller.status !== 'APPROVED') {
    return <PendingStatusCard status={seller.status} shopName={seller.shopName} rejectReason={seller.rejectReason} />;
  }

  return <ApprovedDashboard shopName={seller.shopName} />;
}

function PendingStatusCard({
  status,
  shopName,
  rejectReason,
}: {
  status: string;
  shopName: string;
  rejectReason: string | null;
}) {
  const config = {
    PENDING: {
      icon: Clock,
      tone: 'warning' as const,
      title: 'درخواست شما در حال بررسی است',
      description: 'تیم پت‌شاپ درخواست فروشندگی شما را بررسی می‌کند. معمولاً این کار ۱ تا ۲ روز کاری زمان می‌برد.',
    },
    REJECTED: {
      icon: XCircle,
      tone: 'destructive' as const,
      title: 'درخواست فروشندگی رد شد',
      description: rejectReason ? `دلیل: ${rejectReason}` : 'برای اطلاعات بیشتر با پشتیبانی تماس بگیرید.',
    },
    SUSPENDED: {
      icon: Ban,
      tone: 'destructive' as const,
      title: 'فروشگاه شما تعلیق شده است',
      description: 'محصولات شما موقتاً غیرفعال شده‌اند. برای رفع تعلیق با پشتیبانی تماس بگیرید.',
    },
  }[status] ?? {
    icon: AlertCircle,
    tone: 'outline' as const,
    title: 'وضعیت نامشخص',
    description: '',
  };

  const Icon = config.icon;

  return (
    <div className="mx-auto max-w-lg py-10 text-center">
      <span
        className={
          'mx-auto flex h-16 w-16 items-center justify-center rounded-full ' +
          (config.tone === 'warning' ? 'bg-warning-bg text-warning' : 'bg-destructive-bg text-destructive')
        }
      >
        <Icon className="h-8 w-8" />
      </span>
      <h1 className="mt-4 text-xl font-extrabold">{config.title}</h1>
      <p className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Store className="h-4 w-4" /> {shopName}
      </p>
      {config.description && <p className="mt-3 text-sm leading-7 text-muted-foreground">{config.description}</p>}
      <Link href="/products" className="mt-6 inline-block">
        <Button variant="outline">مشاهده فروشگاه به‌عنوان خریدار</Button>
      </Link>
    </div>
  );
}

function ApprovedDashboard({ shopName }: { shopName: string }) {
  const [dashboard, setDashboard] = useState<SellerDashboard | null>(null);
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

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

  const { stats } = dashboard;
  const chartData: SalesReportSeries[] = report?.series ?? [];
  const totalRevenue = chartData.reduce((s, d) => s + d.revenue, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold sm:text-2xl">
            <Store className="h-5 w-5 text-primary" /> {shopName}
          </h1>
          <Badge variant="success" className="mt-1.5">تأیید شده</Badge>
        </div>
        <Link href="/seller/products/new">
          <Button className="gap-1.5">
            <Package className="h-4 w-4" /> ثبت محصول جدید
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard
          icon={Package}
          label="تعداد محصولات"
          value={toPersianDigits(stats.totalProducts)}
          sub={`${toPersianDigits(stats.activeProducts)} فعال · ${toPersianDigits(stats.outOfStock)} بدون موجودی`}
          tone="primary"
        />
        <StatCard
          icon={ShoppingCart}
          label="سفارش‌های پرداخت‌شده"
          value={toPersianDigits(stats.paidOrderItems)}
          sub={`${toPersianDigits(stats.unitsSold)} واحد فروخته شده`}
          tone="success"
        />
        <StatCard
          icon={DollarSign}
          label="درآمد خالص فروشنده"
          value={formatToman(stats.revenueIrr)}
          sub="پس از کسر کمیسیون پلتفرم"
          tone="money"
        />
        <StatCard
          icon={AlertCircle}
          label="در انتظار ارسال"
          value={toPersianDigits(stats.pendingFulfillment)}
          sub="نیاز به بسته‌بندی و ارسال"
          tone="warning"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-5 lg:gap-6">
        <Card className="min-w-0 lg:col-span-3">
          <CardHeader className="flex-col items-stretch gap-2 space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-[18px] w-[18px] shrink-0 text-money" /> GMV خالص ۳۰ روز
            </CardTitle>
            <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              {toPersianDigits(chartData.length)} روز ·{' '}
              <span className="money-figure text-sm">{formatToman(totalRevenue)}</span>
            </span>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="h-56 w-full min-w-0 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
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
                        return toman >= 1_000_000
                          ? `${(toman / 1_000_000).toFixed(0)}M`
                          : toman >= 1000
                            ? `${(toman / 1000).toFixed(0)}k`
                            : String(toman);
                      }}
                      width={42}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatToman(value), 'درآمد']}
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
              <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                هنوز سفارشی ثبت نشده است.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <CommissionCard rate={dashboard.seller.commissionRate ?? 5} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-[18px] w-[18px] text-primary" /> فروش‌های اخیر
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard.recentSales.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">هنوز فروشی ثبت نشده است.</p>
              ) : (
                <div className="space-y-2.5">
                  {dashboard.recentSales.map((sale) => {
                    const info = ORDER_STATUS[sale.order.status as OrderStatus] ?? {
                      label: sale.order.status,
                      variant: 'outline' as const,
                    };
                    return (
                      <div key={sale.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{sale.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {toPersianDigits(sale.quantity)} عدد · {formatDate(sale.order.createdAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-sm font-bold text-money num-tabular">
                            {formatToman(sale.sellerAmount)}
                          </span>
                          <Badge variant={info.variant}>{info.label}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
