import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'لیست محصولات با فیلتر، جستجو و صفحه‌بندی (عمومی، کش ۶۰ ثانیه‌ای)',
  })
  findAll(@Query() query: ProductQueryDto) {
    return this.products.findAll(query);
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'محصولات منتخب صفحه اصلی (عمومی)' })
  featured() {
    return this.products.featured();
  }

  @Get('mine')
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[فروشنده] محصولات من' })
  mine(@CurrentUser('id') userId: string) {
    return this.products.sellerProducts(userId);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'جزئیات محصول (عمومی)' })
  bySlug(@Param('slug') slug: string) {
    return this.products.findBySlug(slug);
  }

  @Post()
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[فروشنده] ایجاد محصول' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateProductDto) {
    return this.products.create(userId, dto);
  }

  @Patch(':id')
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[فروشنده] ویرایش محصول' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(userId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[فروشنده] حذف/غیرفعال‌سازی محصول' })
  remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.products.remove(userId, id);
  }
}
