import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTicketDto {
  @ApiProperty({ example: 'مشکل در پرداخت' })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  subject: string;

  @ApiProperty({ example: 'پرداخت انجام شد اما سفارش ثبت نشد...' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message: string;
}
