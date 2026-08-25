import Link from 'next/link';
import { CheckCircle2, XCircle, Copy, Store, Receipt, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toPersianDigits } from '@/lib/format';

interface PaymentResultProps {
  searchParams: Promise<{ status?: string; reason?: string; order?: string; ref?: string }>;
}

export default function PaymentResultPage({ searchParams }: PaymentResultProps) {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-md flex-col justify-center py-2 sm:min-h-[60vh]">
      <PaymentResultContent searchParams={searchParams} />
    </div>
  );
}

async function PaymentResultContent({ searchParams }: PaymentResultProps) {
  const { status, reason, order, ref } = await searchParams;
  const success = status === 'success';

  return (
    <Card className="animate-fade-up overflow-hidden text-center shadow-raised">
      {success && <div className="h-1.5 bg-gradient-to-l from-primary via-success to-money" aria-hidden />}
      <CardContent className="space-y-4 p-5 sm:p-8">
        {success ? (
          <>
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-bg sm:h-20 sm:w-20">
              <CheckCircle2 className="h-9 w-9 text-success sm:h-11 sm:w-11" />
            </span>
            <div className="space-y-1.5">
              <h1 className="font-display text-lg font-extrabold sm:text-xl">پرداخت با موفقیت انجام شد 🎉</h1>
              <p className="text-sm leading-7 text-muted-foreground">
                سفارش شما ثبت شد، کمیسیون فروشنده محاسبه شد و فروشنده مطلع گردید.
              </p>
            </div>

            <ul className="space-y-2.5 rounded-xl border bg-muted/40 p-3 text-start text-sm sm:p-3.5">
              {order && (
                <li className="flex items-start justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Receipt className="h-3.5 w-3.5 shrink-0" /> شماره سفارش
                  </span>
                  <span dir="ltr" className="shrink-0 font-bold num-tabular">
                    #{order.slice(0, 10)}
                  </span>
                </li>
              )}
              {ref && (
                <li className="flex items-start justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Copy className="h-3.5 w-3.5 shrink-0" /> کد رهگیری زرین‌پال
                  </span>
                  <span dir="ltr" className="shrink-0 font-medium num-tabular text-foreground">
                    {toPersianDigits(ref)}
                  </span>
                </li>
              )}
              <li className="flex items-start justify-between gap-3 border-t pt-2.5">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Store className="h-3.5 w-3.5 shrink-0" /> وضعیت فروشنده
                </span>
                <span className="shrink-0 text-xs font-bold text-success">اعلان ارسال شد</span>
              </li>
            </ul>

            <p className="rounded-lg bg-success-bg/80 px-3 py-2 text-xs leading-6 text-success">
              این یک سفارش واقعی در سیستم است — موجودی رزرو و سهم فروشنده ثبت شده است.
            </p>

            <div className="flex flex-col gap-2">
              <Link href="/orders">
                <Button className="w-full" size="lg">
                  پیگیری سفارش <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/products">
                <Button className="w-full" size="lg" variant="outline">
                  ادامه خرید
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive-bg">
              <XCircle className="h-11 w-11 text-destructive" />
            </span>
            <div>
              <h1 className="font-display text-xl font-extrabold">پرداخت ناموفق بود</h1>
              {reason && <p className="mt-1 text-sm text-muted-foreground">{reason}</p>}
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                نگران نباشید — موجودی تا پایان مهلت رزرو برای شما نگه داشته می‌شود.
              </p>
            </div>
            <div className="flex gap-2">
              {order ? (
                <Link href="/orders" className="flex-1">
                  <Button className="w-full" size="lg">
                    تلاش مجدد از سفارش‌ها
                  </Button>
                </Link>
              ) : (
                <Link href="/cart" className="flex-1">
                  <Button className="w-full" size="lg">
                    بازگشت به سبد
                  </Button>
                </Link>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
