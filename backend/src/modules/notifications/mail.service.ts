import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

/**
 * Transactional email (order confirmations, seller notifications).
 * Without SMTP_HOST mails are logged — handy in local dev.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const host = process.env.SMTP_HOST ?? '';
    this.from = process.env.MAIL_FROM ?? 'PetShop <no-reply@petshop.ir>';
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(process.env.SMTP_PORT ?? '587', 10),
        secure: process.env.SMTP_PORT === '465',
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      });
      void config;
    }
  }

  async send(to: string | undefined | null, subject: string, text: string): Promise<void> {
    if (!to) return;
    if (!this.transporter) {
      this.logger.warn(`[MAIL MOCK] → ${to}: ${subject}`);
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, text });
    } catch (error) {
      // Email is best-effort; never break the business flow on mail failure
      this.logger.error(`Mail to ${to} failed: ${(error as Error).message}`);
    }
  }
}
