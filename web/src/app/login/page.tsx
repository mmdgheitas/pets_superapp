'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api, errorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { toPersianDigits } from '@/lib/format';
import type { User } from '@/lib/types';

const phoneSchema = z.object({
  phone: z.string().regex(/^09\d{9}$/, 'شماره موبایل معتبر نیست (مثال: 09123456789)'),
});
const otpSchema = z.object({
  code: z.string().min(4).max(8),
  fullName: z.string().max(100).optional(),
});
type PhoneForm = z.infer<typeof phoneSchema>;
type OtpForm = z.infer<typeof otpSchema>;

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
  const [expiresIn, setExpiresIn] = useState(0);
  const [devCode, setDevCode] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const phoneForm = useForm<PhoneForm>({ resolver: zodResolver(phoneSchema) });
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema) });

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (user) router.replace('/');
  }, [user, router]);

  const requestOtp = async ({ phone }: PhoneForm) => {
    setError('');
    try {
      const { data } = await api.post<OtpRequestResponse>('/auth/otp/request', { phone });
      setPhone(phone);
      setExpiresIn(data.expiresIn);
      setCountdown(data.expiresIn);
      setDevCode(data.devCode);
      setStep('otp');
    } catch (e) {
      setError(errorMessage(e, 'ارسال کد با خطا مواجه شد'));
    }
  };

  const verifyOtp = async ({ code, fullName }: OtpForm) => {
    setError('');
    try {
      const { data } = await api.post<VerifyResponse>('/auth/otp/verify', {
        phone,
        code,
        ...(fullName ? { fullName } : {}),
      });
      setAuth(data);
      router.replace('/');
    } catch (e) {
      setError(errorMessage(e, 'کد واردشده صحیح نیست'));
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-xl">ورود | ثبت‌نام</CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            با شماره موبایل وارد شوید؛ کد تأیید پیامک می‌شود
          </p>
        </CardHeader>
        <CardContent>
          {step === 'phone' ? (
            <form onSubmit={phoneForm.handleSubmit(requestOtp)} className="space-y-4">
              <div className="space-y-1">
                <Input
                  dir="ltr"
                  placeholder="09xxxxxxxxx"
                  inputMode="numeric"
                  autoComplete="tel"
                  {...phoneForm.register('phone')}
                />
                {phoneForm.formState.errors.phone && (
                  <p className="text-sm text-destructive">
                    {phoneForm.formState.errors.phone.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={phoneForm.formState.isSubmitting}
              >
                {phoneForm.formState.isSubmitting ? 'در حال ارسال…' : 'ارسال کد تأیید'}
              </Button>
            </form>
          ) : (
            <form onSubmit={otpForm.handleSubmit(verifyOtp)} className="space-y-4">
              <p className="text-sm">
                کد ارسال‌شده به <b>{toPersianDigits(phone)}</b> را وارد کنید
                {countdown > 0 && (
                  <span className="text-muted-foreground">
                    {' '}
                    (انقضا تا {toPersianDigits(countdown)} ثانیه)
                  </span>
                )}
              </p>
              {devCode && (
                <p className="rounded-md bg-accent p-2 text-sm text-accent-foreground">
                  حالت توسعه — کد: <b dir="ltr">{devCode}</b>
                </p>
              )}
              <Input dir="ltr" placeholder="کد ۵ رقمی" inputMode="numeric" {...otpForm.register('code')} />
              <Input placeholder="نام و نام خانوادگی (اختیاری)" {...otpForm.register('fullName')} />
              <Button type="submit" className="w-full" disabled={otpForm.formState.isSubmitting}>
                {otpForm.formState.isSubmitting ? 'در حال بررسی…' : 'تأیید و ورود'}
              </Button>
              <Button type="button" variant="link" className="w-full" onClick={() => setStep('phone')}>
                تغییر شماره موبایل
              </Button>
            </form>
          )}
          {expiresIn > 0 && step === 'otp' && countdown === 0 && (
            <Button
              variant="outline"
              className="mt-2 w-full"
              onClick={() => phoneForm.handleSubmit(() => requestOtp({ phone }))()}
            >
              ارسال مجدد کد
            </Button>
          )}
          {error && <p className="mt-3 text-center text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
