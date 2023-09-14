/* eslint-disable sort-keys */
import 'reflect-metadata';
import { DataSource } from 'typeorm';

console.log('TypeORM starting form dirname:', __dirname, 'DB Logging:', !!process.env.DB_LOGGING);

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: true,
  logging: !!process.env.DB_LOGGING,
  entities: [__dirname + '/entity/*.{js,ts}'],
  migrations: [],
  subscribers: [],
});
