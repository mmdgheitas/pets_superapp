'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { PawPrint, Phone, ShieldCheck, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { OtpInput } from '@/components/ui/otp-input';
import { OtpCountdownBar } from '@/components/ui/reservation-countdown';
import { api, errorMessage, USE_MOCK } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { toPersianDigits } from '@/lib/format';
import { toast } from '@/lib/toast-store';
import type { User } from '@/lib/types';

const phoneSchema = z.object({
  phone: z.string().regex(/^09\d{9}$/, 'شماره موبایل معتبر نیست (مثال: 09123456789)'),
});
type PhoneForm = z.infer<typeof phoneSchema>;

interface OtpRequestResponse {
  expiresIn: number;
  devCode?: string;
}
interface VerifyResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, user } = useAuthStore();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [countdown, setCountdown] = useState(0);
  const [otpTtl, setOtpTtl] = useState(120);
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpKey, setOtpKey] = useState(0);

  const phoneForm = useForm<PhoneForm>({ resolver: zodResolver(phoneSchema) });

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (user) router.replace('/');
  }, [user, router]);

  const requestOtp = async ({ phone }: PhoneForm) => {
    try {
      const { data } = await api.post<OtpRequestResponse>('/auth/otp/request', { phone });
      setPhone(phone);
      setCountdown(data.expiresIn);
      setOtpTtl(data.expiresIn || 120);
      setDevCode(data.devCode);
      setStep('otp');
      setOtpKey((k) => k + 1);
    } catch (e) {
      toast({ title: 'ارسال کد ناموفق بود', description: errorMessage(e), variant: 'destructive' });
    }
  };

  const verifyOtp = async (code: string) => {
    setOtpError('');
    setVerifying(true);
    try {
      const { data } = await api.post<VerifyResponse>('/auth/otp/verify', { phone, code });
      setAuth(data);
      toast({ title: 'خوش آمدید 👋', variant: 'success' });
      router.replace('/');
    } catch (e) {
      setOtpError(errorMessage(e, 'کد واردشده صحیح نیست'));
      setOtpKey((k) => k + 1);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
      <div className="mb-6 flex flex-col items-center gap-2">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-raised">
          <PawPrint className="h-7 w-7" />
        </span>
      </div>

      <Card className="animate-fade-up">
        <CardHeader className="items-center text-center">
          <CardTitle className="text-xl">
            {step === 'phone' ? 'ورود یا ثبت‌نام' : 'کد تأیید را وارد کنید'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {step === 'phone'
              ? 'با شماره موبایل خود وارد شوید، ثبت‌نام هم به همین سادگی است'
              : `کد ۵ رقمی ارسال‌شده به ${toPersianDigits(phone)} را وارد کنید`}
          </p>
        </CardHeader>
        <CardContent>
          {step === 'phone' ? (
            <form onSubmit={phoneForm.handleSubmit(requestOtp)} className="space-y-4">
              {USE_MOCK && (
                <div className="rounded-lg border border-dashed border-primary/30 bg-accent/50 p-3 text-xs leading-6 text-accent-foreground">
                  <p className="font-bold text-primary">حالت نمایشی (بدون بک‌اند)</p>
                  <p className="mt-1">کد تأیید همیشه <b dir="ltr">12345</b> است.</p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
                    <li dir="ltr">09120000000 — مدیر</li>
                    <li dir="ltr">09121111111 — فروشنده</li>
                    <li dir="ltr">09123333333 — خریدار</li>
                  </ul>
                </div>
              )}
              <div className="space-y-1">
                <Input
                  dir="ltr"
                  placeholder="09xxxxxxxxx"
                  inputMode="numeric"
                  autoComplete="tel"
                  autoFocus
                  startIcon={<Phone className="h-4 w-4" />}
                  error={!!phoneForm.formState.errors.phone}
                  {...phoneForm.register('phone')}
                />
                {phoneForm.formState.errors.phone && (
                  <p className="text-sm text-destructive">{phoneForm.formState.errors.phone.message}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={phoneForm.formState.isSubmitting}
              >
                ارسال کد تأیید
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-success" /> شماره شما فقط برای ورود امن استفاده می‌شود
              </p>
            </form>
          ) : (
            <div className="space-y-5">
              {devCode && (
                <p className="rounded-lg bg-accent p-2.5 text-center text-sm text-accent-foreground">
                  حالت توسعه — کد: <b dir="ltr">{devCode}</b>
                </p>
              )}

              <OtpInput key={otpKey} onComplete={verifyOtp} />

              {otpError && <p className="text-center text-sm text-destructive">{otpError}</p>}
              {verifying && <p className="text-center text-sm text-muted-foreground">در حال بررسی…</p>}

              <div className="space-y-2 text-center text-sm">
                {countdown > 0 ? (
                  <>
                    <OtpCountdownBar remaining={countdown} total={otpTtl} />
                    <span className="text-muted-foreground num-tabular">
                      ارسال مجدد کد تا {toPersianDigits(countdown)} ثانیه دیگر
                    </span>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="link"
                    className="gap-1"
                    onClick={() => phoneForm.handleSubmit(requestOtp)()}
                  >
                    <RefreshCcw className="h-3.5 w-3.5" /> ارسال مجدد کد
                  </Button>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep('phone');
                  setOtpError('');
                }}
              >
                تغییر شماره موبایل
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
