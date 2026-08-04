import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { IRAN_PHONE_REGEX } from './request-otp.dto';

export class VerifyOtpDto {
  @ApiProperty({ example: '09123456789' })
  @IsString()
  @Matches(IRAN_PHONE_REGEX, { message: 'شماره موبایل معتبر نیست' })
  phone: string;

  @ApiProperty({ example: '12345', description: 'کد تأیید ارسال‌شده با پیامک' })
  @IsString()
  @MinLength(4)
  @MaxLength(8)
  code: string;

  @ApiPropertyOptional({ example: 'علی محمدی', description: 'نام؛ فقط هنگام ثبت‌نام اولیه' })
  @IsString()
  @MaxLength(100)
  fullName?: string;
}
