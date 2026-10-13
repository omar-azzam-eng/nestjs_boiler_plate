import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRoleEnum } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  let usersService: {
    createUser: jest.Mock;
    getUserByEmail: jest.Mock;
  };

  let jwtService: {
    signAsync: jest.Mock;
  };

  let configService: {
    authConfig: {
      tokenSecret: string;
      refreshTokenSecret: string;
    };
  };

  beforeEach(() => {
    jest.mocked(bcrypt.compare).mockReset();

    usersService = {
      createUser: jest.fn(),
      getUserByEmail: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn(),
    };

    configService = {
      authConfig: {
        tokenSecret: 'access-secret-for-tests',
        refreshTokenSecret: 'refresh-secret-for-tests',
      },
    };

    let sequence = 0;

    jwtService.signAsync.mockImplementation(() => `signed-token-${++sequence}`);

    service = new AuthService(
      usersService as never,
      jwtService as never,
      configService as never,
    );
  });

  it('creates a customer and returns access and refresh tokens on signup', async () => {
    usersService.createUser.mockResolvedValue('user-1');

    await expect(
      service.signup('person@example.com', 'StrongPassword123!'),
    ).resolves.toEqual({
      token: 'signed-token-1',
      refreshToken: 'signed-token-2',
    });

    expect(usersService.createUser).toHaveBeenCalledWith(
      {
        email: 'person@example.com',
        password: 'StrongPassword123!',
      },
      UserRoleEnum.CUSTOMER,
    );

    expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
  });

  it('returns tokens for a valid email and password', async () => {
    usersService.getUserByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      password: '$2b$10$hash',
      role: UserRoleEnum.CUSTOMER,
    });

    jest.mocked(bcrypt.compare).mockResolvedValue(true);

    await expect(
      service.signIn('person@example.com', 'correct-password'),
    ).resolves.toEqual({
      token: 'signed-token-1',
      refreshToken: 'signed-token-2',
    });
  });

  it('rejects an unknown email without exposing account existence', async () => {
    usersService.getUserByEmail.mockRejectedValue(new NotFoundException());

    await expect(
      service.signIn('missing@example.com', 'wrong'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an incorrect password', async () => {
    usersService.getUserByEmail.mockResolvedValue({
      id: 'user-1',
      password: '$2b$10$hash',
      role: UserRoleEnum.CUSTOMER,
    });

    jest.mocked(bcrypt.compare).mockResolvedValue(false);

    await expect(
      service.signIn('person@example.com', 'wrong'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('issues a fresh token pair for a validated refresh identity', async () => {
    await expect(
      service.refresh('user-1', UserRoleEnum.CUSTOMER),
    ).resolves.toEqual({
      token: 'signed-token-1',
      refreshToken: 'signed-token-2',
    });
  });
});
