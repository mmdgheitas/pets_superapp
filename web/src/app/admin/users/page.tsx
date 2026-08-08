'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Search, UserCheck, UserX, Shield, UserCog } from 'lucide-react';
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
import type { AdminUser, PaginatedUsers } from '@/lib/types';

const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800',
  SELLER: 'bg-blue-100 text-blue-800',
  CUSTOMER: 'bg-green-100 text-green-800',
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (q) params.set('q', q);
      if (roleFilter) params.set('role', roleFilter);
      const { data } = await api.get<PaginatedUsers>(`/admin/users?${params}`);
      setUsers(data.data);
      setTotal(data.meta.total);
    } catch (e) {
      setError(errorMessage(e, 'بارگذاری کاربران'));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [token, page, q, roleFilter, limit]);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    if (token && useAuthStore.getState().user?.role !== 'ADMIN') { router.replace('/'); return; }
    loadUsers();
  }, [token, router, loadUsers]);

  const toggleActive = async (id: string, current: boolean) => {
    setToggling(id);
    try {
      await api.patch(`/admin/users/${id}/active`, { isActive: !current });
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, isActive: !current } : u))
      );
    } catch {
      /* ignore */
    } finally {
      setToggling(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">مدیریت کاربران</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          مدیریت аккаунت‌های کاربران و تغییر وضعیت آن‌ها
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="جستجو در موبایل/نام/ایمیل…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              className="md:w-auto"
            />
          </div>
          <Select
            value={roleFilter}
            onValueChange={(v) => { setRoleFilter(v === 'all' ? null : v); setPage(1); }}
          >
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
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              کاربری یافت نشد.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {['موبایل', 'نام', 'ایمیل', 'نقش', 'تاریخ عضویت', 'سفارش‌ها', 'وضعیت', 'عمل'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs" dir="ltr">{toPersianDigits(u.phone)}</span>
                        </td>
                        <td className="px-4 py-3 font-medium">{u.fullName ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLOR[u.role]}`}>
                            {u.role === 'ADMIN' ? 'مدیر' : u.role === 'SELLER' ? 'فروشنده' : 'خریدار'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(u.createdAt)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{toPersianDigits(u.ordersCount)}</td>
                        <td className="px-4 py-3">
                          {u.isActive ? (
                            <span className="flex items-center gap-1 text-sm text-green-700">
                              <Shield className="h-4 w-4" /> فعال
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-sm text-red-600">
                              <UserX className="h-4 w-4" /> غیرفعال
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {u.id !== useAuthStore.getState().user?.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleActive(u.id, u.isActive)}
                              disabled={toggling === u.id}
                            >
                              {u.isActive ? (
                                <>
                                  <UserX className="mr-1 h-3.5 w-3.5" /> غیرفعال
                                </>
                              ) : (
                                <>
                                  <UserCheck className="mr-1 h-3.5 w-3.5" /> فعال
                                </>
                              )}
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
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            نشان‌دهنده {total} کاربر
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
