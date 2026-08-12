import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

interface FirebaseConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  enabled: boolean;
}

/**
 * Firebase Cloud Messaging sender. Lazily initialised — if credentials are not
 * configured (local dev), messages are logged instead of being sent.
 */
@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private readonly cfg: FirebaseConfig;
  private app: admin.app.App | null = null;

  constructor(config: ConfigService) {
    this.cfg = config.get<FirebaseConfig>('firebase') as FirebaseConfig;
  }

  onModuleInit() {
    if (!this.cfg.enabled) {
      this.logger.warn('Firebase credentials not configured — push notifications are mocked');
      return;
    }
    try {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: this.cfg.projectId,
          clientEmail: this.cfg.clientEmail,
          privateKey: this.cfg.privateKey,
        }),
      });
      this.logger.log('Firebase Admin initialised');
    } catch (error) {
      this.logger.error(`Firebase init failed: ${(error as Error).message}`);
    }
  }

  async sendToTokens(
    tokens: string[],
    payload: { title: string; body: string; data?: Record<string, string> },
  ): Promise<void> {
    const uniqueTokens = [...new Set(tokens)].filter(Boolean);
    if (uniqueTokens.length === 0) return;

    if (!this.app) {
      this.logger.warn(
        `[FCM MOCK] → ${uniqueTokens.length} device(s): ${payload.title} — ${payload.body}`,
      );
      return;
    }
    try {
      const result = await this.app.messaging().sendEachForMulticast({
        tokens: uniqueTokens,
        notification: { title: payload.title, body: payload.body },
        data: payload.data,
      });
      this.logger.log(
        `FCM sent: ${result.successCount} ok, ${result.failureCount} failed of ${uniqueTokens.length}`,
      );
    } catch (error) {
      this.logger.error(`FCM send failed: ${(error as Error).message}`);
    }
  }
}
