import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class CreateAddressDto {
  @ApiPropertyOptional({ example: 'منزل' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  title?: string;

  @ApiProperty({ example: 'تهران' })
  @IsString()
  @MaxLength(50)
  province: string;

  @ApiProperty({ example: 'تهران' })
  @IsString()
  @MaxLength(50)
  city: string;

  @ApiProperty({ example: 'خیابان انقلاب، کوچه ۱۲، پلاک ۴، واحد ۲' })
  @IsString()
  @MaxLength(500)
  addressLine: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsOptional()
  @IsString()
  @Length(10, 10, { message: 'کد پستی باید ۱۰ رقم باشد' })
  postalCode?: string;

  @ApiProperty({ example: 'علی محمدی' })
  @IsString()
  @MaxLength(100)
  receiverName: string;

  @ApiProperty({ example: '09123456789' })
  @IsString()
  @Matches(/^09\d{9}$/, { message: 'شماره موبایل گیرنده معتبر نیست' })
  receiverPhone: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto extends CreateAddressDto {}
