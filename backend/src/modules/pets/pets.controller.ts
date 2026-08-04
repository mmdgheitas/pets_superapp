import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePetDto, UpdatePetDto } from './dto/create-pet.dto';
import { PetsService } from './pets.service';

@ApiTags('pets')
@ApiBearerAuth('access-token')
@Controller({ path: 'pets', version: '1' })
export class PetsController {
  constructor(private readonly pets: PetsService) {}

  @Get()
  @ApiOperation({ summary: 'لیست پت‌های من' })
  list(@CurrentUser('id') userId: string) {
    return this.pets.list(userId);
  }

  @Post()
  @ApiOperation({ summary: 'افزودن پت به پروفایل' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreatePetDto) {
    return this.pets.create(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePetDto,
  ) {
    return this.pets.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.pets.remove(userId, id);
  }
}
