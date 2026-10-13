import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigDTO } from './dtos/config.dto';

@Injectable()
export class ConfigService {
  private env: ConfigDTO;

  constructor() {
    const env = {
      db: {
        host: process.env.POSTGRES_HOST,
        port: parseInt(process.env.POSTGRES_PORT ?? '5432'),
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB,
      },
      auth: {
        tokenSecret: process.env.JWT_SECRET,
        refreshTokenSecret: process.env.JWT_REFRESH_SECRET,
      },
    };

    for (const key in env.db) {
      if (!env.db[key as keyof typeof env.db]) {
        throw new InternalServerErrorException();
      }
    }
    for (const key in env.auth) {
      if (!env.auth[key as keyof typeof env.auth]) {
        throw new InternalServerErrorException();
      }
    }
    this.env = env as ConfigDTO;
  }

  public get dbConfig() {
    return this.env.db;
  }

  public get authConfig() {
    return this.env.auth;
  }
}
