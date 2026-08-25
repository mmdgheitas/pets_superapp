'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Package, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderTimeline } from '@/components/ui/order-timeline';
import { ReservationCountdown } from '@/components/ui/reservation-countdown';
import { api, errorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { formatDate, formatToman, toPersianDigits } from '@/lib/format';
import { toast } from '@/lib/toast-store';
import type { Order, OrderStatus, Paginated } from '@/lib/types';

const STATUS_LABEL: Record<OrderStatus, { label: string; variant: BadgeProps['variant'] }> = {
  PENDING_PAYMENT: { label: 'در انتظار پرداخت', variant: 'warning' },
  PAID: { label: 'پرداخت‌شده', variant: 'success' },
  PROCESSING: { label: 'در حال آماده‌سازی', variant: 'info' },
  SHIPPED: { label: 'ارسال‌شده', variant: 'info' },
  DELIVERED: { label: 'تحویل‌شده', variant: 'success' },
  CANCELLED: { label: 'لغوشده', variant: 'outline' },
  REFUNDED: { label: 'مرجوع‌شده', variant: 'secondary' },
};

const POLL_MS = 10_000;

export default function OrdersPage() {
  return (
    <AuthGate>
      <OrdersList />
    </AuthGate>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  if (!token) {
    return (
      <EmptyState
        icon="🔒"
        title="ابتدا وارد حساب خود شوید"
        description="برای مشاهده سفارش‌ها باید وارد حساب کاربری خود شوید."
        actionLabel="ورود / ثبت‌نام"
        actionHref="/login"
      />
    );
  }
  return <>{children}</>;
}

function OrdersList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    try {
      const { data } = await api.get<Paginated<Order>>('/orders', { params: { limit: 20 } });
      setOrders(data.data);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    timer.current = setInterval(() => load(true), POLL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  const cancel = async (id: string) => {
    if (!window.confirm('از لغو این سفارش مطمئن هستید؟')) return;
    setBusyId(id);
    try {
      await api.post(`/orders/${id}/cancel`);
      toast({ title: 'سفارش لغو شد' });
      load(true);
    } catch (e) {
      toast({ title: 'لغو سفارش ناموفق بود', description: errorMessage(e), variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const payAgain = async (id: string) => {
    setBusyId(id);
    try {
      const { data } = await api.post<{ paymentUrl: string }>(`/payments/orders/${id}/request`);
      window.location.href = data.paymentUrl;
    } catch (e) {
      toast({ title: 'اتصال به درگاه ناموفق بود', description: errorMessage(e), variant: 'destructive' });
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<Package className="mx-auto h-14 w-14 text-muted-foreground" />}
        title="هنوز سفارشی ثبت نکرده‌اید"
        description="اولین خرید خود را ثبت کنید تا اینجا نمایش داده شود."
        actionLabel="شروع خرید"
        actionHref="/products"
      />
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="space-y-1">
        <h1 className="font-display text-xl font-extrabold sm:text-2xl">سفارش‌های من</h1>
        <p className="text-xs leading-relaxed text-muted-foreground">
          وضعیت‌ها هر چند ثانیه به‌روز می‌شوند — بدون نیاز به رفرش
        </p>
      </div>
      {orders.map((order) => (
        <Card
          key={order.id}
          className={busyId === order.id ? 'opacity-60 transition-opacity' : 'transition-opacity'}
        >
          <CardContent className="flex flex-col gap-3.5 p-3.5 sm:gap-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 text-xs text-muted-foreground sm:text-sm">
                سفارش{' '}
                <span dir="ltr" className="num-tabular">
                  #{order.id.slice(0, 8)}
                </span>{' '}
                · {formatDate(order.createdAt)}
              </div>
              <Badge variant={STATUS_LABEL[order.status].variant}>{STATUS_LABEL[order.status].label}</Badge>
            </div>

            <OrderTimeline status={order.status} />

            {order.status === 'PENDING_PAYMENT' && (
              <ReservationCountdown startedAt={order.createdAt} label="مهلت پرداخت این سفارش" />
            )}

            <ul className="divide-y overflow-hidden rounded-lg border text-sm">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 line-clamp-2 leading-snug">
                    {item.title} × {toPersianDigits(item.quantity)}
                  </span>
                  <span className="shrink-0 pt-0.5 num-tabular">{formatToman(item.totalPrice)}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-2.5 border-t pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <b className="text-sm num-tabular sm:text-base">مجموع: {formatToman(order.total)}</b>
              <div className="flex flex-wrap items-center gap-2">
                {order.payment?.refId && (
                  <span className="text-xs text-muted-foreground num-tabular" dir="ltr">
                    ref: {order.payment.refId}
                  </span>
                )}
                {order.status === 'PENDING_PAYMENT' && (
                  <>
                    <Button size="sm" onClick={() => payAgain(order.id)} disabled={busyId === order.id}>
                      پرداخت <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cancel(order.id)}
                      disabled={busyId === order.id}
                    >
                      لغو سفارش
                    </Button>
                  </>
                )}
              </div>
            </div>
            {order.cancelReason && (
              <p className="text-xs leading-relaxed text-muted-foreground">علت لغو: {order.cancelReason}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
