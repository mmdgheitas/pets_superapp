'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { ImagePlus, Link2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, errorMessage } from '@/lib/api';
import { toast } from '@/lib/toast-store';
import { cn } from '@/lib/utils';

const MAX_IMAGES = 5;

function parseUrls(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Real photo upload for product listings — sellers pick files straight from
 * their device/camera roll (the common case) instead of needing to already
 * have a CDN URL. A manual-URL fallback stays available for advanced use
 * (e.g. reusing an image already hosted elsewhere).
 */
export function ProductImagesField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const urls = parseUrls(value);
  const [uploading, setUploading] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [showManual, setShowManual] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setUrls = (next: string[]) => onChange(next.slice(0, MAX_IMAGES).join(', '));

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const remaining = MAX_IMAGES - urls.length;
    if (remaining <= 0) {
      toast({ title: `حداکثر ${MAX_IMAGES} تصویر مجاز است`, variant: 'warning' });
      return;
    }
    const selected = Array.from(files).slice(0, remaining);
    const form = new FormData();
    selected.forEach((file) => form.append('files', file));

    setUploading(true);
    try {
      const { data } = await api.post<{ key: string; url: string }[]>('/upload/images', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUrls([...urls, ...data.map((d) => d.url)]);
      toast({ title: `${selected.length} تصویر آپلود شد`, variant: 'success' });
    } catch (e) {
      toast({ title: 'آپلود تصویر ناموفق بود', description: errorMessage(e), variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addManualUrl = () => {
    if (!manualUrl.trim()) return;
    setUrls([...urls, manualUrl.trim()]);
    setManualUrl('');
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {urls.map((url, i) => (
          <div key={url + i} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-muted">
            <Image
              src={url}
              alt={`تصویر ${i + 1}`}
              fill
              className="object-cover"
              unoptimized
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = '0.3';
              }}
            />
            <button
              type="button"
              onClick={() => setUrls(urls.filter((_, idx) => idx !== i))}
              aria-label="حذف تصویر"
              className="absolute end-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/70 text-background opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
            {i === 0 && (
              <span className="absolute inset-x-0 bottom-0 bg-primary/90 py-0.5 text-center text-[9px] font-bold text-primary-foreground">
                تصویر اصلی
              </span>
            )}
          </div>
        ))}

        {urls.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={cn(
              'flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary',
              uploading && 'pointer-events-none opacity-60',
            )}
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            <span className="text-[10px] font-medium">{uploading ? 'در حال آپلود…' : 'افزودن عکس'}</span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="flex items-center gap-2">
        <p className="text-xs text-muted-foreground">
          حداکثر {MAX_IMAGES} تصویر (JPG، PNG، WebP یا GIF) — اولین تصویر روی کارت محصول نمایش داده می‌شود.
        </p>
        <Button type="button" variant="link" size="sm" className="ms-auto h-auto gap-1 p-0 text-xs" onClick={() => setShowManual((v) => !v)}>
          <Link2 className="h-3 w-3" /> افزودن با آدرس تصویر
        </Button>
      </div>

      {showManual && (
        <div className="flex gap-2">
          <Input
            dir="ltr"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="https://cdn.example.com/photo.webp"
            className="flex-1"
          />
          <Button type="button" variant="outline" onClick={addManualUrl} disabled={!manualUrl.trim() || urls.length >= MAX_IMAGES}>
            افزودن
          </Button>
        </div>
      )}
    </div>
  );
}
