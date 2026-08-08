'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Plus,
  X,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
  Eye,
  EyeOff,
  Upload,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, errorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { toPersianDigits } from '@/lib/format';
import type { BannerItem } from '@/lib/types';

const POSITION_OPTIONS = [
  { value: 'home_top', label: 'بالای صفحه اصلی' },
  { value: 'home_bottom', label: 'پایان صفحه اصلی' },
  { value: 'product_top', label: 'بالای صفحه محصولات' },
  { value: 'category', label: 'بین دسته‌بندی‌ها' },
];

export default function AdminBannersPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    imageUrl: '',
    linkUrl: '',
    position: 'home_top',
    sortOrder: 0,
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return; // wait for auth hydration
    if (currentUser.role !== 'ADMIN') { router.replace('/'); return; }
    loadBanners();
  }, [token, router]);

  const loadBanners = async () => {
    try {
      const { data } = await api.get<BannerItem[]>('/admin/banners');
      setBanners(data);
    } catch {
      setError('لغو شده');
    } finally {
      setLoading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
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
      let res: { data: BannerItem };
      if (editingId) {
        res = await api.patch<BannerItem>(`/admin/banners/${editingId}`, dto);
      } else {
        res = await api.post<BannerItem>('/admin/banners', dto);
      }
      setBanners((prev) =>
        editingId
          ? prev.map((b) => (b.id === editingId ? res.data : b))
          : [...prev, res.data]
      );
      resetForm();
      loadBanners();
    } catch (e) {
      setSaveError(errorMessage(e, 'ذخیره ناموفق بود'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (banner: BannerItem) => {
    try {
      await api.patch<BannerItem>(`/admin/banners/${banner.id}`, { isActive: !banner.isActive });
      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, isActive: !b.isActive } : b))
      );
    } catch {
      /* ignore */
    }
  };

  const deleteBanner = async (id: string) => {
    if (!confirm('بنر حذف شود؟')) return;
    try {
      await api.delete(`/admin/banners/${id}`);
      setBanners((prev) => prev.filter((b) => b.id !== id));
    } catch {
      setError('حذف ناموفق بود');
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
    setSaveError('');
  };

  const resetForm = () => {
    setForm({ title: '', imageUrl: '', linkUrl: '', position: 'home_top', sortOrder: 0, isActive: true });
    setEditingId(null);
    setShowForm(false);
    setSaveError('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">مدیریت بنرها</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          بنرهای نمایش‌داده‌شده در صفحه اصلی و صفحه محصولات
        </p>
      </div>

      <Button onClick={() => { resetForm(); setShowForm(true); }}>
        <Plus className="mr-2 h-4 w-4" /> بنر جدید
      </Button>

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'ویرایش بنر' : 'بنر جدید'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">عنوان بنر</label>
                  <Input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="تخفیف ۲۰٪ در فروشگاه"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">وضعیت</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                  >
                    {POSITION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">آدرس تصویر</label>
                <Input
                  required
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="https://.../banner.jpg"
                />
                <p className="text-xs text-muted-foreground">
                  آدرس مستقیم تصویر (از /upload/image یا CDN)
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  لینک هدف (اختیاری)
                </label>
                <Input
                  value={form.linkUrl}
                  onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                  placeholder="https://petshop.ir/products"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-input"
                  />
                  فعال باشد
                </label>
                <div className="flex items-center gap-1">
                  <label className="text-sm text-muted-foreground">ترتیب:</label>
                  <Input
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value, 10) || 0 })}
                    className="w-20"
                  />
                </div>
              </div>
              {saveError && <p className="text-sm text-destructive">{saveError}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? 'ذخیره‌سازی…' : editingId ? 'بروزرسانی' : 'ایجاد بنر'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  انصراف
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <div>
        <h2 className="mb-3 text-lg font-bold">لیست بنرها</h2>
        {error ? (
          <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </p>
        ) : banners.length === 0 ? (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            هنوز بنری ثبت نشده است.
          </p>
        ) : (
          <div className="space-y-3">
            {banners.map((b) => (
              <Card key={b.id} className="flex items-start gap-4">
                <div className="flex h-16 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                  {b.imageUrl ? (
                    <img
                      src={b.imageUrl}
                      alt={b.title}
                      className="h-full w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{b.title}</h3>
                    {b.isActive ? (
                      <span className="flex h-5 flex-shrink-0 items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800">
                        فعال
                      </span>
                    ) : (
                      <span className="flex h-5 flex-shrink-0 items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        غیرفعال
                      </span>
                    )}
                    {b.linkUrl && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <ExternalLink className="h-3 w-3" />
                        {b.linkUrl}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span> موقعیت: {POSITION_OPTIONS.find((o) => o.value === b.position)?.label ?? b.position}</span>
                    <span>· ترتیب: {toPersianDigits(b.sortOrder)}</span>
                    {b.startsAt && (
                      <>
                        <span>· از: {toPersianDigits(new Date(b.startsAt).toLocaleDateString('fa-IR'))}</span>
                      </>
                    )}
                    {b.endsAt && (
                      <>
                        <span>· تا: {toPersianDigits(new Date(b.endsAt).toLocaleDateString('fa-IR'))}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    title={b.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
                    onClick={() => toggleActive(b)}
                  >
                    {b.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="ویرایش"
                    onClick={() => startEdit(b)}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="حذف"
                    onClick={() => deleteBanner(b.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upload hint */}
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <Upload className="h-5 w-5" />
          <span>
            برای دریافت آدرس تصویر، ابتدا از مسیر /upload/image آپلود کنید و آدرس برگشتی را در فیلد
            {' '}
            <strong className="text-foreground">آدرس تصویر</strong> کپی نمایید.
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
