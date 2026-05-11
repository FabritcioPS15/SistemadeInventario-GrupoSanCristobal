import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { TicketsModule } from './tickets/tickets.module';
import { InventoryModule } from './inventory/inventory.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { LocationsModule } from './locations/locations.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { ChatModule } from './chat/chat.module';
import { AuditModule } from './audit/audit.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SutranModule } from './sutran/sutran.module';

@Module({
  imports: [
    PrismaModule,
    TicketsModule,
    InventoryModule,
    AuthModule,
    UsersModule,
    MaintenanceModule,
    LocationsModule,
    VehiclesModule,
    ChatModule,
    AuditModule,
    DashboardModule,
    NotificationsModule,
    SutranModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
