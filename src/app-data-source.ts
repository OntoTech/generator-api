import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { env } from './util/env';

config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.DATABASE_HOST,
  port: parseInt(env.DATABASE_PORT as string, 10),
  username: env.DATABASE_USER,
  password: env.DATABASE_PASSWORD,
  database: env.DATABASE_NAME,
  schema: env.DATABASE_SCHEMA,
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/migrations/*.js'],
});

export { AppDataSource };
