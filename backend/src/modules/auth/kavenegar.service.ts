import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface KavenegarConfig {
  apiKey: string;
  sender: string;
  otpTemplate: string;
  mock: boolean;
}

/**
 * OTP + transactional SMS via KaveNegar.
 *
 * The vendor REST API (api.kavenegar.com) is used directly instead of the
 * unofficial `kavenegar` npm wrapper (unmaintained, untyped) — same endpoints,
 * with a 10s timeout and a mock mode for local development.
 *
 * Set KAVENEGAR_MOCK=true to skip network calls and log the OTP instead.
 */
@Injectable()
export class KavenegarService {
  private readonly logger = new Logger(KavenegarService.name);
  private readonly cfg: KavenegarConfig;

  constructor(config: ConfigService) {
    this.cfg = config.get<KavenegarConfig>('app.kavenegar') as KavenegarConfig;
  }

  async sendOtp(phone: string, code: string): Promise<void> {
    if (this.cfg.mock) {
      this.logger.warn(`[KAVENEGAR MOCK] OTP for ${phone}: ${code}`);
      return;
    }
    const message = `فروشگاه حیوانات خانگی\nکد تأیید شما: ${code}`;
    if (this.cfg.otpTemplate) {
      // Preferred: verify/lookup with a pre-approved template in the Kavenegar panel
      await this.call('verify/lookup', {
        receptor: phone,
        token: code,
        template: this.cfg.otpTemplate,
      });
    } else {
      await this.sendSms(phone, message);
    }
  }

  async sendSms(phone: string, message: string): Promise<void> {
    if (this.cfg.mock) {
      this.logger.warn(`[KAVENEGAR MOCK] SMS to ${phone}: ${message}`);
      return;
    }
    await this.call('sms/send', {
      receptor: phone,
      message,
      ...(this.cfg.sender ? { sender: this.cfg.sender } : {}),
    });
  }

  private async call(
    path: 'verify/lookup' | 'sms/send',
    params: Record<string, string>,
  ): Promise<void> {
    if (!this.cfg.apiKey) {
      this.logger.error('KAVENEGAR_API_KEY is not configured');
      throw new InternalServerErrorException('سرویس پیامک پیکربندی نشده است');
    }
    const url = `https://api.kavenegar.com/v1/${this.cfg.apiKey}/${path}.json`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params).toString(),
        signal: controller.signal,
      });
      const body = (await response.json().catch(() => null)) as {
        return?: { status?: number; message?: string };
      } | null;
      const status = body?.return?.status;
      if (!response.ok || (status !== undefined && status !== 200)) {
        this.logger.error(`KaveNegar ${path} failed: HTTP ${response.status} ${JSON.stringify(body)}`);
        throw new InternalServerErrorException('ارسال پیامک با خطا مواجه شد');
      }
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error(`KaveNegar request error: ${(error as Error).message}`);
      throw new InternalServerErrorException('ارسال پیامک با خطا مواجه شد');
    } finally {
      clearTimeout(timer);
    }
  }
}
