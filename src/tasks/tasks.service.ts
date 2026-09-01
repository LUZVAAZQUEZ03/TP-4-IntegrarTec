import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Priority, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from '../categories/categories.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FindTasksQueryDto } from './dto/find-tasks-query.dto';
import type { TaskView } from './tasks.types';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async create(userId: string, dto: CreateTaskDto): Promise<TaskView> {
    if (dto.categoryId) {
      await this.assertOwnCategory(userId, dto.categoryId);
    }
    this.assertDateOrder(dto.startTime, dto.endTime);

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        startTime: dto.startTime ? new Date(dto.startTime) : null,
        endTime: dto.endTime ? new Date(dto.endTime) : null,
        priority: dto.priority,
        status: dto.status,
        categoryId: dto.categoryId ?? null,
        userId,
        isRecurring: dto.isRecurring ?? false,
      },
    });
    return this.toView(task);
  }

  async findAll(userId: string, query: FindTasksQueryDto): Promise<TaskView[]> {
    const where: Prisma.TaskWhereInput = { userId };

    if (query.priority) where.priority = query.priority;
    if (query.status) where.status = query.status;
    if (query.categoryId) where.categoryId = query.categoryId;

    if (query.dueDate) {
      const day = new Date(query.dueDate);
      where.dueDate = day;
    } else if (query.fromDate || query.toDate) {
      where.dueDate = {};
      if (query.fromDate) where.dueDate.gte = new Date(query.fromDate);
      if (query.toDate) where.dueDate.lte = new Date(query.toDate);
    }

    if (query.completed === true) {
      where.status = TaskStatus.COMPLETED;
    } else if (query.completed === false) {
      where.status = { not: TaskStatus.COMPLETED };
    }

    const tasks = await this.prisma.task.findMany({
      where,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
    return tasks.map((t) => this.toView(t));
  }

  async findOne(userId: string, id: string): Promise<TaskView> {
    const task = await this.prisma.task.findFirst({ where: { id, userId } });
    if (!task) {
      throw new NotFoundException('Tarea inexistente');
    }
    return this.toView(task);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateTaskDto,
  ): Promise<TaskView> {
    const existing = await this.prisma.task.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new NotFoundException('Tarea inexistente');
    }

    if (dto.categoryId !== undefined && dto.categoryId !== null) {
      await this.assertOwnCategory(userId, dto.categoryId);
    }
    if (dto.startTime !== undefined || dto.endTime !== undefined) {
      const startTime = dto.startTime ?? existing.startTime?.toISOString();
      const endTime = dto.endTime ?? existing.endTime?.toISOString();
      this.assertDateOrder(
        startTime ? startTime.toString() : undefined,
        endTime ? endTime.toString() : undefined,
      );
    }

    const updated = await this.prisma.task.update({
      where: { id: existing.id },
      data: {
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : undefined,
        startTime: dto.startTime !== undefined ? (dto.startTime ? new Date(dto.startTime) : null) : undefined,
        endTime: dto.endTime !== undefined ? (dto.endTime ? new Date(dto.endTime) : null) : undefined,
        priority: dto.priority,
        status: dto.status,
        categoryId: dto.categoryId === null ? null : dto.categoryId,
        isRecurring: dto.isRecurring,
      },
    });
    return this.toView(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.task.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new NotFoundException('Tarea inexistente');
    }
    await this.prisma.task.delete({ where: { id: existing.id } });
  }

  async complete(userId: string, id: string): Promise<TaskView> {
    const existing = await this.prisma.task.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new NotFoundException('Tarea inexistente');
    }
    if (existing.status === TaskStatus.COMPLETED) {
      throw new ForbiddenException('La tarea ya estaba completada');
    }
    const updated = await this.prisma.task.update({
      where: { id: existing.id },
      data: {
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
    return this.toView(updated);
  }

  private async assertOwnCategory(userId: string, categoryId: string): Promise<void> {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, userId },
    });
    if (!category) {
      throw new ForbiddenException('La categoria no pertenece al usuario autenticado');
    }
  }

  private assertDateOrder(
    startTime?: string,
    endTime?: string,
  ): void {
    if (startTime && endTime) {
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      if (Number.isNaN(start) || Number.isNaN(end)) {
        throw new BadRequestException('Fechas invalidas');
      }
      if (end < start) {
        throw new BadRequestException('endTime debe ser mayor o igual a startTime');
      }
    }
  }

  private toView(task: {
    id: string;
    title: string;
    description: string | null;
    dueDate: Date | null;
    startTime: Date | null;
    endTime: Date | null;
    priority: Priority;
    status: TaskStatus;
    categoryId: string | null;
    userId: string;
    isRecurring: boolean;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): TaskView {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      startTime: task.startTime,
      endTime: task.endTime,
      priority: task.priority,
      status: task.status,
      categoryId: task.categoryId,
      userId: task.userId,
      isRecurring: task.isRecurring,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
