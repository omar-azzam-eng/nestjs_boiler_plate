import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../src/modules/users/users.service';
import {
  UserEntity,
  UserRoleEnum,
} from '../src/modules/users/entities/user.entity';

const runDatabaseTests = process.env.RUN_DB_INTEGRATION === 'true';

if (
  runDatabaseTests &&
  !process.env.TEST_POSTGRES_DB?.toLowerCase().includes('test')
) {
  throw new Error(
    'Refusing to run database integration tests: ' +
      'TEST_POSTGRES_DB must contain "test".',
  );
}

const databaseDescribe = runDatabaseTests ? describe : describe.skip;

databaseDescribe('UsersService with real PostgreSQL', () => {
  let app: INestApplication;
  let service: UsersService;
  let repository: Repository<UserEntity>;

  beforeAll(async () => {
    const port = Number(process.env.TEST_POSTGRES_PORT);

    if (
      !process.env.TEST_POSTGRES_HOST ||
      !process.env.TEST_POSTGRES_USER ||
      !process.env.TEST_POSTGRES_PASSWORD ||
      !process.env.TEST_POSTGRES_DB ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535
    ) {
      throw new Error(
        'Set all TEST_POSTGRES_* variables before running DB integration tests.',
      );
    }

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.TEST_POSTGRES_HOST,
          port,
          username: process.env.TEST_POSTGRES_USER,
          password: process.env.TEST_POSTGRES_PASSWORD,
          database: process.env.TEST_POSTGRES_DB,
          entities: [UserEntity],
          synchronize: true,
          dropSchema: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([UserEntity]),
      ],
      providers: [UsersService],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    service = app.get(UsersService);
    repository = app.get<Repository<UserEntity>>(
      getRepositoryToken(UserEntity),
    );
  });

  beforeEach(async () => {
    await repository.clear();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('persists a user and stores a password hash', async () => {
    const id = await service.createUser(
      {
        email: 'persist@example.com',
        password: 'StrongPassword123!',
        name: 'Database User',
      },
      UserRoleEnum.CUSTOMER,
    );

    const user = await service.getUserById(id);

    expect(user.id).toBe(id);
    expect(user.email).toBe('persist@example.com');
    expect(user.password).not.toBe('StrongPassword123!');
    await expect(
      bcrypt.compare('StrongPassword123!', user.password),
    ).resolves.toBe(true);
  });

  it('enforces unique email addresses', async () => {
    const user = {
      email: 'duplicate@example.com',
      password: 'StrongPassword123!',
    };

    await service.createUser(user, UserRoleEnum.CUSTOMER);

    await expect(
      service.createUser(user, UserRoleEnum.CUSTOMER),
    ).rejects.toMatchObject({
      status: 409,
    });
  });

  it('does not return a soft-deleted user', async () => {
    const id = await service.createUser(
      {
        email: 'deleted@example.com',
        password: 'StrongPassword123!',
      },
      UserRoleEnum.CUSTOMER,
    );

    await service.deleteUser(id);

    await expect(service.getUserById(id)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('updates persisted profile data', async () => {
    const id = await service.createUser(
      {
        email: 'update@example.com',
        password: 'StrongPassword123!',
        name: 'Before',
      },
      UserRoleEnum.CUSTOMER,
    );

    await service.updateUser(id, { name: 'After' });

    const updated = await service.getUserById(id);

    expect(updated.name).toBe('After');
  });
});
