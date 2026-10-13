import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { ConfigService } from '../src/config/config.service';

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  const authService = {
    signup: jest.fn(),
    signIn: jest.fn(),
    refresh: jest.fn(),
  };
  const configService = {
    authConfig: { tokenSecret: 'test-access-secret', refreshTokenSecret: 'test-refresh-secret' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /auth/health returns a health payload', async () => {
    await request(app.getHttpServer())
      .get('/auth/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('POST /auth/signup delegates validated credentials and returns tokens', async () => {
    authService.signup.mockResolvedValue({ token: 'access', refreshToken: 'refresh' });

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'person@example.com', password: 'StrongPassword123!' })
      .expect(201)
      .expect({ token: 'access', refreshToken: 'refresh' });

    expect(authService.signup).toHaveBeenCalledWith(
      'person@example.com',
      'StrongPassword123!',
    );
  });

  it('POST /auth/signin delegates credentials to the service', async () => {
    authService.signIn.mockResolvedValue({ token: 'access', refreshToken: 'refresh' });

    await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email: 'person@example.com', password: 'StrongPassword123!' })
      .expect(201);

    expect(authService.signIn).toHaveBeenCalledWith(
      'person@example.com',
      'StrongPassword123!',
    );
  });

  it('rejects malformed signup input when validation is enabled', async () => {
    app.useGlobalPipes(
      new (await import('@nestjs/common')).ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'not-an-email', password: 'x', extraField: true })
      .expect(400);
  });
});
