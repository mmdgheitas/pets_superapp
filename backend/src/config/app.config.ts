import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPublicUrl: process.env.API_PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 3000}`,
  webAppUrl: process.env.WEB_APP_URL ?? 'http://localhost:3001',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3001')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  otp: {
    length: parseInt(process.env.OTP_LENGTH ?? '5', 10),
    expirySeconds: parseInt(process.env.OTP_EXPIRY_SECONDS ?? '120', 10),
    rateLimit: parseInt(process.env.OTP_RATE_LIMIT ?? '3', 10),
    rateWindowSeconds: parseInt(process.env.OTP_RATE_WINDOW_SECONDS ?? '600', 10),
  },
  kavenegar: {
    apiKey: process.env.KAVENEGAR_API_KEY ?? '',
    sender: process.env.KAVENEGAR_SENDER ?? '',
    otpTemplate: process.env.KAVENEGAR_OTP_TEMPLATE ?? '',
    mock: (process.env.KAVENEGAR_MOCK ?? 'false').toLowerCase() === 'true',
  },
  zarinpal: {
    merchantId: process.env.ZARINPAL_MERCHANT_ID ?? '',
    sandbox: (process.env.ZARINPAL_SANDBOX ?? 'true').toLowerCase() === 'true',
    mock: (process.env.ZARINPAL_MOCK ?? 'false').toLowerCase() === 'true',
  },
  commission: {
    defaultRate: parseFloat(process.env.DEFAULT_COMMISSION_RATE ?? '5'),
  },
  order: {
    paymentTimeoutMinutes: parseInt(process.env.ORDER_PAYMENT_TIMEOUT_MINUTES ?? '15', 10),
    shippingFee: parseInt(process.env.SHIPPING_FEE_IRR ?? '0', 10),
  },
}));
