import { Calculator, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatToman, toPersianDigits } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Seller trust screen fragment — shows exactly how the platform cut is computed.
 * "Sellers trust us because we show them the math."
 */
export function CommissionCard({
  rate = 5,
  sampleGrossIrr = 10_000_000,
  className,
}: {
  rate?: number;
  /** Example line total in IRR for the illustration */
  sampleGrossIrr?: number;
  className?: string;
}) {
  const commission = Math.round((sampleGrossIrr * rate) / 100);
  const sellerNet = sampleGrossIrr - commission;

  return (
    <Card className={cn('border-money/20 bg-gradient-to-br from-money-bg/40 to-card', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-[18px] w-[18px] text-money" />
          شفافیت کمیسیون
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="leading-7 text-muted-foreground">
          نرخ کمیسیون فروشگاه شما{' '}
          <b className="text-foreground num-tabular">{toPersianDigits(rate)}٪</b> است و در لحظه خرید روی هر
          قلم فریز می‌شود — تغییر بعدی قیمت یا نرخ، تاریخچه را عوض نمی‌کند.
        </p>

        <div className="overflow-hidden rounded-xl border bg-card text-sm">
          <div className="flex justify-between border-b px-3 py-2.5">
            <span className="text-muted-foreground">مبلغ فروش (نمونه)</span>
            <span className="font-medium num-tabular">{formatToman(sampleGrossIrr)}</span>
          </div>
          <div className="flex justify-between border-b px-3 py-2.5">
            <span className="text-muted-foreground">کمیسیون پلتفرم ({toPersianDigits(rate)}٪)</span>
            <span className="font-medium text-warning num-tabular">− {formatToman(commission)}</span>
          </div>
          <div className="flex justify-between bg-money-bg/50 px-3 py-2.5">
            <span className="font-bold text-money">سهم فروشنده</span>
            <span className="money-figure text-base">{formatToman(sellerNet)}</span>
          </div>
        </div>

        <p className="flex items-start gap-1.5 text-[11px] leading-5 text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          درآمد داشبورد همیشه «پس از کسر کمیسیون» گزارش می‌شود تا با واریز واقعی هم‌خوان باشد.
        </p>
      </CardContent>
    </Card>
  );
}

export function PriceConfirmedBadge({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        'flex items-center gap-1.5 rounded-lg bg-success-bg px-2.5 py-1.5 text-xs font-medium text-success',
        className,
      )}
    >
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success text-[10px] text-success-foreground">
        ✓
      </span>
      قیمت نهایی تأیید شد
    </p>
  );
}
