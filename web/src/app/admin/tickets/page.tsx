'use client';

import { useEffect, useState, useCallback } from 'react';
import { Reply, Check, Clock, XCircle, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { formatDate } from '@/lib/format';
import { toast } from '@/lib/toast-store';
import type { SupportTicket, Paginated } from '@/lib/types';

const STATUS_OPTIONS = [
  { value: 'all', label: 'همه وضعیت‌ها' },
  { value: 'OPEN', label: 'باز' },
  { value: 'IN_PROGRESS', label: 'در حال بررسی' },
  { value: 'RESOLVED', label: 'پاسخ‌داده‌شده' },
  { value: 'CLOSED', label: 'بسته' },
];

const STATUS_INFO: Record<string, { label: string; variant: BadgeProps['variant']; icon: React.ComponentType<{ className?: string }> }> = {
  OPEN: { label: 'باز', variant: 'destructive', icon: MessageCircle },
  IN_PROGRESS: { label: 'در حال بررسی', variant: 'info', icon: Clock },
  RESOLVED: { label: 'پاسخ‌داده‌شده', variant: 'success', icon: Check },
  CLOSED: { label: 'بسته', variant: 'outline', icon: XCircle },
};

function TicketItem({
  ticket,
  replying,
  replyText,
  sending,
  onStartReply,
  onCancelReply,
  onChangeReply,
  onSubmitReply,
}: {
  ticket: SupportTicket;
  replying: boolean;
  replyText: string;
  sending: boolean;
  onStartReply: () => void;
  onCancelReply: () => void;
  onChangeReply: (v: string) => void;
  onSubmitReply: () => void;
}) {
  const info = STATUS_INFO[ticket.status] ?? { label: ticket.status, variant: 'outline' as const, icon: MessageCircle };
  const Icon = info.icon;

  return (
    <Card className="transition-shadow hover:shadow-card">
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={info.variant} className="gap-1"><Icon className="h-3 w-3" /> {info.label}</Badge>
              <span className="text-xs text-muted-foreground">توسط: {ticket.user.fullName ?? ticket.user.phone}</span>
            </div>
            <h3 className="mt-1 font-bold">{ticket.subject}</h3>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {(ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS') && !replying && (
              <Button size="sm" onClick={onStartReply} className="gap-1">
                <Reply className="h-3.5 w-3.5" /> پاسخ
              </Button>
            )}
            {ticket.status === 'RESOLVED' && !replying && (
              <Button size="sm" variant="ghost" onClick={onStartReply} className="gap-1">
                <Reply className="h-3.5 w-3.5" /> پاسخ مجدد
              </Button>
            )}
          </div>
        </div>
        <p className="line-clamp-3 text-sm text-muted-foreground">{ticket.message}</p>
        {ticket.adminReply && (
          <div className="mt-3 rounded-lg bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">پاسخ پشتیبانی:</p>
            <p className="mt-1 text-sm">{ticket.adminReply}</p>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          ایجادشده: {formatDate(ticket.createdAt)}
          {ticket.updatedAt !== ticket.createdAt && ` · به‌روزرسانی: ${formatDate(ticket.updatedAt)}`}
        </p>

        {/* Reply form appears directly under the ticket it belongs to (Gestalt
            proximity) instead of floating at the top of a long list */}
        {replying && (
          <div className="mt-3 space-y-2 border-t pt-3">
            <Textarea autoFocus placeholder="متن پاسخ خود را بنویسید…" value={replyText} onChange={(e) => onChangeReply(e.target.value)} rows={3} />
            <div className="flex gap-2">
              <Button size="sm" onClick={onSubmitReply} loading={sending} disabled={!replyText.trim()} className="flex-1">
                ارسال پاسخ
              </Button>
              <Button size="sm" variant="outline" onClick={onCancelReply}>
                انصراف
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const { data } = await api.get<Paginated<SupportTicket>>(`/admin/tickets?${params}`);
      setTickets(data.data);
      setTotal(data.meta.total);
    } catch (e) {
      toast({ title: 'بارگذاری تیکت‌ها ناموفق بود', description: errorMessage(e), variant: 'destructive' });
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, limit]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const reply = async () => {
    if (!replyText.trim() || !replyingTo) return;
    setSending(true);
    try {
      await api.post(`/admin/tickets/${replyingTo}/reply`, { reply: replyText.trim() });
      setReplyingTo(null);
      setReplyText('');
      toast({ title: 'پاسخ ارسال شد', variant: 'success' });
      loadTickets();
    } catch (e) {
      toast({ title: 'ارسال پاسخ ناموفق بود', description: errorMessage(e), variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold sm:text-2xl">تیکت‌های پشتیبانی</h1>
        <p className="mt-1 text-sm text-muted-foreground">پاسخ به تیکت‌های کاربران و مدیریت وضعیت آن‌ها</p>
      </div>

      <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
        <SelectTrigger className="w-[170px]">
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
      ) : tickets.length === 0 ? (
        <EmptyState icon={<MessageCircle className="mx-auto h-12 w-12 text-muted-foreground" />} title="تیکتی یافت نشد" />
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <TicketItem
              key={t.id}
              ticket={t}
              replying={replyingTo === t.id}
              replyText={replyingTo === t.id ? replyText : ''}
              sending={sending}
              onStartReply={() => { setReplyingTo(t.id); setReplyText(''); }}
              onCancelReply={() => setReplyingTo(null)}
              onChangeReply={setReplyText}
              onSubmitReply={reply}
            />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={total} itemLabel="تیکت" onChange={setPage} />
    </div>
  );
}
