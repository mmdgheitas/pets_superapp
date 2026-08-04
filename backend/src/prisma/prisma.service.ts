import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [{ emit: 'event', level: 'error' }],
    });
    // Prisma connects lazily on the first query — no eager $connect() here.
    // Database outages surface as request-level 500s handled by the exception filter,
    // and the health endpoint reports Redis/DB availability explicitly.
  }

  async onModuleDestroy() {
    await this.$disconnect().catch(() => undefined);
  }
}
