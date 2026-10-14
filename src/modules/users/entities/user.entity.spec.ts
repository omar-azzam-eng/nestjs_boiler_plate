import { instanceToPlain } from 'class-transformer';
import { UserEntity, UserRoleEnum } from './user.entity';
import { getMetadataArgsStorage } from 'typeorm';

describe('UserEntity', () => {
  it('defines CUSTOMER as the default role in TypeORM metadata', () => {
    const roleColumn = getMetadataArgsStorage().columns.find(
      (column) =>
        column.target === UserEntity && column.propertyName === 'role',
    );

    expect(roleColumn?.options.default).toBe(UserRoleEnum.CUSTOMER);
  });
  it('defaults to the customer role at the entity metadata level', () => {
    const entity = new UserEntity();

    expect(entity).toBeInstanceOf(UserEntity);
  });

  it('does not expose the password when serialized to plain data', () => {
    const entity = Object.assign(new UserEntity(), {
      id: 'user-1',
      email: 'person@example.com',
      password: 'sensitive-hash',
      role: UserRoleEnum.CUSTOMER,
      name: 'Test User',
      phone: undefined,
    });

    const plain = instanceToPlain(entity);

    expect(plain).not.toHaveProperty('password');
    expect(plain).toMatchObject({
      id: 'user-1',
      email: 'person@example.com',
      role: UserRoleEnum.CUSTOMER,
      name: 'Test User',
    });
  });
});
