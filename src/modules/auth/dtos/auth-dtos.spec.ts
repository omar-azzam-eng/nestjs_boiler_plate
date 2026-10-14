import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SignupDTO } from './signup.dto';
import { SigninDTO } from './signin.dto';

describe('Authentication DTOs', () => {
  describe('SignupDTO', () => {
    it('accepts a valid email and strong password', async () => {
      const dto = plainToInstance(SignupDTO, {
        email: 'person@example.com',
        password: 'StrongPassword123!',
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
    });

    it.each([
      { email: 'invalid-email', password: 'StrongPassword123!' },
      { email: 'person@example.com', password: 'weak' },
      { email: '', password: 'StrongPassword123!' },
      { email: 'person@example.com', password: '' },
    ])('rejects invalid signup payloads', async (payload) => {
      const dto = plainToInstance(SignupDTO, payload);

      await expect(validate(dto)).resolves.not.toHaveLength(0);
    });

    it('rejects missing required fields', async () => {
      const dto = plainToInstance(SignupDTO, {});

      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toEqual(
        expect.arrayContaining(['email', 'password']),
      );
    });
  });

  describe('SigninDTO', () => {
    it('accepts valid credentials', async () => {
      const dto = plainToInstance(SigninDTO, {
        email: 'person@example.com',
        password: 'any-nonempty-password',
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
    });

    it('rejects an invalid email', async () => {
      const dto = plainToInstance(SigninDTO, {
        email: 'not-an-email',
        password: 'password',
      });

      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'email')).toBe(true);
    });

    it('rejects a non-string password', async () => {
      const dto = plainToInstance(SigninDTO, {
        email: 'person@example.com',
        password: 12345,
      });

      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'password')).toBe(true);
    });
  });
});
