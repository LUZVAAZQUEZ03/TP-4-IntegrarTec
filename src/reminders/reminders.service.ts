import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReminderType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import type { ReminderView } from './reminders.types';

@Injectable()
export class RemindersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateReminderDto): Promise<ReminderView> {
    await this.assertOwnTask(userId, dto.taskId);

    const reminder = await this.prisma.reminder.create({
      data: {
        taskId: dto.taskId,
        userId,
        remindAt: new Date(dto.remindAt),
        type: dto.type ?? ReminderType.AT_TIME,
      },
    });
    return this.toView(reminder);
  }

  async findAll(userId: string, onlyPending: boolean): Promise<ReminderView[]> {
    const reminders = await this.prisma.reminder.findMany({
      where: {
        userId,
        ...(onlyPending ? { isSent: false } : {}),
      },
      orderBy: { remindAt: 'asc' },
    });
    return reminders.map((r) => this.toView(r));
  }

  async findOne(userId: string, id: string): Promise<ReminderView> {
    const reminder = await this.prisma.reminder.findFirst({
      where: { id, userId },
    });
    if (!reminder) {
      throw new NotFoundException('Recordatorio inexistente');
    }
    return this.toView(reminder);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateReminderDto,
  ): Promise<ReminderView> {
    const existing = await this.prisma.reminder.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException('Recordatorio inexistente');
    }

    if (dto.taskId !== undefined && dto.taskId !== existing.taskId) {
      await this.assertOwnTask(userId, dto.taskId);
    }

    const updated = await this.prisma.reminder.update({
      where: { id: existing.id },
      data: {
        taskId: dto.taskId,
        remindAt: dto.remindAt ? new Date(dto.remindAt) : undefined,
        type: dto.type,
      },
    });
    return this.toView(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.reminder.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException('Recordatorio inexistente');
    }
    await this.prisma.reminder.delete({ where: { id: existing.id } });
  }

  private async assertOwnTask(userId: string, taskId: string): Promise<void> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId },
    });
    if (!task) {
      throw new ForbiddenException(
        'La tarea no pertenece al usuario autenticado',
      );
    }
  }

  private toView(reminder: {
    id: string;
    taskId: string;
    userId: string;
    remindAt: Date;
    type: ReminderType;
    isSent: boolean;
    sentAt: Date | null;
    createdAt: Date;
  }): ReminderView {
    return {
      id: reminder.id,
      taskId: reminder.taskId,
      userId: reminder.userId,
      remindAt: reminder.remindAt,
      type: reminder.type,
      isSent: reminder.isSent,
      sentAt: reminder.sentAt,
      createdAt: reminder.createdAt,
    };
  }
}
