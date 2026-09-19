import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from './users/users.module';
import { BlModule } from './bl/bl.module';
import { InvoiceModule } from './invoice/invoice.module';
import { PaymentModule } from './payment/payment.module';
import { DeliveryOrderModule } from './delivery-order/delivery-order.module';
import { WorkflowModule } from './workflow/workflow.module';
import { TrackingModule } from './tracking/tracking.module';
import { NotificationModule } from './notification/notification.module';
import { VesselModule } from './vessel/vessel.module';
import { StatsModule } from './stats/stats.module';
import { DocumentModule } from './documents/document.module';
import { BookingModule } from './booking/booking.module';
import { JwtStrategy } from './common/guards/jwt.strategy';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: parseInt(config.get('DB_PORT') ?? '5432'),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    BlModule,
    InvoiceModule,
    PaymentModule,
    DeliveryOrderModule,
    WorkflowModule,
    TrackingModule,
    NotificationModule,
    VesselModule,
    StatsModule,
    DocumentModule,
    BookingModule,
  ],
  providers: [
    JwtStrategy,
    // Appliquée à toutes les routes : l'authentification devient le défaut.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}