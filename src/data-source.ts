import { config } from 'dotenv';
import { DataSource } from 'typeorm';
config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT ?? '5432'),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: ['**/*.entity.ts'],
  migrations: ['src/migrations/*-migration.ts'],
});

export default dataSource;
