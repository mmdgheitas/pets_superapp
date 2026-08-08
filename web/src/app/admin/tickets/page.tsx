'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { MessageCircle, Reply, Check, Clock, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import type { SupportTicket, PaginatedSellers } from '@/lib/types';

const STATUS_OPTIONS = [
  { value: 'all', label: 'همه وضعیت‌ها' },
  { value: 'OPEN', label: 'باز' },
  { value: 'IN_PROGRESS', label: 'در progess' },
  { value: 'RESOLVED', label: 'پاسخ‌داده‌شده' },
  { value: 'CLOSED', label: 'بسته' },
];

const STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  OPEN: MessageCircle,
  IN_PROGRESS: Clock,
  RESOLVED: Check,
  CLOSED: XCircle,
};

const STATUS_COLOR: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-200 text-gray-700',
};

function TicketItem({ ticket, onReply }: { ticket: SupportTicket; onReply: (id: string) => void }) {
  const Icon = STATUS_ICON[ticket.status] ?? MessageCircle;
  const color = STATUS_COLOR[ticket.status] ?? 'bg-gray-100 text-gray-800';

  return (
    <Card className="transition-all hover:shadow-sm">
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
                {ticket.status === 'OPEN' ? 'باز' : ticket.status === 'IN_PROGRESS' ? 'در progess' : ticket.status === 'RESOLVED' ? 'پاسخ‌داده‌شده' : 'بسته'}
              </span>
              <span className="text-xs text-muted-foreground">
                توسط: {ticket.user.fullName ?? ticket.user.phone}
              </span>
            </div>
            <h3 className="mt-1 font-medium">{ticket.subject}</h3>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {ticket.status === 'OPEN' && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onReply(ticket.id)}>
                <Reply className="mr-1 h-3.5 w-3.5" /> پاسخ
              </Button>
            )}
            {ticket.status === 'RESOLVED' && (
              <Button size="sm" variant="ghost" className="text-green-700" onClick={() => onReply(ticket.id)}>
                <Reply className="mr-1 h-3.5 w-3.5" /> پاسخ مجدد
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3">{ticket.message}</p>
        {ticket.adminReply && (
          <div className="mt-3 rounded-lg bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">پاسخ پشتیبانی:</p>
            <p className="mt-1 text-sm">{ticket.adminReply}</p>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          ایجاد‌شده: {formatDate(ticket.createdAt)}
          {ticket.updatedAt !== ticket.createdAt && ` · به‌روزرسانی: ${formatDate(ticket.updatedAt)}`}
        </p>
      </CardContent>
    </Card>
  );
}

export default function AdminTicketsPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState('');

  const loadTickets = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const { data } = await api.get<PaginatedSellers>(`/admin/tickets?${params}`);
      setTickets(data.data);
      setTotal(data.meta.total);
    } catch (e) {
      setError(errorMessage(e, 'بارگذاری تیکت‌ها'));
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [token, page, statusFilter, limit]);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    if (token && useAuthStore.getState().user?.role !== 'ADMIN') { router.replace('/'); return; }
    loadTickets();
  }, [token, router, loadTickets]);

  const reply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    setReplyError('');
    try {
      await api.post(`/admin/tickets/${replyingTo}/reply`, { reply: replyText.trim() });
      setReplyingTo(null);
      setReplyText('');
      loadTickets();
    } catch (e) {
      setReplyError(errorMessage(e, 'ارسال پاسخ ناموفق بود'));
    } finally {
      setSending(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">تیکت‌های پشتیبانی</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          پاسخ به تیکت‌های کاربران و مدیریت وضعیت آن‌ها
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Select
            value={statusFilter}
            onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
          >
            <SelectTrigger className="w-[160px]">
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

      {/* Reply form */}
      {replyingTo && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">پاسخ به تیکت</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="متن پاسخ خود را بنویسید…"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
            />
            {replyError && <p className="text-sm text-destructive">{replyError}</p>}
            <div className="flex gap-2">
              <Button onClick={reply} disabled={sending || !replyText.trim()} className="flex-1">
                {sending ? 'در حال ارسال…' : 'ارسال پاسخ'}
              </Button>
              <Button variant="outline" onClick={() => { setReplyingTo(null); setReplyText(''); }}>
                انصراف
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ticket list */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : tickets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              تیکتی یافت نشد.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <TicketItem key={t.id} ticket={t} onReply={(id) => { setReplyingTo(id); setReplyText(''); }} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            نشان‌دهنده {total} تیکت
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
