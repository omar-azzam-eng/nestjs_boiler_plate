import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from './config.service';

describe('ConfigService', () => {
  const keys = [
    'POSTGRES_HOST',
    'POSTGRES_PORT',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ] as const;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.POSTGRES_HOST = 'localhost';
    process.env.POSTGRES_PORT = '5432';
    process.env.POSTGRES_USER = 'test-user';
    process.env.POSTGRES_PASSWORD = 'test-password';
    process.env.POSTGRES_DB = 'test-db';
    process.env.JWT_SECRET = 'a'.repeat(40);
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(40);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('loads database and authentication configuration', () => {
    const config = new ConfigService();

    expect(config.dbConfig).toEqual({
      host: 'localhost',
      port: 5432,
      user: 'test-user',
      password: 'test-password',
      database: 'test-db',
    });
    expect(config.authConfig.tokenSecret).toBe('a'.repeat(40));
    expect(config.authConfig.refreshTokenSecret).toBe('b'.repeat(40));
  });

  it.each(keys)('rejects a missing %s', (key) => {
    delete process.env[key];

    expect(() => new ConfigService()).toThrow(InternalServerErrorException);
  });

  it.each(['0', '-1', '65536', 'not-a-number', '5432.5'])(
    'rejects invalid PostgreSQL port %s',
    (port) => {
      process.env.POSTGRES_PORT = port;

      expect(() => new ConfigService()).toThrow(InternalServerErrorException);
    },
  );

  it('rejects identical JWT secrets', () => {
    process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET;

    expect(() => new ConfigService()).toThrow(InternalServerErrorException);
  });

  it('rejects short JWT secrets', () => {
    process.env.JWT_SECRET = 'short';

    expect(() => new ConfigService()).toThrow(InternalServerErrorException);
  });
});
