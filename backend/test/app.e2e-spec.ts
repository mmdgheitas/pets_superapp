import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Smoke e2e: boots the whole AppModule (all wiring, guards, pipes) and checks
 * the versioned health endpoint, validation behaviour and auth guard paths.
 *
 * PrismaService is stubbed because CI/sandbox here has no MySQL — full DB-backed
 * integration runs happen with `docker compose up` + `npm run test:e2e:integration`
 * on a machine with network access. Redis-less flows degrade gracefully by design,
 * so they are exercised with the real RedisService (503 when down, 200 when up).
 */
describe('API smoke (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ $disconnect: jest.fn(), noop: true })
      .compile();
    // logger disabled so infra-connection noise doesn't trip Jest's post-test log detector
    app = module.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health → 200', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
      });
  });

  it('POST /api/v1/auth/otp/request rejects invalid phone numbers (validation)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/otp/request')
      .send({ phone: 'not-a-phone' })
      .expect(400);
  });

  it('GET /api/v1/users/me requires authentication', () => {
    return request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
  });

  it('rejects a forged Bearer token with 401 (guard path works)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer forged.token.value')
      .expect(401);
  });

  it('POST /api/v1/auth/otp/request with a valid phone passes validation (auth is public)', () => {
    // With Redis down the service answers 503; with Redis up it answers 200 —
    // either way: routing, public access and DTO validation all hold (no 400/401).
    return request(app.getHttpServer())
      .post('/api/v1/auth/otp/request')
      .send({ phone: '09121112233' })
      .expect((res) => {
        expect([200, 503]).toContain(res.status);
      });
  });
});
