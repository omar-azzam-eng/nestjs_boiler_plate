import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const authService = {
    signup: jest.fn(),
    signIn: jest.fn(),
    refresh: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = moduleRef.get(AuthController);
  });

  it('returns the public health response', () => {
    expect(controller.health()).toEqual({ status: 'ok' });
  });

  it('delegates signup credentials to AuthService', async () => {
    const tokens = { token: 'access', refreshToken: 'refresh' };
    authService.signup.mockResolvedValue(tokens);

    await expect(
      controller.signup({
        email: 'person@example.com',
        password: 'StrongPassword123!',
      }),
    ).resolves.toEqual(tokens);

    expect(authService.signup).toHaveBeenCalledWith(
      'person@example.com',
      'StrongPassword123!',
    );
  });

  it('delegates signin credentials to AuthService', async () => {
    const tokens = { token: 'access', refreshToken: 'refresh' };
    authService.signIn.mockResolvedValue(tokens);

    await expect(
      controller.signIn({
        email: 'person@example.com',
        password: 'password',
      }),
    ).resolves.toEqual(tokens);

    expect(authService.signIn).toHaveBeenCalledWith(
      'person@example.com',
      'password',
    );
  });

  it('delegates refresh identity to AuthService', async () => {
    const tokens = { token: 'access', refreshToken: 'refresh' };
    authService.refresh.mockResolvedValue(tokens);

    await expect(
      controller.refresh({
        id: 'user-1',
        role: 'customer' as never,
      }),
    ).resolves.toEqual(tokens);

    expect(authService.refresh).toHaveBeenCalledWith('user-1');
  });
});
