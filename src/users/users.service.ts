import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import type { PublicUser } from '../auth/auth.types';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario inexistente');
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role as 'USER' | 'ADMIN',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async update(userId: string, dto: UpdateUserDto): Promise<PublicUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role as 'USER' | 'ADMIN',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
