import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersModule } from '../orders/orders.module';
import { TasksService } from './tasks.service';

@Module({
  imports: [OrdersModule, NotificationsModule],
  providers: [TasksService],
})
export class TasksModule {}
