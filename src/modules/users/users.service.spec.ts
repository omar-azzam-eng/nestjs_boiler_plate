import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { UsersService } from './users.service';
import { UserEntity, UserRoleEnum } from './entities/user.entity';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;

  type UserRepositoryMock = {
    create: jest.Mock;
    insert: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    softDelete: jest.Mock;
    update: jest.Mock;
  };

  const repository: UserRepositoryMock = {
    create: jest.fn(),
    insert: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
    update: jest.fn(),
  };
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();

    jest.spyOn(UserEntity, 'hashPassword').mockResolvedValue('hashed-password');

    repository.create.mockImplementation((value) => value as UserEntity);

    service = new UsersService(repository as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createUser', () => {
    it('does not pass undefined fields to the repository', async () => {
      repository.findOne
        .mockResolvedValueOnce({
          id: 'user-1',
          deletedAt: null,
        })
        .mockResolvedValueOnce({
          id: 'user-1',
          phone: '+963944123456',
          deletedAt: null,
        });

      repository.update.mockResolvedValue({ affected: 1 });

      await service.updateUser('user-1', {
        name: undefined,
        phone: '+963944123456',
      });

      expect(repository.update).toHaveBeenCalledWith('user-1', {
        phone: '+963944123456',
      });
    });

    it('hashes the password and inserts a customer record', async () => {
      jest.mocked(UserEntity.hashPassword).mockResolvedValue('hashed-password');
      repository.insert.mockResolvedValue({
        identifiers: [{ id: 'user-1' }],
      });

      await expect(
        service.createUser(
          {
            email: 'person@example.com',
            password: 'StrongPassword123!',
            name: 'Test User',
          },
          UserRoleEnum.CUSTOMER,
        ),
      ).resolves.toBe('user-1');

      expect(repository.create).toHaveBeenCalledWith({
        email: 'person@example.com',
        password: 'hashed-password',
        name: 'Test User',
        phone: undefined,
        role: UserRoleEnum.CUSTOMER,
      });

      expect(repository.insert).toHaveBeenCalledTimes(1);
    });

    it('converts a PostgreSQL unique violation into a conflict error', async () => {
      jest.mocked(UserEntity.hashPassword).mockResolvedValue('hashed-password');

      const error = new QueryFailedError(
        'INSERT INTO users',
        [],
        Object.assign(new Error('duplicate key'), { code: '23505' }),
      );

      repository.insert.mockRejectedValue(error);

      await expect(
        service.createUser(
          {
            email: 'person@example.com',
            password: 'StrongPassword123!',
          },
          UserRoleEnum.CUSTOMER,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('converts other database errors into internal server errors', async () => {
      jest.mocked(UserEntity.hashPassword).mockResolvedValue('hashed-password');
      repository.insert.mockRejectedValue(new Error('database unavailable'));

      await expect(
        service.createUser(
          {
            email: 'person@example.com',
            password: 'StrongPassword123!',
          },
          UserRoleEnum.CUSTOMER,
        ),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('does not insert a user when password hashing fails', async () => {
      jest
        .mocked(UserEntity.hashPassword)
        .mockRejectedValue(new Error('hash failed'));

      await expect(
        service.createUser(
          {
            email: 'person@example.com',
            password: 'StrongPassword123!',
          },
          UserRoleEnum.CUSTOMER,
        ),
      ).rejects.toThrow('hash failed');

      expect(repository.insert).not.toHaveBeenCalled();
    });
  });

  describe('getAllUsers', () => {
    it('excludes soft-deleted users', async () => {
      repository.find.mockResolvedValue([{ id: 'user-1' }]);

      await expect(service.getAllUsers()).resolves.toEqual([{ id: 'user-1' }]);

      expect(repository.find).toHaveBeenCalledWith({
        where: { deletedAt: expect.anything() },
      });
    });
  });

  describe('getUserById', () => {
    it('returns an existing user', async () => {
      repository.findOne.mockResolvedValue({ id: 'user-1' });

      await expect(service.getUserById('user-1')).resolves.toEqual({
        id: 'user-1',
      });

      expect(repository.findOne).toHaveBeenCalledWith({
        where: {
          id: 'user-1',
          deletedAt: expect.anything(),
        },
      });
    });

    it('rejects a missing or soft-deleted user', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.getUserById('missing-user')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getUserByEmail', () => {
    it('looks up an active user by email', async () => {
      repository.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'person@example.com',
      });

      await expect(
        service.getUserByEmail('person@example.com'),
      ).resolves.toMatchObject({
        id: 'user-1',
        email: 'person@example.com',
      });

      expect(repository.findOne).toHaveBeenCalledWith({
        where: {
          email: 'person@example.com',
          deletedAt: expect.anything(),
        },
      });
    });

    it('rejects an unknown email', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.getUserByEmail('missing@example.com'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteUser', () => {
    it('performs a soft delete instead of a hard delete', async () => {
      repository.softDelete.mockResolvedValue({ affected: 1 });

      await expect(service.deleteUser('user-1')).resolves.toBeUndefined();

      expect(repository.softDelete).toHaveBeenCalledWith({
        id: 'user-1',
        deletedAt: expect.anything(),
      });
    });
  });

  describe('updateUser', () => {
    it('rejects an empty update payload', async () => {
      await expect(service.updateUser('user-1', {})).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(repository.update).not.toHaveBeenCalled();
    });

    it('rejects updates containing only undefined fields', async () => {
      await expect(
        service.updateUser('user-1', { name: undefined }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates a user and returns the refreshed record', async () => {
      repository.findOne
        .mockResolvedValueOnce({
          id: 'user-1',
          name: 'Before',
          deletedAt: null,
        })
        .mockResolvedValueOnce({
          id: 'user-1',
          name: 'After',
          deletedAt: null,
        });

      repository.update.mockResolvedValue({ affected: 1 });

      await expect(
        service.updateUser('user-1', { name: 'After' }),
      ).resolves.toMatchObject({
        id: 'user-1',
        name: 'After',
      });

      expect(repository.update).toHaveBeenCalledWith('user-1', {
        name: 'After',
      });
    });

    it('hashes a new password before updating', async () => {
      repository.findOne
        .mockResolvedValueOnce({
          id: 'user-1',
          deletedAt: null,
        })
        .mockResolvedValueOnce({
          id: 'user-1',
          deletedAt: null,
        });

      repository.update.mockResolvedValue({ affected: 1 });

      jest
        .mocked(UserEntity.hashPassword)
        .mockResolvedValue('new-hashed-password');

      await service.updateUser('user-1', {
        password: 'NewStrongPassword123!',
      });

      expect(repository.update).toHaveBeenCalledWith('user-1', {
        password: 'new-hashed-password',
      });
    });

    it('does not update a user that does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.updateUser('missing-user', { name: 'New name' }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(repository.update).not.toHaveBeenCalled();
    });
  });
});
