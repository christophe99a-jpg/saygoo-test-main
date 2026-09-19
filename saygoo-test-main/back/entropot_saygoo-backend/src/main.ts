// Chargé en tout premier : process.env doit être peuplé avant la lecture de PORT.
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuration Swagger
  const config = new DocumentBuilder()
    .setTitle('SAYGOO - Entrepôts & MAD API')
    .setDescription('API Backend de la plateforme logistique SAYGOO — Le Booking.com du stockage en Afrique')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentification et gestion des utilisateurs')
    .addTag('Warehouses', 'Gestion des entrepôts')
    .addTag('Reservations', 'Réservations en temps réel')
    .addTag('Orders', 'Gestion des commandes')
    .addTag('Inventory', 'Suivi des stocks')
    .addTag('Shipments', 'Livraisons et tracking')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // CORS pour le frontend
  app.enableCors();

  const port = process.env.PORT || 3008;
  await app.listen(port);
  console.log(`🚀 SAYGOO Entrepôt démarré sur http://localhost:${port}`);
  console.log(`📚 Documentation API : http://localhost:${port}/api/docs`);
}
bootstrap();