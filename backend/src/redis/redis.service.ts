import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

/**
 * Central Redis wrapper used for:
 *  - OTP storage (120s TTL)
 *  - refresh-token session storage (revocable)
 *  - OTP rate limiting counters
 *  - short-lived API response caching
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  private available = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.config.get<string>('redis.host'),
      port: this.config.get<number>('redis.port'),
      password: this.config.get<string>('redis.password'),
      db: this.config.get<number>('redis.db'),
      keyPrefix: this.config.get<string>('redis.keyPrefix'),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => Math.min(times * 500, 10_000),
    });
    this.client.on('ready', () => {
      this.available = true;
      this.logger.log('Connected to Redis');
    });
    this.client.on('end', () => {
      this.available = false;
      this.logger.warn('Redis connection closed');
    });
    this.client.on('error', (err) => {
      this.available = false;
      this.logger.warn(`Redis error: ${err.message}`);
    });
    this.client.connect().catch((err: Error) => {
      this.logger.warn(`Redis unavailable at startup: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
    }
  }

  get raw(): Redis {
    return this.client;
  }

  isAvailable(): boolean {
    return this.available;
  }

  private ensureAvailable() {
    if (!this.available) {
      throw new ServiceUnavailableException('سرویس موقت در دسترس نیست؛ چند لحظه بعد تلاش کنید');
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    this.ensureAvailable();
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async getJson<T>(key: string): Promise<T | null> {
    this.ensureAvailable();
    const value = await this.client.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.ensureAvailable();
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async setKeepTtl(key: string, value: string): Promise<void> {
    this.ensureAvailable();
    await this.client.set(key, value, 'KEEPTTL');
  }

  async get(key: string): Promise<string | null> {
    this.ensureAvailable();
    return this.client.get(key);
  }

  async del(...keys: string[]): Promise<number> {
    this.ensureAvailable();
    return keys.length ? this.client.del(...keys) : 0;
  }

  async ttl(key: string): Promise<number> {
    this.ensureAvailable();
    return this.client.ttl(key);
  }

  /** Increment a counter; on first set also applies the window TTL. Returns the new count. */
  async incrWithWindow(key: string, windowSeconds: number): Promise<number> {
    this.ensureAvailable();
    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.expire(key, windowSeconds);
    }
    return count;
  }

  /** Iterate keys matching a pattern without blocking (SCAN). */
  async scanKeys(pattern: string, count = 200): Promise<string[]> {
    this.ensureAvailable();
    const found: string[] = [];
    let cursor = '0';
    do {
      const [next, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', count);
      cursor = next;
      found.push(...keys);
    } while (cursor !== '0');
    return found;
  }
}
