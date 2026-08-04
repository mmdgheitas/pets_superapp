'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { formatDate, formatToman, toPersianDigits } from '@/lib/format';
import type { Order, OrderStatus, Paginated } from '@/lib/types';

const STATUS_LABEL: Record<OrderStatus, { label: string; className: string }> = {
  PENDING_PAYMENT: { label: 'در انتظار پرداخت', className: 'bg-yellow-100 text-yellow-800' },
  PAID: { label: 'پرداخت‌شده', className: 'bg-green-100 text-green-800' },
  PROCESSING: { label: 'در حال آماده‌سازی', className: 'bg-blue-100 text-blue-800' },
  SHIPPED: { label: 'ارسال‌شده', className: 'bg-indigo-100 text-indigo-800' },
  DELIVERED: { label: 'تحویل‌شده', className: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'لغوشده', className: 'bg-gray-200 text-gray-700' },
  REFUNDED: { label: 'مرجوع‌شده', className: 'bg-purple-100 text-purple-800' },
};

const POLL_MS = 10_000; // per spec: 10-second polling instead of websockets

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
      <div className="py-16 text-center">
        <p className="mb-4">برای مشاهده سفارش‌ها وارد شوید.</p>
        <Link href="/login">
          <Button>ورود</Button>
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}

function OrdersList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
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
    // Poll order statuses every 10 seconds while the tab is open
    timer.current = setInterval(() => load(true), POLL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  const cancel = async (id: string) => {
    await api.post(`/orders/${id}/cancel`).catch(() => undefined);
    load(true);
  };

  const payAgain = async (id: string) => {
    try {
      const { data } = await api.post<{ paymentUrl: string }>(`/payments/orders/${id}/request`);
      window.location.href = data.paymentUrl;
    } catch {
      /* surfaced on next poll */
    }
  };

  if (loading) return <p className="py-16 text-center text-muted-foreground">در حال بارگذاری…</p>;

  if (orders.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="mb-2 text-5xl">📦</p>
        <p className="mb-4">هنوز سفارشی ثبت نکرده‌اید.</p>
        <Link href="/products">
          <Button>شروع خرید</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="mb-4 text-xl font-bold">سفارش‌های من</h1>
      {orders.map((order) => (
        <Card key={order.id}>
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-muted-foreground">
                سفارش <span dir="ltr">#{order.id.slice(0, 8)}</span> · {formatDate(order.createdAt)}
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_LABEL[order.status].className}`}>
                {STATUS_LABEL[order.status].label}
              </span>
            </div>
            <ul className="text-sm">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between border-b py-1 last:border-0">
                  <span className="line-clamp-1">{item.title} × {toPersianDigits(item.quantity)}</span>
                  <span>{formatToman(item.totalPrice)}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between">
              <b>مجموع: {formatToman(order.total)}</b>
              {order.status === 'PENDING_PAYMENT' && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => payAgain(order.id)}>
                    پرداخت
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => cancel(order.id)}>
                    لغو سفارش
                  </Button>
                </div>
              )}
              {order.payment?.refId && (
                <span className="text-xs text-muted-foreground" dir="ltr">
                  ref: {order.payment.refId}
                </span>
              )}
            </div>
            {order.cancelReason && (
              <p className="text-xs text-muted-foreground">علت لغو: {order.cancelReason}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
