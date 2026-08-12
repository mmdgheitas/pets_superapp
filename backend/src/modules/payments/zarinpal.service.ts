import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

interface ZarinpalConfig {
  merchantId: string;
  sandbox: boolean;
  mock: boolean;
}

interface ZarinpalRequestResult {
  authority: string;
  startPayUrl: string;
}

interface ZarinpalVerifyResult {
  success: boolean;
  refId?: string;
  cardPan?: string;
  alreadyVerified?: boolean;
}

/**
 * ZarinPal payment gateway (REST v4 API).
 *
 * - sandbox: uses https://sandbox.zarinpal.com (set ZARINPAL_SANDBOX=true)
 * - mock:    skips HTTP entirely and simulates a successful gateway round-trip,
 *            so the full purchase flow can be tested offline (ZARINPAL_MOCK=true)
 *
 * Backup gateway (IDPay) is a drop-in alternative not enabled in Phase 1.
 */
@Injectable()
export class ZarinpalService {
  private readonly logger = new Logger(ZarinpalService.name);
  private readonly cfg: ZarinpalConfig;

  constructor(config: ConfigService) {
    this.cfg = config.get<ZarinpalConfig>('app.zarinpal') as ZarinpalConfig;
  }

  private get baseUrl(): string {
    return this.cfg.sandbox
      ? 'https://sandbox.zarinpal.com/pg/v4/payment'
      : 'https://payment.zarinpal.com/pg/v4/payment';
  }

  private get startPayBase(): string {
    return this.cfg.sandbox
      ? 'https://sandbox.zarinpal.com/pg/StartPay'
      : 'https://payment.zarinpal.com/pg/StartPay';
  }

  async requestPayment(input: {
    amountIrr: number;
    description: string;
    callbackUrl: string;
    mobile?: string;
  }): Promise<ZarinpalRequestResult> {
    if (this.cfg.mock) {
      const authority = `MOCK-${randomUUID()}`;
      this.logger.warn(`[ZARINPAL MOCK] request amount=${input.amountIrr} → authority=${authority}`);
      const apiPublicUrl = process.env.API_PUBLIC_URL ?? 'http://localhost:3000';
      return {
        authority,
        startPayUrl: `${apiPublicUrl}/api/v1/payments/callback?Authority=${authority}&Status=OK`,
      };
    }

    const body = await this.post<{
      data: { code: number; authority: string; message?: string };
      errors: unknown[];
    }>('/request.json', {
      merchant_id: this.cfg.merchantId,
      amount: Math.round(input.amountIrr),
      description: input.description.slice(0, 200),
      callback_url: input.callbackUrl,
      metadata: input.mobile ? { mobile: input.mobile } : undefined,
    });

    const data = body?.data;
    if (!data || data.code !== 100 || !data.authority) {
      this.logger.error(`ZarinPal request failed: ${JSON.stringify(body)}`);
      throw new BadGatewayException('خطا در اتصال به درگاه پرداخت');
    }
    return {
      authority: data.authority,
      startPayUrl: `${this.startPayBase}/${data.authority}`,
    };
  }

  async verifyPayment(input: { authority: string; amountIrr: number }): Promise<ZarinpalVerifyResult> {
    if (this.cfg.mock) {
      this.logger.warn(`[ZARINPAL MOCK] verify authority=${input.authority} → success`);
      return { success: true, refId: `MOCK-${Date.now()}`, cardPan: '6037-****-****-0000' };
    }

    const body = await this.post<{
      data: { code: number; ref_id?: number; card_pan?: string; message?: string };
      errors: { code?: number; message?: string }[] | Record<string, unknown>;
    }>('/verify.json', {
      merchant_id: this.cfg.merchantId,
      amount: Math.round(input.amountIrr),
      authority: input.authority,
    });

    const data = body?.data;
    if (data && (data.code === 100 || data.code === 101)) {
      return {
        success: true,
        refId: data.ref_id != null ? String(data.ref_id) : undefined,
        cardPan: data.card_pan,
        alreadyVerified: data.code === 101,
      };
    }
    this.logger.warn(`ZarinPal verify failed: ${JSON.stringify(body)}`);
    return { success: false };
  }

  private async post<T>(path: string, payload: Record<string, unknown>): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      return (await res.json()) as T;
    } catch (error) {
      this.logger.error(`ZarinPal HTTP error: ${(error as Error).message}`);
      throw new BadGatewayException('عدم دسترسی به درگاه پرداخت');
    } finally {
      clearTimeout(timer);
    }
  }
}
