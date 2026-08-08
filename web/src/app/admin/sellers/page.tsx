'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Shield, Check, X, AlertCircle, Store } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, errorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { toPersianDigits, formatDate } from '@/lib/format';
import type { AdminSeller, PaginatedSellers } from '@/lib/types';

const STATUS_OPTIONS = [
  { value: 'all', label: 'همه وضعیت‌ها' },
  { value: 'PENDING', label: 'در انتظار تأیید' },
  { value: 'APPROVED', label: 'تأیید شده' },
  { value: 'REJECTED', label: 'رد شده' },
  { value: 'SUSPENDED', label: 'تعلیق' },
];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'در انتظار', cls: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'تأیید شده', cls: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'رد شده', cls: 'bg-red-100 text-red-800' },
  SUSPENDED: { label: 'تعلیق', cls: 'bg-gray-200 text-gray-700' },
};

export default function AdminSellersPage() {
  const router = useRouter();
  const initialStatus = 'all';
  const { token } = useAuthStore();
  const [sellers, setSellers] = useState<AdminSeller[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [approveing, setApproveing] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [suspendMsg, setSuspendMsg] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  const loadSellers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const { data } = await api.get<PaginatedSellers>(`/admin/sellers?${params}`);
      setSellers(data.data);
      setTotal(data.meta.total);
    } catch (e) {
      setError(errorMessage(e, 'بارگذاری فروشندگان'));
      setSellers([]);
    } finally {
      setLoading(false);
    }
  }, [token, page, statusFilter, limit]);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return; // wait for auth hydration
    if (currentUser.role !== 'ADMIN') { router.replace('/'); return; }
    loadSellers();
  }, [token, router, loadSellers]);

  const approve = async (id: string) => {
    setApproveing(id);
    try {
      await api.post(`/admin/sellers/${id}/approve`);
      loadSellers();
    } catch {
      setError('تأیید ناموفق بود');
    } finally {
      setApproveing(null);
    }
  };

  const reject = async (id: string) => {
    setRejecting(id);
    const reason = rejectReason[id];
    if (!reason) return;
    try {
      await api.post(`/admin/sellers/${id}/reject`, { reason });
      setRejectReason((prev) => ({ ...prev, [id]: '' }));
      loadSellers();
    } catch {
      setError('رد ناموفق بود');
    } finally {
      setRejecting(null);
    }
  };

  const suspend = async (id: string) => {
    if (!confirm('آیا مطمئنید که می‌خواهید فروشنده را تعلیق کنید؟ محصولات او غیرفعال می‌شوند.')) return;
    setSuspendMsg(id);
    try {
      await api.post(`/admin/sellers/${id}/suspend`);
      loadSellers();
    } catch {
      setError('تعلیق ناموفق بود');
    } finally {
      setSuspendMsg(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">مدیریت فروشندگان</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          تأیید / رد / تعلیق فروشندگان و مدیریت کمیسیون
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Select
            value={statusFilter}
            onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : sellers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              فروشنده‌ای یافت نشد.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {['فروشگاه', 'مالک', 'موبایل', 'وضعیت', 'کمیسیون', 'محصولات', 'تاریخ درخواست', 'عمل'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sellers.map((s) => {
                      const badge = STATUS_BADGE[s.status];
                      return (
                        <tr key={s.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {s.logoUrl ? (
                                <img
                                  src={s.logoUrl}
                                  alt={s.shopName}
                                  className="h-8 w-8 rounded-full object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                  <Store className="h-4 w-4" />
                                </div>
                              )}
                              <span className="font-medium">{s.shopName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">{s.user.fullName ?? '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <span className="font-mono text-xs" dir="ltr">{toPersianDigits(s.user.phone)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
                              {badge.label}
                            </span>
                            {s.rejectReason && (
                              <p className="mt-1 text-xs text-red-600">دلیل: {s.rejectReason}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {s.status === 'APPROVED' ? (
                              <span className="text-sm text-primary">{Number(s.commissionRate).toFixed(1)}%</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{toPersianDigits(s.productsCount)}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(s.createdAt)}</td>
                          <td className="px-4 py-3 flex items-center gap-1">
                            {s.status === 'PENDING' && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => approve(s.id)}
                                  disabled={approveing === s.id}
                                  title="تأیید فروشنده"
                                >
                                  {approveing === s.id ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                  ) : (
                                    <>
                                      <Check className="mr-1 h-3.5 w-3.5" /> تایید
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-200"
                                  onClick={() => setRejectReason((prev) => ({ ...prev, [s.id]: prev[s.id] ?? '' }))}
                                  disabled={rejecting === s.id}
                                  title="رد فروشنده"
                                >
                                  <X className="mr-1 h-3.5 w-3.5" /> رد
                                </Button>
                              </>
                            )}
                            {s.status === 'APPROVED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-gray-500 border-gray-200"
                                onClick={() => suspend(s.id)}
                                disabled={suspendMsg === s.id}
                                title="تعلیق فروشنده"
                              >
                                {suspendMsg === s.id ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                                ) : (
                                  <>
                                    <AlertCircle className="mr-1 h-3.5 w-3.5" /> تعلیق
                                  </>
                                )}
                              </Button>
                            )}
                            {s.status === 'REJECTED' && (
                              <span className="text-xs text-muted-foreground">رد شده</span>
                            )}
                            {s.status === 'SUSPENDED' && (
                              <span className="text-xs text-muted-foreground">تعلیق</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reject reason inline form */}
      {Object.entries(rejectReason).map(([id, reason]) => (
        <Card key={id} className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="mb-2 text-sm font-medium text-red-800">دلیل رد فروشنده:</p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={reason}
                onChange={(e) => setRejectReason((prev) => ({ ...prev, [id]: e.target.value }))}
                placeholder="دلیل رد (مثلاً: مدارک ناقص)"
                className="flex-1 min-w-[200px]"
              />
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                onClick={() => reason && reject(id)}
                disabled={!reason || rejecting === id}
              >
                {rejecting === id ? 'در حال ارسال…' : 'ثبت رد'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRejectReason((prev) => ({ ...prev, [id]: '' }))}
              >
                انصراف
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            نشان‌دهنده {total} فروشنده
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              قبلی
            </Button>
            <span className="text-sm text-muted-foreground">
              صفحه {toPersianDigits(page)} از {toPersianDigits(totalPages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              بعدی
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
