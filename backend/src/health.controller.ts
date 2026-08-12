import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';
import { RedisService } from './redis/redis.service';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly redis: RedisService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  check() {
    return {
      status: 'ok',
      redis: this.redis.isAvailable() ? 'up' : 'down',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
