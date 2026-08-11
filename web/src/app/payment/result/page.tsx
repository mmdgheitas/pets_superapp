import Link from 'next/link';
import { CheckCircle2, XCircle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toPersianDigits } from '@/lib/format';

interface PaymentResultProps {
  searchParams: Promise<{ status?: string; reason?: string; order?: string; ref?: string }>;
}

export default function PaymentResultPage({ searchParams }: PaymentResultProps) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center">
      <PaymentResultContent searchParams={searchParams} />
    </div>
  );
}

async function PaymentResultContent({ searchParams }: PaymentResultProps) {
  const { status, reason, order, ref } = await searchParams;
  const success = status === 'success';

  return (
    <Card className="animate-fade-up text-center">
      <CardContent className="space-y-4 p-8">
        {success ? (
          <>
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success-bg">
              <CheckCircle2 className="h-11 w-11 text-success" />
            </span>
            <div>
              <h1 className="text-xl font-extrabold">پرداخت با موفقیت انجام شد 🎉</h1>
              <p className="mt-1 text-sm text-muted-foreground">سفارش شما ثبت شد و به‌زودی آماده‌سازی می‌شود.</p>
            </div>
            {ref && (
              <p className="flex items-center justify-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                <Copy className="h-3.5 w-3.5" /> کد رهگیری: <span dir="ltr" className="num-tabular font-medium text-foreground">{toPersianDigits(ref)}</span>
              </p>
            )}
            <Link href="/orders">
              <Button className="w-full" size="lg">مشاهده سفارش</Button>
            </Link>
          </>
        ) : (
          <>
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive-bg">
              <XCircle className="h-11 w-11 text-destructive" />
            </span>
            <div>
              <h1 className="text-xl font-extrabold">پرداخت ناموفق بود</h1>
              {reason && <p className="mt-1 text-sm text-muted-foreground">{reason}</p>}
            </div>
            <div className="flex gap-2">
              {order ? (
                <Link href="/orders" className="flex-1">
                  <Button className="w-full" size="lg">تلاش مجدد از سفارش‌ها</Button>
                </Link>
              ) : (
                <Link href="/cart" className="flex-1">
                  <Button className="w-full" size="lg">بازگشت به سبد</Button>
                </Link>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
