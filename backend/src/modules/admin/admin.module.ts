import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { ProductsModule } from '../products/products.module';
import { AdminController, BannersController, SupportController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [NotificationsModule, ProductsModule, PaymentsModule],
  controllers: [AdminController, BannersController, SupportController],
  providers: [AdminService],
})
export class AdminModule {}
