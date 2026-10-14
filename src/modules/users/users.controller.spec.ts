import { Test } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  const usersService = {
    getUserById: jest.fn(),
    updateUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = moduleRef.get(UsersController);
  });

  it('returns the authenticated user profile without a password', async () => {
    usersService.getUserById.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      password: 'secret-hash',
      name: 'Test User',
      phone: '+963944123456',
    });

    await expect(
      controller.getMe({
        id: 'user-1',
        role: 'customer' as never,
      }),
    ).resolves.toEqual({
      id: 'user-1',
      email: 'person@example.com',
      name: 'Test User',
      phone: '+963944123456',
    });

    expect(usersService.getUserById).toHaveBeenCalledWith('user-1');
  });

  it('updates only the authenticated user profile', async () => {
    usersService.updateUser.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      name: 'Updated name',
      phone: undefined,
    });

    await expect(
      controller.updateMe(
        { name: 'Updated name' },
        { id: 'user-1', role: 'customer' as never },
      ),
    ).resolves.toEqual({
      id: 'user-1',
      email: 'person@example.com',
      name: 'Updated name',
      phone: undefined,
    });

    expect(usersService.updateUser).toHaveBeenCalledWith('user-1', {
      name: 'Updated name',
    });
  });
});
