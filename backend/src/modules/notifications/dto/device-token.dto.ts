import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';

export class DeviceTokenDto {
  @ApiProperty({ description: 'FCM registration token' })
  @IsString()
  @MinLength(10)
  token: string;

  @ApiProperty({ enum: ['android', 'ios', 'web'], default: 'android' })
  @IsIn(['android', 'ios', 'web'])
  platform: string;
}
