import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * DataSource utilisée exclusivement par la CLI TypeORM
 * (generate, run, revert). L'application, elle, se configure dans
 * app.module.ts via TypeOrmModule.forRootAsync.
 *
 * Les deux doivent rester cohérentes : même base, mêmes entités,
 * mêmes migrations. Seul ce fichier est lu par la CLI, qui ne sait
 * pas charger un module NestJS.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // Les chemins pointent vers les sources TypeScript : la CLI est lancée
  // via ts-node, pas sur le code compilé.
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],

  // Jamais true ici. C'est précisément ce qu'on remplace par les migrations.
  synchronize: false,
  logging: ['error', 'warn', 'migration'],
});
