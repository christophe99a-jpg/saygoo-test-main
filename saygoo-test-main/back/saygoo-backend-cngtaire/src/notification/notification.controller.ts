import { Controller, Post, Body } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notification')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Post('send')
  send(@Body() body: {
    to: string;
    subject: string;
    message: string;
  }) {
    return this.notificationService.sendEmail(body.to, body.subject, body.message);
  }
}