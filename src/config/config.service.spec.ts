import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from './config.service';

describe('ConfigService', () => {
  const originalEnv = process.env;

  const validEnv = {
    POSTGRES_HOST: 'localhost',
    POSTGRES_PORT: '5432',
    POSTGRES_USER: 'test_user',
    POSTGRES_PASSWORD: 'test_password',
    POSTGRES_DB: 'test_db',
    JWT_SECRET: 'a'.repeat(40),
    JWT_REFRESH_SECRET: 'b'.repeat(40),
  };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, ...validEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('loads valid database and JWT configuration', () => {
    const config = new ConfigService();

    expect(config.dbConfig).toEqual({
      host: 'localhost',
      port: 5432,
      user: 'test_user',
      password: 'test_password',
      database: 'test_db',
    });

    expect(config.authConfig).toEqual({
      tokenSecret: 'a'.repeat(40),
      refreshTokenSecret: 'b'.repeat(40),
    });
  });

  it.each([
    'POSTGRES_HOST',
    'POSTGRES_PORT',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ])('rejects a missing %s', (key) => {
    delete process.env[key];

    expect(() => new ConfigService()).toThrow(InternalServerErrorException);
  });

  it.each(['0', '-1', '65536', '1.5', 'abc'])(
    'rejects invalid POSTGRES_PORT value %s',
    (port) => {
      process.env.POSTGRES_PORT = port;

      expect(() => new ConfigService()).toThrow(InternalServerErrorException);
    },
  );

  it('rejects access and refresh secrets that are identical', () => {
    process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET;

    expect(() => new ConfigService()).toThrow(InternalServerErrorException);
  });

  it('rejects a JWT secret that is too short', () => {
    process.env.JWT_SECRET = 'short-secret';

    expect(() => new ConfigService()).toThrow(InternalServerErrorException);
  });

  it('trims whitespace around environment values', () => {
    process.env.POSTGRES_HOST = '  localhost  ';

    const config = new ConfigService();

    expect(config.dbConfig.host).toBe('localhost');
  });
});
