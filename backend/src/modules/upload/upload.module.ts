import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { S3Service } from './s3.service';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [
    MulterModule.register({
      // Buffer in memory, then stream to ArvanCloud — no files on local disk
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService, S3Service],
  exports: [UploadService, S3Service],
})
export class UploadModule {}
