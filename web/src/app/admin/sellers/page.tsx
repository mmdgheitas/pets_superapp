'use client';

import { useEffect, useState, useCallback } from 'react';
import { Check, X, AlertTriangle, Store } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { PageSpinner } from '@/components/ui/page-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, errorMessage } from '@/lib/api';
import { toPersianDigits, formatDate } from '@/lib/format';
import { toast } from '@/lib/toast-store';
import type { AdminSeller, PaginatedSellers } from '@/lib/types';

const STATUS_OPTIONS = [
  { value: 'all', label: 'همه وضعیت‌ها' },
  { value: 'PENDING', label: 'در انتظار تأیید' },
  { value: 'APPROVED', label: 'تأیید شده' },
  { value: 'REJECTED', label: 'رد شده' },
  { value: 'SUSPENDED', label: 'تعلیق' },
];

const STATUS_BADGE: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  PENDING: { label: 'در انتظار', variant: 'warning' },
  APPROVED: { label: 'تأیید شده', variant: 'success' },
  REJECTED: { label: 'رد شده', variant: 'destructive' },
  SUSPENDED: { label: 'تعلیق', variant: 'outline' },
};

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<AdminSeller[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadSellers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const { data } = await api.get<PaginatedSellers>(`/admin/sellers?${params}`);
      setSellers(data.data);
      setTotal(data.meta.total);
    } catch (e) {
      toast({ title: 'بارگذاری فروشندگان ناموفق بود', description: errorMessage(e), variant: 'destructive' });
      setSellers([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, limit]);

  useEffect(() => {
    loadSellers();
  }, [loadSellers]);

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      await api.post(`/admin/sellers/${id}/approve`);
      toast({ title: 'فروشنده تأیید شد', variant: 'success' });
      loadSellers();
    } catch (e) {
      toast({ title: 'تأیید ناموفق بود', description: errorMessage(e), variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    if (!rejectReason.trim()) return;
    setBusyId(id);
    try {
      await api.post(`/admin/sellers/${id}/reject`, { reason: rejectReason.trim() });
      setRejectingId(null);
      setRejectReason('');
      toast({ title: 'فروشنده رد شد' });
      loadSellers();
    } catch (e) {
      toast({ title: 'رد درخواست ناموفق بود', description: errorMessage(e), variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const suspend = async (id: string) => {
    if (!window.confirm('آیا مطمئنید که می‌خواهید فروشنده را تعلیق کنید؟ محصولات او غیرفعال می‌شوند.')) return;
    setBusyId(id);
    try {
      await api.post(`/admin/sellers/${id}/suspend`);
      toast({ title: 'فروشنده تعلیق شد' });
      loadSellers();
    } catch (e) {
      toast({ title: 'تعلیق ناموفق بود', description: errorMessage(e), variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold sm:text-2xl">مدیریت فروشندگان</h1>
        <p className="mt-1 text-sm text-muted-foreground">تأیید، رد یا تعلیق فروشندگان</p>
      </div>

      <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {loading ? (
        <PageSpinner />
      ) : sellers.length === 0 ? (
        <EmptyState icon="🏬" title="فروشنده‌ای یافت نشد" />
      ) : (
        <div className="space-y-3">
          {sellers.map((s) => {
            const badge = STATUS_BADGE[s.status] ?? { label: s.status, variant: 'outline' as const };
            const isRejectingThis = rejectingId === s.id;
            return (
              <Card key={s.id}>
                <CardContent className="flex flex-wrap items-center gap-4 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Store className="h-5 w-5" />
                  </div>
                  <div className="min-w-[160px] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{s.shopName}</span>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {s.user.fullName ?? 'بدون نام'} · <span dir="ltr" className="num-tabular">{toPersianDigits(s.user.phone)}</span> ·{' '}
                      {toPersianDigits(s.productsCount)} محصول · درخواست: {formatDate(s.createdAt)}
                    </p>
                    {s.status === 'APPROVED' && (
                      <p className="mt-0.5 text-xs text-primary">کمیسیون: {toPersianDigits(Number(s.commissionRate).toFixed(1))}٪</p>
                    )}
                    {s.rejectReason && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-destructive">
                        <AlertTriangle className="h-3 w-3" /> دلیل رد: {s.rejectReason}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {s.status === 'PENDING' && !isRejectingThis && (
                      <>
                        <Button size="sm" variant="success" onClick={() => approve(s.id)} loading={busyId === s.id} className="gap-1">
                          <Check className="h-3.5 w-3.5" /> تأیید
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-destructive hover:bg-destructive-bg"
                          onClick={() => { setRejectingId(s.id); setRejectReason(''); }}
                        >
                          <X className="h-3.5 w-3.5" /> رد
                        </Button>
                      </>
                    )}
                    {s.status === 'APPROVED' && (
                      <Button size="sm" variant="outline" onClick={() => suspend(s.id)} loading={busyId === s.id} className="gap-1 text-muted-foreground">
                        <AlertTriangle className="h-3.5 w-3.5" /> تعلیق
                      </Button>
                    )}
                  </div>

                  {/* Inline reject form — appears right under the row it belongs to,
                      not detached at the bottom of the page (Gestalt proximity) */}
                  {isRejectingThis && (
                    <div className="flex w-full flex-wrap items-center gap-2 border-t pt-3">
                      <Input
                        autoFocus
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="دلیل رد را بنویسید (مثلاً: مدارک ناقص)"
                        className="min-w-[220px] flex-1"
                      />
                      <Button size="sm" variant="destructive" onClick={() => reject(s.id)} disabled={!rejectReason.trim()} loading={busyId === s.id}>
                        ثبت رد
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRejectingId(null)}>
                        انصراف
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={total} itemLabel="فروشنده" onChange={setPage} />
    </div>
  );
}
