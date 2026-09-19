import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { OrdersModule } from './modules/orders/orders.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ShipmentsModule } from './modules/shipments/shipments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StockageModule } from './modules/stockage/stockage.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { CockpitModule } from './modules/cockpit/cockpit.module';
import { JwtStrategy } from './common/guards/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    WarehousesModule,
    ReservationsModule,
    OrdersModule,
    InventoryModule,
    ShipmentsModule,
    NotificationsModule,
    StockageModule,
    IncidentsModule,
    CockpitModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}