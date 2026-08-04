import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Service } from './s3.service';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

@Injectable()
export class UploadService {
  private readonly maxUploadMb: number;

  constructor(
    private readonly s3: S3Service,
    config: ConfigService,
  ) {
    this.maxUploadMb = config.get<number>('storage.maxUploadMb') ?? 5;
  }

  private validate(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('فایلی ارسال نشده است');
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('فرمت فایل مجاز نیست (فقط JPG، PNG، WebP، GIF)');
    }
    if (file.size > this.maxUploadMb * 1024 * 1024) {
      throw new BadRequestException(`حجم فایل نباید بیشتر از ${this.maxUploadMb} مگابایت باشد`);
    }
  }

  async uploadImage(userId: string, file: Express.Multer.File) {
    this.validate(file);
    const key = this.s3.buildKey(userId, file.originalname);
    return this.s3.uploadPublic(key, file.buffer, file.mimetype);
  }

  async uploadImages(userId: string, files: Express.Multer.File[]) {
    if (!files?.length) {
      throw new BadRequestException('فایلی ارسال نشده است');
    }
    const results: { key: string; url: string }[] = [];
    for (const file of files) {
      results.push(await this.uploadImage(userId, file));
    }
    return results;
  }
}
