'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, UserCheck, UserX, Shield } from 'lucide-react';
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
import { useAuthStore } from '@/lib/auth-store';
import { toPersianDigits, formatDate } from '@/lib/format';
import { toast } from '@/lib/toast-store';
import type { AdminUser, PaginatedUsers } from '@/lib/types';

const ROLE_BADGE: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  ADMIN: { label: 'مدیر', variant: 'destructive' },
  SELLER: { label: 'فروشنده', variant: 'info' },
  CUSTOMER: { label: 'خریدار', variant: 'success' },
};

export default function AdminUsersPage() {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (q) params.set('q', q);
      if (roleFilter) params.set('role', roleFilter);
      const { data } = await api.get<PaginatedUsers>(`/admin/users?${params}`);
      setUsers(data.data);
      setTotal(data.meta.total);
    } catch (e) {
      toast({ title: 'بارگذاری کاربران ناموفق بود', description: errorMessage(e), variant: 'destructive' });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, q, roleFilter, limit]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const toggleActive = async (id: string, current: boolean) => {
    setToggling(id);
    try {
      await api.patch(`/admin/users/${id}/active`, { isActive: !current });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isActive: !current } : u)));
      toast({ title: current ? 'کاربر غیرفعال شد' : 'کاربر فعال شد' });
    } catch (e) {
      toast({ title: 'عملیات ناموفق بود', description: errorMessage(e), variant: 'destructive' });
    } finally {
      setToggling(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold sm:text-2xl">مدیریت کاربران</h1>
        <p className="mt-1 text-sm text-muted-foreground">مدیریت حساب‌های کاربران و تغییر وضعیت آن‌ها</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="جستجو در موبایل/نام/ایمیل…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          startIcon={<Search className="h-4 w-4" />}
          className="min-w-[220px] flex-1"
        />
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v === 'all' ? null : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="همه نقش‌ها" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه نقش‌ها</SelectItem>
            <SelectItem value="CUSTOMER">خریدار</SelectItem>
            <SelectItem value="SELLER">فروشنده</SelectItem>
            <SelectItem value="ADMIN">مدیر</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <PageSpinner />
      ) : users.length === 0 ? (
        <EmptyState icon="👤" title="کاربری یافت نشد" description="فیلترها را تغییر دهید یا جستجوی دیگری را امتحان کنید." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {['موبایل', 'نام', 'ایمیل', 'نقش', 'تاریخ عضویت', 'سفارش‌ها', 'وضعیت', 'عمل'].map((h) => (
                      <th key={h} className="whitespace-nowrap px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((u) => (
                    <tr key={u.id} className="transition-colors hover:bg-muted/30">
                      <td className="whitespace-nowrap px-4 py-3 num-tabular" dir="ltr">{toPersianDigits(u.phone)}</td>
                      <td className="px-4 py-3 font-medium">{u.fullName ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={ROLE_BADGE[u.role]?.variant ?? 'outline'}>{ROLE_BADGE[u.role]?.label ?? u.role}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3 text-muted-foreground num-tabular">{toPersianDigits(u.ordersCount)}</td>
                      <td className="px-4 py-3">
                        {u.isActive ? (
                          <span className="flex items-center gap-1 text-sm text-success"><Shield className="h-4 w-4" /> فعال</span>
                        ) : (
                          <span className="flex items-center gap-1 text-sm text-destructive"><UserX className="h-4 w-4" /> غیرفعال</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {u.id !== currentUserId && (
                          <Button variant="outline" size="sm" onClick={() => toggleActive(u.id, u.isActive)} loading={toggling === u.id} className="gap-1">
                            {u.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                            {u.isActive ? 'غیرفعال کن' : 'فعال کن'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Pagination page={page} totalPages={totalPages} total={total} itemLabel="کاربر" onChange={setPage} />
    </div>
  );
}
