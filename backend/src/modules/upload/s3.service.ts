import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

interface StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  driver: 's3' | 'mock';
  maxUploadMb: number;
}

/**
 * ArvanCloud Object Storage (S3-compatible) client.
 *
 * With UPLOAD_DRIVER=mock no network call is made — a deterministic public URL
 * is returned so the rest of the stack can be developed without credentials.
 */
@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly cfg: StorageConfig;
  private client: S3Client | null = null;

  constructor(config: ConfigService) {
    this.cfg = config.get<StorageConfig>('storage') as StorageConfig;
    if (this.cfg.driver === 's3') {
      this.client = new S3Client({
        endpoint: this.cfg.endpoint,
        region: this.cfg.region,
        credentials: {
          accessKeyId: this.cfg.accessKeyId,
          secretAccessKey: this.cfg.secretAccessKey,
        },
        forcePathStyle: true,
      });
    }
  }

  buildKey(userId: string, originalName: string): string {
    const ext = (originalName.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    return `uploads/${userId}/${randomUUID()}.${ext || 'bin'}`;
  }

  buildPublicUrl(key: string): string {
    return `${this.cfg.publicBaseUrl.replace(/\/$/, '')}/${key}`;
  }

  async uploadPublic(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<{ key: string; url: string }> {
    if (this.cfg.driver === 'mock' || !this.client) {
      this.logger.warn(`[UPLOAD MOCK] pretending to upload ${key} (${body.length} bytes)`);
      return { key, url: this.buildPublicUrl(key) };
    }
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.cfg.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          ACL: 'public-read',
        }),
      );
      return { key, url: this.buildPublicUrl(key) };
    } catch (error) {
      this.logger.error(`S3 upload failed for ${key}: ${(error as Error).message}`);
      throw new InternalServerErrorException('بارگذاری فایل با خطا مواجه شد');
    }
  }
}
