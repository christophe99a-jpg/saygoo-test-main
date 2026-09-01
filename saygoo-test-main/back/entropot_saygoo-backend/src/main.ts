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

  await app.listen(process.env.PORT || 3000);
  console.log(`🚀 SAYGOO Backend démarré sur http://localhost:3000`);
  console.log(`📚 Documentation API : http://localhost:3000/api/docs`);
}
bootstrap();