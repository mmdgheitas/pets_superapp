import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomInt } from 'crypto';
import type { StringValue } from 'ms';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { KavenegarService } from './kavenegar.service';

interface OtpRecord {
  codeHash: string;
  attempts: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number; // access token lifetime in seconds
}

export interface SafeUser {
  id: string;
  phone: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: Role;
  createdAt: Date;
}

const MAX_OTP_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly kavenegar: KavenegarService,
  ) {}

  private otpCfg() {
    return this.config.get<{
      length: number;
      expirySeconds: number;
      rateLimit: number;
      rateWindowSeconds: number;
    }>('app.otp')!;
  }

  // ------------------------------------------------------------------ OTP --

  /**
   * Issues a one-time code for the phone. Rate-limited per phone number with a
   * sliding Redis counter (OTP_RATE_LIMIT per OTP_RATE_WINDOW_SECONDS).
   */
  async requestOtp(rawPhone: string) {
    const phone = rawPhone;
    const { length, expirySeconds, rateLimit, rateWindowSeconds } = this.otpCfg();

    const requests = await this.redis.incrWithWindow(`otp:rate:${phone}`, rateWindowSeconds);
    if (requests > rateLimit) {
      throw new ForbiddenException(
        'تعداد درخواست‌های کد تأیید بیش از حد مجاز است؛ لطفاً بعداً تلاش کنید',
      );
    }

    const min = 10 ** (length - 1);
    const code = String(randomInt(min, min * 10));
    const codeHash = await bcrypt.hash(code, 10);

    const record: OtpRecord = { codeHash, attempts: 0 };
    await this.redis.setJson(`otp:${phone}`, record, expirySeconds);

    await this.kavenegar.sendOtp(phone, code);

    const mockMode = this.config.get<boolean>('app.kavenegar.mock') === true;
    return {
      message: 'کد تأیید ارسال شد',
      expiresIn: expirySeconds,
      // Only exposed in mock/dev mode to make manual QA and development possible without SMS credits
      ...(mockMode ? { devCode: code } : {}),
    };
  }

  async verifyOtp(rawPhone: string, code: string, fullName?: string) {
    const phone = rawPhone;
    const cfg = this.otpCfg();

    const record = await this.redis.getJson<OtpRecord>(`otp:${phone}`);
    if (!record) {
      throw new BadRequestException('کد تأیید یافت نشد یا منقضی شده است؛ دوباره درخواست دهید');
    }
    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      throw new ForbiddenException('تعداد تلاش‌های ناموفق زیاد است؛ کد جدید دریافت کنید');
    }

    const matches = await bcrypt.compare(code, record.codeHash);
    if (!matches) {
      record.attempts += 1;
      // Keep the original 120s lifetime (do not extend the expiry on failed attempts)
      await this.redis.setKeepTtl(`otp:${phone}`, JSON.stringify(record));
      throw new BadRequestException('کد تأیید اشتباه است');
    }

    await this.redis.del(`otp:${phone}`);

    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (user && !user.isActive) {
      throw new ForbiddenException('حساب کاربری شما غیرفعال شده است');
    }
    if (!user) {
      user = await this.prisma.user.create({
        data: { phone, fullName: fullName ?? null },
      });
    } else if (fullName && !user.fullName) {
      user = await this.prisma.user.update({ where: { id: user.id }, data: { fullName } });
    }

    const tokens = await this.issueTokenPair(user);
    return { ...tokens, user: this.toSafeUser(user) };
  }

  // --------------------------------------------------------------- tokens --

  async refresh(refreshToken: string) {
    const refreshSecret = this.config.get<string>('jwt.refreshSecret')!;
    let payload: { sub: string; type?: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException('توکن تازه‌سازی نامعتبر یا منقضی شده است');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('توکن تازه‌سازی نامعتبر است');
    }

    const key = this.refreshKey(refreshToken);
    const storedUserId = await this.redis.get(key);
    if (!storedUserId || storedUserId !== payload.sub) {
      throw new UnauthorizedException('نشست شما باطل شده است؛ دوباره وارد شوید');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('حساب کاربری در دسترس نیست');
    }

    // Rotate: old refresh token is revoked immediately
    await this.redis.del(key);
    const tokens = await this.issueTokenPair(user);
    return { ...tokens, user: this.toSafeUser(user) };
  }

  async logout(refreshToken: string | undefined, userId?: string) {
    if (refreshToken) {
      await this.redis.del(this.refreshKey(refreshToken));
    }
    if (userId) {
      // Best effort: revoke all sessions of the user on logout
      const keys = await this.redis.scanKeys('rt:hash:*').catch(() => [] as string[]);
      // Keys are content-addressed; value holds the user id
      for (const key of keys) {
        const value = await this.redis.get(key).catch(() => null);
        if (value === userId) {
          await this.redis.del(key);
        }
      }
    }
    return { message: 'از حساب خارج شدید' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.toSafeUser(user);
  }

  // -------------------------------------------------------------- helpers --

  private async issueTokenPair(user: Pick<User, 'id' | 'phone' | 'role'>): Promise<AuthTokens> {
    const jwtCfg = this.config.get<{
      accessSecret: string;
      accessExpires: StringValue;
      accessExpiresSeconds: number;
      refreshSecret: string;
      refreshExpires: StringValue;
      refreshExpiresSeconds: number;
    }>('jwt')!;

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, phone: user.phone, role: user.role, type: 'access' },
      { secret: jwtCfg.accessSecret, expiresIn: jwtCfg.accessExpires },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, type: 'refresh' },
      { secret: jwtCfg.refreshSecret, expiresIn: jwtCfg.refreshExpires },
    );

    // Hash refresh tokens before storing (never persist raw tokens)
    await this.redis.set(this.refreshKey(refreshToken), user.id, jwtCfg.refreshExpiresSeconds);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: jwtCfg.accessExpiresSeconds,
    };
  }

  private refreshKey(token: string): string {
    return `rt:hash:${createHash('sha256').update(token).digest('hex')}`;
  }

  private toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
