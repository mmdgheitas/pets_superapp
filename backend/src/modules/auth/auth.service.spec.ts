import { ForbiddenException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { KavenegarService } from './kavenegar.service';

const mockPrisma = {
  user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
};

const mockRedis = {
  incrWithWindow: jest.fn(),
  setJson: jest.fn(),
  getJson: jest.fn(),
  setKeepTtl: jest.fn(),
  del: jest.fn(),
  ttl: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  scanKeys: jest.fn(),
};

const mockJwt = { signAsync: jest.fn(), verifyAsync: jest.fn() };

const configValues: Record<string, unknown> = {
  'app.otp': { length: 5, expirySeconds: 120, rateLimit: 3, rateWindowSeconds: 600 },
  'app.kavenegar.mock': true,
  jwt: {
    accessSecret: 'acc',
    accessExpires: '15m',
    accessExpiresSeconds: 900,
    refreshSecret: 'ref',
    refreshExpires: '7d',
    refreshExpiresSeconds: 604800,
  },
};
const mockConfig = { get: jest.fn((key: string) => configValues[key]) };

const mockKavenegar = { sendOtp: jest.fn(), sendSms: jest.fn() } as unknown as KavenegarService;

describe('AuthService (OTP flow)', () => {
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJwt.signAsync.mockResolvedValue('signed-token');
    service = new AuthService(
      mockPrisma as any,
      mockRedis as any,
      mockJwt as any,
      mockConfig as any,
      mockKavenegar,
    );
  });

  it('rejects OTP requests above the rate limit', async () => {
    mockRedis.incrWithWindow.mockResolvedValue(4); // limit is 3
    await expect(service.requestOtp('09121112233')).rejects.toBeInstanceOf(ForbiddenException);
    expect(mockKavenegar.sendOtp).not.toHaveBeenCalled();
  });

  it('sends an OTP and stores a bcrypt hash with 120s TTL', async () => {
    mockRedis.incrWithWindow.mockResolvedValue(1);
    const result = await service.requestOtp('09121112233');

    expect(result.expiresIn).toBe(120);
    expect(result.devCode).toMatch(/^\d{5}$/);
    expect(mockKavenegar.sendOtp).toHaveBeenCalledWith('09121112233', result.devCode);

    const [key, record, ttl] = mockRedis.setJson.mock.calls[0];
    expect(key).toBe('otp:09121112233');
    expect(ttl).toBe(120);
    expect(await bcrypt.compare(result.devCode!, record.codeHash)).toBe(true);
    // raw code must never be persisted
    expect(JSON.stringify(record)).not.toContain(result.devCode);
  });

  it('rejects a wrong code and counts attempts without extending TTL', async () => {
    const hash = await bcrypt.hash('12345', 10);
    mockRedis.getJson.mockResolvedValue({ codeHash: hash, attempts: 0 });

    await expect(service.verifyOtp('09121112233', '99999')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(mockRedis.setKeepTtl).toHaveBeenCalledWith(
      'otp:09121112233',
      expect.stringContaining('"attempts":1'),
    );
  });

  it('blocks after too many attempts', async () => {
    mockRedis.getJson.mockResolvedValue({ codeHash: 'hash', attempts: 5 });
    await expect(service.verifyOtp('09121112233', '12345')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('logs in an existing user with a valid code and returns a token pair', async () => {
    const user = {
      id: 'u1',
      phone: '09121112233',
      email: null,
      fullName: null,
      avatarUrl: null,
      role: 'CUSTOMER',
      isActive: true,
      createdAt: new Date(),
    };
    mockRedis.getJson.mockResolvedValue({
      codeHash: await bcrypt.hash('12345', 10),
      attempts: 0,
    });
    mockPrisma.user.findUnique.mockResolvedValue(user);

    const result = await service.verifyOtp('09121112233', '12345');

    expect(result.accessToken).toBe('signed-token');
    expect(result.user.id).toBe('u1');
    expect(mockRedis.del).toHaveBeenCalledWith('otp:09121112233'); // OTP is single-use
    // refresh token session stored hashed in Redis with 7d TTL
    expect(mockRedis.set).toHaveBeenCalledWith(expect.stringMatching(/^rt:hash:/), 'u1', 604800);
  });

  it('creates a new account on first valid OTP', async () => {
    mockRedis.getJson.mockResolvedValue({
      codeHash: await bcrypt.hash('12345', 10),
      attempts: 0,
    });
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'new',
      phone: '09121112233',
      email: null,
      fullName: 'کاربر جدید',
      avatarUrl: null,
      role: 'CUSTOMER',
      isActive: true,
      createdAt: new Date(),
    });

    const result = await service.verifyOtp('09121112233', '12345', 'کاربر جدید');
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: { phone: '09121112233', fullName: 'کاربر جدید' },
    });
    expect(result.user.id).toBe('new');
  });
});
