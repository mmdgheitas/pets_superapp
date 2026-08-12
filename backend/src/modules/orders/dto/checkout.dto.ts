import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CheckoutDto {
  @ApiProperty({ description: 'شناسه آدرس تحویل (از /users/me/addresses)' })
  @IsUUID()
  addressId: string;
}
