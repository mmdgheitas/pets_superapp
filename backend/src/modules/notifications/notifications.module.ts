import { Module } from '@nestjs/common';
import { FcmService } from './fcm.service';
import { MailService } from './mail.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, FcmService, MailService],
  exports: [NotificationsService, FcmService, MailService],
})
export class NotificationsModule {}
