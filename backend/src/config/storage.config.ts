import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  endpoint: process.env.S3_ENDPOINT ?? 'https://s3.ir-thr-at1.arvanstorage.ir',
  region: process.env.S3_REGION ?? 'ir-thr-at1',
  bucket: process.env.S3_BUCKET ?? 'pets-uploads',
  accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
  publicBaseUrl: process.env.PUBLIC_FILE_BASE_URL ?? 'http://localhost:3000/mock-cdn',
  driver: process.env.UPLOAD_DRIVER ?? 'mock', // 's3' | 'mock'
  maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB ?? '5', 10),
}));
