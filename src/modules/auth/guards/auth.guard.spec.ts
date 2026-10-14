import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { UserRoleEnum } from 'src/modules/users/entities/user.entity';

describe('AuthGuard', () => {
  const makeContext = (authorization?: string): ExecutionContext => {
    const request: { headers: { authorization?: string }; user?: unknown } = {
      headers: { authorization },
    };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  let reflector: { getAllAndOverride: jest.Mock };
  let jwtService: { verifyAsync: jest.Mock };
  let configService: {
    authConfig: { tokenSecret: string; refreshTokenSecret: string };
  };
  let guard: AuthGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    jwtService = { verifyAsync: jest.fn() };
    configService = {
      authConfig: {
        tokenSecret: 'access-secret',
        refreshTokenSecret: 'refresh-secret',
      },
    };
    guard = new AuthGuard(
      jwtService as never,
      reflector as unknown as Reflector,
      configService as never,
    );
  });

  it('rejects a token without a string user id', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      role: 'customer',
      tokenType: 'access',
    });

    await expect(
      guard.canActivate(makeContext('Bearer token')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an unsupported role in the token', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'u1',
      role: 'superuser',
      tokenType: 'access',
    });

    await expect(
      guard.canActivate(makeContext('Bearer token')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('verifies refresh tokens using the refresh secret', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      return key === 'refresh';
    });

    jwtService.verifyAsync.mockResolvedValue({
      id: 'u1',
      role: 'customer',
      tokenType: 'refresh',
    });

    await expect(
      guard.canActivate(makeContext('Bearer refresh-token')),
    ).resolves.toBe(true);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('refresh-token', {
      secret: 'refresh-secret',
    });
  });

  it('allows a public route without a token', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce(true);

    await expect(guard.canActivate(makeContext())).resolves.toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('rejects a request without a bearer token', async () => {
    await expect(guard.canActivate(makeContext())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects malformed authorization headers', async () => {
    await expect(
      guard.canActivate(makeContext('Basic abc')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an invalid JWT', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));

    await expect(
      guard.canActivate(makeContext('Bearer invalid-token')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token with the wrong token type', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'u1',
      role: 'customer',
      tokenType: 'refresh',
    });

    await expect(
      guard.canActivate(makeContext('Bearer refresh-token')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts a valid access token and attaches its identity to the request', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'u1',
      role: 'customer',
      tokenType: 'access',
    });
    const context = makeContext('Bearer valid-token');
    const request = context.switchToHttp().getRequest<{
      user?: {
        id: string;
        role: UserRoleEnum;
      };
    }>();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'u1', role: 'customer' });
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
      secret: 'access-secret',
    });
  });
});
