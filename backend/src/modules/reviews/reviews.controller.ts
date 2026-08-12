import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('reviews')
@Controller({ path: 'products/:productId/reviews', version: '1' })
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'دیدگاه‌های یک محصول (عمومی)' })
  list(@Param('productId', ParseUUIDPipe) productId: string, @Query() query: PaginationQueryDto) {
    return this.reviews.listForProduct(productId, query);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'ثبت یا ویرایش امتیاز/دیدگاه من برای محصول' })
  create(
    @CurrentUser('id') userId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviews.upsert(userId, productId, dto);
  }
}
