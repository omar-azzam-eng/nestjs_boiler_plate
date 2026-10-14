import {
  BadRequestException,
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { ConfigService } from '../src/config/config.service';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { AuthGuard } from '../src/modules/auth/guards/auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';

describe('Application HTTP integration (e2e)', () => {
  let app: INestApplication;

  const authService = {
    signup: jest.fn(),
    signIn: jest.fn(),
    refresh: jest.fn(),
  };

  const usersService = {
    getUserById: jest.fn(),
    updateUser: jest.fn(),
  };

  const jwtService = {
    verifyAsync: jest.fn(),
  };

  const configService = {
    authConfig: {
      tokenSecret: 'a'.repeat(40),
      refreshTokenSecret: 'b'.repeat(40),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController, UsersController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
        transformOptions: {
          enableImplicitConversion: false,
        },
      }),
    );

    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /auth/health is public', async () => {
    await request(app.getHttpServer())
      .get('/auth/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('POST /auth/signup accepts valid input', async () => {
    authService.signup.mockResolvedValue({
      token: 'access-token',
      refreshToken: 'refresh-token',
    });

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'person@example.com',
        password: 'StrongPassword123!',
      })
      .expect(201)
      .expect({
        token: 'access-token',
        refreshToken: 'refresh-token',
      });

    expect(authService.signup).toHaveBeenCalledWith(
      'person@example.com',
      'StrongPassword123!',
    );
  });

  it('rejects invalid signup input', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'not-an-email',
        password: 'weak',
      })
      .expect(400);

    expect(authService.signup).not.toHaveBeenCalled();
  });

  it('rejects unknown signup properties', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'person@example.com',
        password: 'StrongPassword123!',
        role: 'admin',
      })
      .expect(400);

    expect(authService.signup).not.toHaveBeenCalled();
  });

  it('rejects requests with a missing bearer token', async () => {
    await request(app.getHttpServer()).get('/users').expect(401);
  });

  it('rejects malformed bearer tokens', async () => {
    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', 'Basic invalid-token')
      .expect(401);
  });

  it('rejects invalid access tokens', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid JWT'));

    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('returns the current profile for a valid access token', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user-1',
      role: 'customer',
      tokenType: 'access',
    });

    usersService.getUserById.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      name: 'Test User',
      phone: null,
      password: 'must-not-be-returned',
    });

    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', 'Bearer valid-access-token')
      .expect(200)
      .expect({
        id: 'user-1',
        email: 'person@example.com',
        name: 'Test User',
        phone: null,
      });

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-access-token', {
      secret: configService.authConfig.tokenSecret,
    });
  });

  it('rejects a refresh token when accessing a normal protected route', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user-1',
      role: 'customer',
      tokenType: 'refresh',
    });

    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', 'Bearer refresh-token')
      .expect(401);
  });

  it('requires a refresh token for the refresh endpoint', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user-1',
      role: 'customer',
      tokenType: 'access',
    });

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Authorization', 'Bearer access-token')
      .expect(401);
  });

  it('accepts a valid refresh token', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user-1',
      role: 'customer',
      tokenType: 'refresh',
    });

    authService.refresh.mockResolvedValue({
      token: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Authorization', 'Bearer valid-refresh-token')
      .expect(201)
      .expect({
        token: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
  });

  it('rejects an empty profile update', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user-1',
      role: 'customer',
      tokenType: 'access',
    });

    usersService.updateUser.mockRejectedValue(
      new BadRequestException('No fields provided for update'),
    );

    await request(app.getHttpServer())
      .put('/users')
      .set('Authorization', 'Bearer valid-access-token')
      .send({})
      .expect(400);
  });
});
