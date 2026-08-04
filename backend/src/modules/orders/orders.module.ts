import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [NotificationsModule],
  controllers: [CartController, OrdersController],
  providers: [CartService, OrdersService],
  exports: [OrdersService, CartService],
})
export class OrdersModule {}
