// Chargé en tout premier : process.env doit être peuplé avant la lecture de PORT.
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Le trafic passe normalement par l'API Gateway ; CORS reste utile pour
  // les appels directs en développement.
  app.enableCors();

  // 3010 : port réservé au service Consignataire dans la table de routage
  // de la gateway. Sans valeur explicite, NestJS retombe sur 3000, déjà pris.
  const port = process.env.PORT ?? 3010;
  await app.listen(port);

  console.log(`🚢 SAYGOO Consignataire démarré sur http://localhost:${port}`);
}
bootstrap();
