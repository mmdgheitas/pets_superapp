import { registerAs } from '@nestjs/config';
import type { StringValue } from 'ms';

export default registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
  accessExpires: (process.env.JWT_ACCESS_EXPIRES ?? '15m') as StringValue,
  accessExpiresSeconds: parseInt(process.env.JWT_ACCESS_EXPIRES_SECONDS ?? '900', 10),
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
  refreshExpires: (process.env.JWT_REFRESH_EXPIRES ?? '7d') as StringValue,
  refreshExpiresSeconds: parseInt(process.env.JWT_REFRESH_EXPIRES_SECONDS ?? '604800', 10),
}));
