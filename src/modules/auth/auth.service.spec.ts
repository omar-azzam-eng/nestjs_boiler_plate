import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserRoleEnum } from '../users/entities/user.entity';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const usersService = {
    createUser: jest.fn(),
    getUserByEmail: jest.fn(),
    getUserById: jest.fn(),
  };

  const jwtService = {
    signAsync: jest.fn(),
  };

  const configService = {
    authConfig: {
      tokenSecret: 'a'.repeat(40),
      refreshTokenSecret: 'b'.repeat(40),
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();

    let sequence = 0;
    jwtService.signAsync.mockImplementation(() => `signed-token-${++sequence}`);

    service = new AuthService(
      usersService as never,
      jwtService as never,
      configService as never,
    );
  });

  describe('signup', () => {
    it('creates a customer and returns both tokens', async () => {
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
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        {
          id: 'user-1',
          role: UserRoleEnum.CUSTOMER,
          tokenType: 'access',
        },
        {
          expiresIn: '1d',
          secret: configService.authConfig.tokenSecret,
        },
      );
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        2,
        {
          id: 'user-1',
          role: UserRoleEnum.CUSTOMER,
          tokenType: 'refresh',
        },
        {
          expiresIn: '7d',
          secret: configService.authConfig.refreshTokenSecret,
        },
      );
    });

    it('does not issue tokens if user creation fails', async () => {
      usersService.createUser.mockRejectedValue(new Error('database failure'));

      await expect(
        service.signup('person@example.com', 'StrongPassword123!'),
      ).rejects.toThrow('database failure');

      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('signIn', () => {
    const user = {
      id: 'user-1',
      email: 'person@example.com',
      password: '$2b$10$stored-hash',
      role: UserRoleEnum.CUSTOMER,
    };

    it('issues a token pair for valid credentials', async () => {
      usersService.getUserByEmail.mockResolvedValue(user);
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

      await expect(
        service.signIn('person@example.com', 'correct-password'),
      ).resolves.toEqual({
        token: 'signed-token-1',
        refreshToken: 'signed-token-2',
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'correct-password',
        user.password,
      );
    });

    it('rejects unknown email with a generic authentication error', async () => {
      usersService.getUserByEmail.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        service.signIn('missing@example.com', 'wrong-password'),
      ).rejects.toMatchObject({
        status: 401,
        message: 'Invalid email or password',
      });

      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('rejects an incorrect password', async () => {
      usersService.getUserByEmail.mockResolvedValue(user);
      jest.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        service.signIn('person@example.com', 'wrong-password'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('propagates unexpected user lookup errors', async () => {
      usersService.getUserByEmail.mockRejectedValue(
        new Error('database unavailable'),
      );

      await expect(
        service.signIn('person@example.com', 'password'),
      ).rejects.toThrow('database unavailable');
    });

    it('does not issue tokens when password comparison fails unexpectedly', async () => {
      usersService.getUserByEmail.mockResolvedValue(user);
      jest
        .mocked(bcrypt.compare)
        .mockRejectedValue(new Error('bcrypt failure'));

      await expect(
        service.signIn('person@example.com', 'password'),
      ).rejects.toThrow('bcrypt failure');

      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('uses the current database role instead of the token role', async () => {
      usersService.getUserById.mockResolvedValue({
        id: 'user-1',
        role: UserRoleEnum.ADMIN,
      });

      await service.refresh('user-1');

      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        {
          id: 'user-1',
          role: UserRoleEnum.ADMIN,
          tokenType: 'access',
        },
        expect.objectContaining({
          secret: configService.authConfig.tokenSecret,
        }),
      );
    });

    it('rejects a user that no longer exists', async () => {
      usersService.getUserById.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(service.refresh('deleted-user')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('issues a fresh token pair for an existing user', async () => {
      usersService.getUserById.mockResolvedValue({
        id: 'user-1',
        role: UserRoleEnum.CUSTOMER,
      });

      await expect(service.refresh('user-1')).resolves.toEqual({
        token: 'signed-token-1',
        refreshToken: 'signed-token-2',
      });
    });
  });
});
