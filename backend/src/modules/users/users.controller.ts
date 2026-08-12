import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UploadService } from '../upload/upload.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/create-address.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly upload: UploadService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'دریافت پروفایل من (به‌همراه پت‌ها و آدرس‌ها)' })
  getMe(@CurrentUser('id') userId: string) {
    return this.users.getProfile(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'ویرایش نام و ایمیل' })
  updateMe(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(userId, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'تغییر عکس پروفایل' })
  async setAvatar(@CurrentUser('id') userId: string, @UploadedFile() file: Express.Multer.File) {
    const { url } = await this.upload.uploadImage(userId, file);
    return this.users.setAvatar(userId, url);
  }

  // -------------------------------------------------------------- addresses

  @Get('me/addresses')
  @ApiOperation({ summary: 'لیست آدرس‌های من' })
  listAddresses(@CurrentUser('id') userId: string) {
    return this.users.listAddresses(userId);
  }

  @Post('me/addresses')
  @ApiOperation({ summary: 'افزودن آدرس جدید' })
  createAddress(@CurrentUser('id') userId: string, @Body() dto: CreateAddressDto) {
    return this.users.createAddress(userId, dto);
  }

  @Patch('me/addresses/:id')
  updateAddress(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.users.updateAddress(userId, id, dto);
  }

  @Delete('me/addresses/:id')
  deleteAddress(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.users.deleteAddress(userId, id);
  }

  @Post('me/addresses/:id/default')
  setDefaultAddress(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.users.setDefaultAddress(userId, id);
  }
}
