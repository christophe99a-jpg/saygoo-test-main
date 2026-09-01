import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { OrdersModule } from './modules/orders/orders.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ShipmentsModule } from './modules/shipments/shipments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { JwtStrategy } from './common/guards/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    WarehousesModule,
    ReservationsModule,
    OrdersModule,
    InventoryModule,
    ShipmentsModule,
    NotificationsModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}