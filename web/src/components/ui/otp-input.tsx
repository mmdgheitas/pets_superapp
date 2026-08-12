'use client';

import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

/**
 * Segmented OTP input — one glanceable box per digit. This is the pattern every
 * Iranian app (from banks to Snapp) already uses for OTP, so users transfer their
 * existing mental model instantly (Jakob's law) instead of parsing a plain text field.
 */
export function OtpInput({
  length = 5,
  onComplete,
  autoFocus = true,
}: {
  length?: number;
  onComplete: (code: string) => void;
  autoFocus?: boolean;
}) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const setDigit = (index: number, digit: string) => {
    const next = [...values];
    next[index] = digit;
    setValues(next);
    if (digit && index < length - 1) refs.current[index + 1]?.focus();
    if (next.every((d) => d !== '')) onComplete(next.join(''));
  };

  const handleChange = (index: number, raw: string) => {
    const normalized = raw.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/\D/g, '');
    if (!normalized) {
      setDigit(index, '');
      return;
    }
    setDigit(index, normalized[normalized.length - 1]);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/\D/g, '');
    if (!text) return;
    e.preventDefault();
    const next = Array(length).fill('');
    text.slice(0, length).split('').forEach((d, i) => (next[i] = d));
    setValues(next);
    const lastIndex = Math.min(text.length, length) - 1;
    refs.current[lastIndex]?.focus();
    if (next.every((d) => d !== '')) onComplete(next.join(''));
  };

  return (
    <div className="flex justify-center gap-2" dir="ltr">
      {values.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          autoFocus={autoFocus && i === 0}
          inputMode="numeric"
          maxLength={1}
          aria-label={`رقم ${i + 1} کد تایید`}
          className={cn(
            'h-12 w-10 rounded-xl border-2 bg-background text-center text-xl font-bold shadow-xs transition-colors sm:h-14 sm:w-12',
            'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30',
            digit ? 'border-primary/50' : 'border-input',
          )}
        />
      ))}
    </div>
  );
}
