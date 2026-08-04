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
import { CartService } from './cart.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart-item.dto';

@ApiTags('cart')
@ApiBearerAuth('access-token')
@Controller({ path: 'cart', version: '1' })
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  @ApiOperation({ summary: 'مشاهده سبد خرید' })
  get(@CurrentUser('id') userId: string) {
    return this.cart.getCart(userId);
  }

  @Post('items')
  @ApiOperation({ summary: 'افزودن کالا به سبد' })
  addItem(@CurrentUser('id') userId: string, @Body() dto: AddCartItemDto) {
    return this.cart.addItem(userId, dto.productId, dto.quantity);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'تغییر تعداد یک آیتم سبد' })
  updateItem(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cart.updateItem(userId, id, dto.quantity);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'حذف آیتم از سبد' })
  removeItem(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.cart.removeItem(userId, id);
  }

  @Delete()
  @ApiOperation({ summary: 'خالی کردن سبد' })
  clear(@CurrentUser('id') userId: string) {
    return this.cart.clear(userId);
  }
}
