'use client';

import Image from 'next/image';
import * as React from 'react';
import { ImageOff } from 'lucide-react';
import { Input, type InputProps } from '@/components/ui/input';

/**
 * A plain text input for comma-separated image URLs, with a live thumbnail
 * strip underneath — sellers get instant visual confirmation that the URLs
 * they pasted actually resolve to images, instead of finding out after saving.
 */
export const ImagesUrlsInput = React.forwardRef<HTMLInputElement, InputProps & { value: string }>(
  ({ value, ...props }, ref) => {
    const urls = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);

    return (
      <div className="space-y-2">
        <Input {...props} ref={ref} dir="ltr" placeholder="https://cdn.example.com/1.webp, https://cdn.example.com/2.webp" />
        {urls.length > 0 && (
          <div className="flex gap-2">
            {urls.map((url, i) => (
              <div key={i} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-muted">
                <Image
                  src={url}
                  alt={`تصویر ${i + 1}`}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                  unoptimized
                />
              </div>
            ))}
          </div>
        )}
        {value && urls.length === 0 && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <ImageOff className="h-3.5 w-3.5" /> پیش‌نمایشی موجود نیست
          </p>
        )}
      </div>
    );
  },
);
ImagesUrlsInput.displayName = 'ImagesUrlsInput';
