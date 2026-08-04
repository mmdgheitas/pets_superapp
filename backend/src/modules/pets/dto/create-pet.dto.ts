import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PetGender, PetSpecies } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePetDto {
  @ApiProperty({ example: 'مشمش' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({ enum: PetSpecies, example: PetSpecies.CAT })
  @IsEnum(PetSpecies)
  species: PetSpecies;

  @ApiPropertyOptional({ example: 'پرشین' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  breed?: string;

  @ApiPropertyOptional({ enum: PetGender, default: PetGender.UNKNOWN })
  @IsOptional()
  @IsEnum(PetGender)
  gender?: PetGender;

  @ApiPropertyOptional({ example: 14, description: 'سن به ماه' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(600)
  ageMonths?: number;

  @ApiPropertyOptional({ example: 4.2, description: 'وزن به کیلوگرم' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(500)
  weightKg?: number;

  @ApiPropertyOptional({ example: 'به غذای خشک آلرژی دارد' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdatePetDto extends CreatePetDto {}
