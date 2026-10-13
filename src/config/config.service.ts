import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class ConfigService {
  private readonly env: {
    db: {
      host: string;
      port: number;
      user: string;
      password: string;
      database: string;
    };
    auth: {
      tokenSecret: string;
      refreshTokenSecret: string;
    };
  };

  constructor() {
    const required = (key: string): string => {
      const value = process.env[key]?.trim();

      if (!value) {
        throw new InternalServerErrorException(
          `Missing required environment variable: ${key}`,
        );
      }

      return value;
    };

    const port = Number(required('POSTGRES_PORT'));

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new InternalServerErrorException(
        'POSTGRES_PORT must be an integer between 1 and 65535',
      );
    }

    const tokenSecret = required('JWT_SECRET');
    const refreshTokenSecret = required('JWT_REFRESH_SECRET');

    if (tokenSecret === refreshTokenSecret) {
      throw new InternalServerErrorException(
        'JWT_SECRET and JWT_REFRESH_SECRET must be different',
      );
    }

    if (tokenSecret.length < 32 || refreshTokenSecret.length < 32) {
      throw new InternalServerErrorException(
        'JWT secrets must each contain at least 32 characters',
      );
    }

    this.env = {
      db: {
        host: required('POSTGRES_HOST'),
        port,
        user: required('POSTGRES_USER'),
        password: required('POSTGRES_PASSWORD'),
        database: required('POSTGRES_DB'),
      },
      auth: {
        tokenSecret,
        refreshTokenSecret,
      },
    };
  }

  get dbConfig() {
    return this.env.db;
  }

  get authConfig() {
    return this.env.auth;
  }
}
