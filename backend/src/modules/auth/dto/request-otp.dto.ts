import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export const IRAN_PHONE_REGEX = /^09\d{9}$/;

/** Iranian mobile numbers: 09xxxxxxxxx (also normalises +98/0098 prefixes). */
export function normalizeIranPhone(raw: string): string {
  let phone = raw.trim().replace(/[\s-]/g, '');
  if (phone.startsWith('0098')) phone = phone.slice(4);
  if (phone.startsWith('+98')) phone = phone.slice(3);
  if (phone.startsWith('98') && phone.length === 12) phone = phone.slice(2);
  if (phone.startsWith('9') && phone.length === 10) phone = `0${phone}`;
  return phone;
}

export class RequestOtpDto {
  @ApiProperty({ example: '09123456789', description: 'شماره موبایل (ایرانی)' })
  @IsString()
  @Matches(IRAN_PHONE_REGEX, { message: 'شماره موبایل معتبر نیست (مثال: 09123456789)' })
  phone: string;
}
