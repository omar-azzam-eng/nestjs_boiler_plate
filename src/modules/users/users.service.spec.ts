import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserEntity } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let repository: Record<string, jest.Mock>;

  beforeEach(() => {
    repository = {
      create: jest.fn((value) => value),
      insert: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      softDelete: jest.fn(),
      update: jest.fn(),
    };
    service = new UsersService(repository as never);
  });

  it('lists non-deleted users', async () => {
    repository.find.mockResolvedValue([{ id: 'u1' }]);

    await expect(service.getAllUsers()).resolves.toEqual([{ id: 'u1' }]);
    expect(repository.find).toHaveBeenCalledWith({
      where: { deletedAt: expect.anything() },
    });
  });

  it('returns a user by id', async () => {
    repository.findOne.mockResolvedValue({ id: 'u1' });

    await expect(service.getUserById('u1')).resolves.toEqual({ id: 'u1' });
  });

  it('throws when a user id does not exist', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.getUserById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when an email does not exist', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.getUserByEmail('missing@example.com')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects an empty update payload', async () => {
    repository.findOne.mockResolvedValue({ id: 'u1', deletedAt: null });

    await expect(service.updateUser('u1', {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates a user and returns the latest record', async () => {
    repository.findOne
      .mockResolvedValueOnce({ id: 'u1', name: 'Before', deletedAt: null })
      .mockResolvedValueOnce({ id: 'u1', name: 'After', deletedAt: null });
    repository.update.mockResolvedValue({ affected: 1 });

    await expect(service.updateUser('u1', { name: 'After' })).resolves.toEqual({
      id: 'u1',
      name: 'After',
      deletedAt: null,
    });
    expect(repository.update).toHaveBeenCalledWith('u1', { name: 'After' });
  });

  it('hashes a supplied password before passing it to the update query', async () => {
    repository.findOne
      .mockResolvedValueOnce({ id: 'u1', deletedAt: null })
      .mockResolvedValueOnce({ id: 'u1', deletedAt: null });
    repository.update.mockResolvedValue({ affected: 1 });
    const hashSpy = jest.spyOn(UserEntity, 'hashPassword').mockResolvedValue('hashed-password');

    await service.updateUser('u1', { password: 'StrongPassword123!' });

    expect(repository.update).toHaveBeenCalledWith('u1', { password: 'hashed-password' });
    hashSpy.mockRestore();
  });
});
