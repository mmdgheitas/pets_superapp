'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  Plus,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  Pencil,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageSpinner } from '@/components/ui/page-spinner';
import { EmptyState } from '@/components/ui/empty-state';
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
import type { BannerItem } from '@/lib/types';

const POSITION_OPTIONS = [
  { value: 'home_top', label: 'بالای صفحه اصلی' },
  { value: 'home_bottom', label: 'پایان صفحه اصلی' },
  { value: 'product_top', label: 'بالای صفحه محصولات' },
  { value: 'category', label: 'بین دسته‌بندی‌ها' },
];

const emptyForm = { title: '', imageUrl: '', linkUrl: '', position: 'home_top', sortOrder: 0, isActive: true };

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<BannerItem[]>('/admin/banners');
      setBanners(data);
    } catch (e) {
      toast({ title: 'بارگذاری بنرها ناموفق بود', description: errorMessage(e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const dto = {
        title: form.title,
        imageUrl: form.imageUrl,
        linkUrl: form.linkUrl || undefined,
        position: form.position,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
      };
      if (editingId) {
        await api.patch<BannerItem>(`/admin/banners/${editingId}`, dto);
      } else {
        await api.post<BannerItem>('/admin/banners', dto);
      }
      toast({ title: editingId ? 'بنر بروزرسانی شد' : 'بنر ایجاد شد', variant: 'success' });
      resetForm();
      loadBanners();
    } catch (e) {
      toast({ title: 'ذخیره ناموفق بود', description: errorMessage(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (banner: BannerItem) => {
    try {
      await api.patch<BannerItem>(`/admin/banners/${banner.id}`, { isActive: !banner.isActive });
      setBanners((prev) => prev.map((b) => (b.id === banner.id ? { ...b, isActive: !b.isActive } : b)));
    } catch (e) {
      toast({ title: 'عملیات ناموفق بود', description: errorMessage(e), variant: 'destructive' });
    }
  };

  const deleteBanner = async (id: string) => {
    if (!window.confirm('بنر حذف شود؟')) return;
    try {
      await api.delete(`/admin/banners/${id}`);
      setBanners((prev) => prev.filter((b) => b.id !== id));
      toast({ title: 'بنر حذف شد' });
    } catch (e) {
      toast({ title: 'حذف ناموفق بود', description: errorMessage(e), variant: 'destructive' });
    }
  };

  const startEdit = (banner: BannerItem) => {
    setForm({
      title: banner.title,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl ?? '',
      position: banner.position,
      sortOrder: banner.sortOrder,
      isActive: banner.isActive,
    });
    setEditingId(banner.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl">مدیریت بنرها</h1>
          <p className="mt-1 text-sm text-muted-foreground">بنرهای نمایش‌داده‌شده در صفحه اصلی و صفحه محصولات</p>
        </div>
        {!showForm && (
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" /> بنر جدید
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="animate-fade-up">
          <CardHeader>
            <CardTitle className="text-base">{editingId ? 'ویرایش بنر' : 'بنر جدید'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">عنوان بنر</label>
                  <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="تخفیف ۲۰٪ در فروشگاه" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">موقعیت نمایش</label>
                  <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITION_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">آدرس تصویر</label>
                <Input required dir="ltr" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://.../banner.jpg" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">لینک هدف (اختیاری)</label>
                <Input dir="ltr" value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} placeholder="https://petshop.ir/products" />
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 rounded border-input accent-primary" />
                  فعال باشد
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">ترتیب نمایش:</label>
                  <Input type="number" min={0} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value, 10) || 0 })} className="w-20" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" loading={saving} className="flex-1">
                  {editingId ? 'بروزرسانی' : 'ایجاد بنر'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  انصراف
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {banners.length === 0 ? (
        <EmptyState icon={<ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />} title="هنوز بنری ثبت نشده است" />
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <Card key={b.id}>
              <CardContent className="flex flex-wrap items-start gap-4 p-4">
                <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {b.imageUrl ? (
                    <Image src={b.imageUrl} alt={b.title} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full items-center justify-center"><ImageIcon className="h-6 w-6 text-muted-foreground" /></div>
                  )}
                </div>
                <div className="min-w-[180px] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-bold">{b.title}</h3>
                    <Badge variant={b.isActive ? 'success' : 'outline'}>{b.isActive ? 'فعال' : 'غیرفعال'}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>موقعیت: {POSITION_OPTIONS.find((o) => o.value === b.position)?.label ?? b.position}</span>
                    <span>ترتیب: {toPersianDigits(b.sortOrder)}</span>
                    {b.linkUrl && (
                      <span className="flex items-center gap-1 truncate">
                        <ExternalLink className="h-3 w-3 shrink-0" /> {b.linkUrl}
                      </span>
                    )}
                    {b.startsAt && <span>از: {formatDate(b.startsAt)}</span>}
                    {b.endsAt && <span>تا: {formatDate(b.endsAt)}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon-sm" title={b.isActive ? 'غیرفعال کردن' : 'فعال کردن'} onClick={() => toggleActive(b)}>
                    {b.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon-sm" title="ویرایش" onClick={() => startEdit(b)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" title="حذف" onClick={() => deleteBanner(b.id)} className="text-destructive hover:bg-destructive-bg hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <Upload className="h-5 w-5 shrink-0" />
          <span>
            برای دریافت آدرس تصویر، ابتدا از مسیر /upload/image آپلود کنید و آدرس برگشتی را در فیلد{' '}
            <strong className="text-foreground">آدرس تصویر</strong> کپی نمایید.
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
