import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token صادرشده هنگام ورود/تازه‌سازی قبلی' })
  @IsString()
  refreshToken: string;
}
