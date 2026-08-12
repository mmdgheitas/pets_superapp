import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { pets: true, addresses: { orderBy: { isDefault: 'desc' } } },
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    const { id, phone, email, fullName, avatarUrl, role, createdAt, pets, addresses } = user;
    return { id, phone, email, fullName, avatarUrl, role, createdAt, pets, addresses };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing && existing.id !== userId) {
        throw new ConflictException('این ایمیل قبلاً توسط حساب دیگری استفاده شده است');
      }
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { fullName: dto.fullName, email: dto.email },
      select: {
        id: true,
        phone: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
      },
    });
  }

  async setAvatar(userId: string, avatarUrl: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
    return { avatarUrl };
  }

  // -------------------------------------------------------------- addresses

  async listAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      }
      const isFirst = (await tx.address.count({ where: { userId } })) === 0;
      return tx.address.create({
        data: { ...dto, userId, isDefault: dto.isDefault ?? isFirst },
      });
    });
  }

  async updateAddress(userId: string, id: string, dto: CreateAddressDto) {
    await this.assertAddressOwner(userId, id);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      }
      return tx.address.update({ where: { id }, data: dto });
    });
  }

  async deleteAddress(userId: string, id: string) {
    await this.assertAddressOwner(userId, id);
    await this.prisma.address.delete({ where: { id } });
    return { message: 'آدرس حذف شد' };
  }

  async setDefaultAddress(userId: string, id: string) {
    await this.assertAddressOwner(userId, id);
    await this.prisma.$transaction([
      this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }),
      this.prisma.address.update({ where: { id }, data: { isDefault: true } }),
    ]);
    return { message: 'آدرس پیش‌فرض تغییر کرد' };
  }

  private async assertAddressOwner(userId: string, id: string) {
    const address = await this.prisma.address.findUnique({ where: { id } });
    if (!address || address.userId !== userId) {
      throw new NotFoundException('آدرس یافت نشد');
    }
  }
}
