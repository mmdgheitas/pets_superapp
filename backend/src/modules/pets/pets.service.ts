import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePetDto, UpdatePetDto } from './dto/create-pet.dto';

@Injectable()
export class PetsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.pet.findMany({ where: { ownerId: userId }, orderBy: { createdAt: 'desc' } });
  }

  create(userId: string, dto: CreatePetDto) {
    return this.prisma.pet.create({ data: { ...dto, ownerId: userId } });
  }

  async update(userId: string, id: string, dto: UpdatePetDto) {
    await this.assertOwner(userId, id);
    return this.prisma.pet.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.prisma.pet.delete({ where: { id } });
    return { message: 'پت حذف شد' };
  }

  private async assertOwner(userId: string, id: string) {
    const pet = await this.prisma.pet.findUnique({ where: { id } });
    if (!pet || pet.ownerId !== userId) {
      throw new NotFoundException('پت یافت نشد');
    }
  }
}
