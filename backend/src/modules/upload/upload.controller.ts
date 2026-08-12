import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UploadService } from './upload.service';

@ApiTags('upload')
@ApiBearerAuth('access-token')
@Controller({ path: 'upload', version: '1' })
export class UploadController {
  constructor(private readonly upload: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'بارگذاری یک تصویر (JPG/PNG/WebP/GIF)' })
  uploadImage(@CurrentUser('id') userId: string, @UploadedFile() file: Express.Multer.File) {
    return this.upload.uploadImage(userId, file);
  }

  @Post('images')
  @UseInterceptors(FilesInterceptor('files', 5))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
      required: ['files'],
    },
  })
  @ApiOperation({ summary: 'بارگذاری حداکثر ۵ تصویر همزمان (برای گالری محصول)' })
  uploadImages(
    @CurrentUser('id') userId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.upload.uploadImages(userId, files);
  }
}
