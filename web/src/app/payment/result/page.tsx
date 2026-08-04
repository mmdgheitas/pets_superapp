import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface PaymentResultProps {
  searchParams: Promise<{ status?: string; reason?: string; order?: string; ref?: string }>;
}

export default function PaymentResultPage({ searchParams }: PaymentResultProps) {
  return (
    <div className="mx-auto max-w-md">
      <PaymentResultContent searchParams={searchParams} />
    </div>
  );
}

async function PaymentResultContent({ searchParams }: PaymentResultProps) {
  const { status, reason, order, ref } = await searchParams;
  const success = status === 'success';

  return (
    <Card className="text-center">
      <CardContent className="space-y-4 p-8">
        {success ? (
          <>
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
            <h1 className="text-xl font-bold">پرداخت با موفقیت انجام شد 🎉</h1>
            {ref && (
              <p className="text-sm text-muted-foreground" dir="ltr">
                کد رهگیری: {ref}
              </p>
            )}
            <Link href="/orders">
              <Button className="w-full">مشاهده سفارش</Button>
            </Link>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-16 w-16 text-destructive" />
            <h1 className="text-xl font-bold">پرداخت ناموفق بود</h1>
            {reason && <p className="text-sm text-muted-foreground">{reason}</p>}
            <div className="flex gap-2">
              {order ? (
                <Link href="/orders" className="flex-1">
                  <Button className="w-full">تلاش مجدد از سفارش‌ها</Button>
                </Link>
              ) : (
                <Link href="/cart" className="flex-1">
                  <Button className="w-full">بازگشت به سبد</Button>
                </Link>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
