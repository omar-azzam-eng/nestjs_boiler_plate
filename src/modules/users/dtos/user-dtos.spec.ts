import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDTO } from './create-user.dto';
import { UpdateUserDTO } from './update-user.dto';

describe('User DTOs', () => {
  describe('CreateUserDTO', () => {
    it('accepts valid required fields', async () => {
      const dto = plainToInstance(CreateUserDTO, {
        email: 'person@example.com',
        password: 'StrongPassword123!',
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
    });

    it('rejects invalid email and weak password', async () => {
      const dto = plainToInstance(CreateUserDTO, {
        email: 'invalid',
        password: 'weak',
      });

      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toEqual(
        expect.arrayContaining(['email', 'password']),
      );
    });

    it('rejects an invalid phone number', async () => {
      const dto = plainToInstance(CreateUserDTO, {
        email: 'person@example.com',
        password: 'StrongPassword123!',
        phone: 'not-a-phone',
      });

      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'phone')).toBe(true);
    });
  });

  describe('UpdateUserDTO', () => {
    it('accepts a name-only update', async () => {
      const dto = plainToInstance(UpdateUserDTO, {
        name: 'Updated name',
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
    });

    it('accepts an empty DTO at the validation layer', async () => {
      const dto = plainToInstance(UpdateUserDTO, {});

      await expect(validate(dto)).resolves.toHaveLength(0);
    });

    it('rejects weak replacement passwords', async () => {
      const dto = plainToInstance(UpdateUserDTO, {
        password: 'weak',
      });

      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'password')).toBe(true);
    });
  });
});
