import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import type { CategoryView } from './categories.types';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCategoryDto): Promise<CategoryView> {
    try {
      const category = await this.prisma.category.create({
        data: {
          name: dto.name,
          color: dto.color,
          userId,
        },
      });
      return this.toView(category);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe una categoria con ese nombre');
      }
      throw error;
    }
  }

  async findAll(userId: string): Promise<CategoryView[]> {
    const categories = await this.prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
    return categories.map((c) => this.toView(c));
  }

  async findOne(userId: string, id: string): Promise<CategoryView> {
    const category = await this.prisma.category.findFirst({
      where: { id, userId },
    });
    if (!category) {
      throw new NotFoundException('Categoria inexistente');
    }
    return this.toView(category);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryView> {
    try {
      const category = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.category.findFirst({
          where: { id, userId },
        });
        if (!existing) {
          throw new NotFoundException('Categoria inexistente');
        }
        return tx.category.update({
          where: { id: existing.id },
          data: dto,
        });
      });
      return this.toView(category);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe una categoria con ese nombre');
      }
      throw error;
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.category.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException('Categoria inexistente');
    }
    await this.prisma.category.delete({ where: { id: existing.id } });
  }

  private toView(category: {
    id: string;
    name: string;
    color: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): CategoryView {
    return {
      id: category.id,
      name: category.name,
      color: category.color,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
