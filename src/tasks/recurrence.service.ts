import { BadRequestException, Injectable } from '@nestjs/common';
import { Priority, Recurrence, TaskStatus } from '@prisma/client';

export interface RecurringTaskInput {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: TaskStatus;
  categoryId: string | null;
  userId: string;
  dueDate: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  isRecurring: boolean;
  recurrence: Recurrence;
  recurrenceDays: number[];
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskOccurrence extends RecurringTaskInput {
  occurrenceDate: Date;
  occurrenceId: string;
}

export interface ProjectionWindow {
  from: Date;
  to: Date;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class RecurrenceService {
  /**
   * Estrategia (spec §31): recurrencia por metadatos. No se generan filas
   * hijas para cada ocurrencia. Las tareas con recurrence != NONE se
   * proyectan como ocurrencias virtuales dentro de una ventana.
   *
   * Para Fase 6: DAILY y WEEKLY (este ultimo filtrado por recurrenceDays).
   * Otras cadencias (cada mes, etc.) se pueden agregar sumando casos.
   */
  expand(
    tasks: RecurringTaskInput[],
    window: ProjectionWindow,
  ): TaskOccurrence[] {
    const result: TaskOccurrence[] = [];
    const fromMs = window.from.getTime();
    const toMs = window.to.getTime();

    for (const task of tasks) {
      if (task.recurrence === Recurrence.NONE) {
        result.push({ ...task, occurrenceDate: task.dueDate ?? task.createdAt, occurrenceId: task.id });
        continue;
      }
      this.assertRecurrenceShape(task);
      const base = this.resolveBaseDate(task);
      const occurrences = this.expandOne(task, base, fromMs, toMs);
      result.push(...occurrences);
    }

    return result;
  }

  defaultWindow(daysBack = 7, daysAhead = 7): ProjectionWindow {
    const now = new Date();
    const from = new Date(now.getTime() - daysBack * MS_PER_DAY);
    const to = new Date(now.getTime() + daysAhead * MS_PER_DAY);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  private expandOne(
    task: RecurringTaskInput,
    base: Date,
    fromMs: number,
    toMs: number,
  ): TaskOccurrence[] {
    const out: TaskOccurrence[] = [];
    if (task.recurrence === Recurrence.DAILY) {
      const startMs = Math.max(fromMs, this.startOfDay(base).getTime());
      const endMs = toMs;
      for (let ms = startMs; ms <= endMs; ms += MS_PER_DAY) {
        const occurrenceDate = this.composeDate(base, ms);
        out.push({ ...task, occurrenceDate, occurrenceId: this.occurrenceId(task.id, occurrenceDate) });
      }
      return out;
    }
    if (task.recurrence === Recurrence.WEEKLY) {
      const weekMs = 7 * MS_PER_DAY;
      const baseDay = base.getDay();
      const firstSundayMs = this.startOfDay(base).getTime() - baseDay * MS_PER_DAY;
      const days = (task.recurrenceDays ?? []).slice().sort((a, b) => a - b);
      if (days.length === 0) {
        return out;
      }
      let weekStart = firstSundayMs;
      while (weekStart <= toMs) {
        for (const day of days) {
          const occMs = weekStart + day * MS_PER_DAY;
          if (occMs >= fromMs && occMs <= toMs) {
            const occurrenceDate = this.composeDate(base, occMs);
            out.push({ ...task, occurrenceDate, occurrenceId: this.occurrenceId(task.id, occurrenceDate) });
          }
        }
        weekStart += weekMs;
      }
      return out;
    }
    return out;
  }

  private assertRecurrenceShape(task: RecurringTaskInput): void {
    if (task.recurrence === Recurrence.WEEKLY) {
      if (!Array.isArray(task.recurrenceDays) || task.recurrenceDays.length === 0) {
        throw new BadRequestException(
          `Task ${task.id}: recurrenceDays es obligatorio cuando recurrence=WEEKLY`,
        );
      }
      for (const day of task.recurrenceDays) {
        if (!Number.isInteger(day) || day < 0 || day > 6) {
          throw new BadRequestException(
            `Task ${task.id}: recurrenceDays debe contener enteros 0..6`,
          );
        }
      }
    }
  }

  private resolveBaseDate(task: RecurringTaskInput): Date {
    if (task.dueDate) return task.dueDate;
    if (task.startTime) return task.startTime;
    return task.createdAt;
  }

  private startOfDay(d: Date): Date {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  }

  private composeDate(base: Date, targetMs: number): Date {
    const composed = new Date(base);
    composed.setTime(targetMs);
    return composed;
  }

  private occurrenceId(taskId: string, date: Date): string {
    return `${taskId}#${date.toISOString()}`;
  }
}


