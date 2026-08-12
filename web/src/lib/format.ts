const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

/** IRR → تومان grouped with Persian digits: ۲۸٬۵۰۰٬۰۰۰ تومان */
export function formatToman(irr: number | string | null | undefined): string {
  if (irr == null) return '—';
  const toman = Math.round(Number(irr) / 10);
  return `${toPersianDigits(toman.toLocaleString('en-US').replace(/,/g, '٬'))} تومان`;
}

export function formatDate(iso: string | Date): string {
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso),
    );
  } catch {
    return String(iso);
  }
}
