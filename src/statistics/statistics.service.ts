import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PRIORITY_ORDER,
  type DistributionBucket,
  type MonthlyBucket,
  type MonthlyResponse,
  type SummaryResponse,
  type WeeklyResponse,
} from './statistics.types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: string): Promise<SummaryResponse> {
    const now = new Date();

    const [total, completed, byPriorityRaw, byCategoryRaw, overdue] = await Promise.all([
      this.prisma.task.count({ where: { userId } }),
      this.prisma.task.count({
        where: { userId, status: 'COMPLETED' },
      }),
      this.prisma.task.groupBy({
        by: ['priority'],
        where: { userId },
        _count: { _all: true },
      }),
      this.prisma.task.groupBy({
        by: ['categoryId'],
        where: { userId },
        _count: { _all: true },
      }),
      this.prisma.task.count({
        where: {
          userId,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          dueDate: { lt: now },
        },
      }),
    ]);

    const pending = Math.max(0, total - completed - await this.cancelledCount(userId));

    const completionRate = total === 0 ? 0 : completed / total;

    const byPriority = this.priorityBuckets(byPriorityRaw);
    const byCategory = await this.categoryBuckets(userId, byCategoryRaw);

    return {
      total,
      completed,
      pending,
      overdue,
      completionRate: Number(completionRate.toFixed(4)),
      byCategory,
      byPriority,
    };
  }

  async weekly(userId: string, reference: Date = new Date()): Promise<WeeklyResponse> {
    const weekEnd = this.endOfDay(reference);
    const weekStart = this.startOfDay(new Date(weekEnd.getTime() - 6 * MS_PER_DAY));

    const tasks = await this.prisma.task.findMany({
      where: {
        userId,
        OR: [
          { dueDate: { gte: weekStart, lte: weekEnd } },
          { completedAt: { gte: weekStart, lte: weekEnd } },
        ],
      },
      select: {
        priority: true,
        status: true,
        dueDate: true,
        completedAt: true,
      },
    });

    const dayMap = new Map<string, { total: number; completed: number }>();
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart.getTime() + i * MS_PER_DAY);
      const key = this.dayKey(day);
      dayMap.set(key, { total: 0, completed: 0 });
    }

    const priorityMap = new Map<string, number>();
    for (const p of PRIORITY_ORDER) priorityMap.set(p, 0);

    let total = 0;
    let completed = 0;
    for (const task of tasks) {
      if (task.dueDate) {
        const key = this.dayKey(task.dueDate);
        const bucket = dayMap.get(key);
        if (bucket) {
          bucket.total += 1;
          total += 1;
        }
      }
      if (task.completedAt) {
        const key = this.dayKey(task.completedAt);
        const bucket = dayMap.get(key);
        if (bucket) {
          bucket.completed += 1;
          completed += 1;
        }
      }
      priorityMap.set(task.priority, (priorityMap.get(task.priority) ?? 0) + 1);
    }

    const byDay = Array.from(dayMap.entries()).map(([date, v]) => ({
      date,
      total: v.total,
      completed: v.completed,
    }));

    const byPriority: DistributionBucket[] = PRIORITY_ORDER.map((p) => ({
      key: p,
      total: priorityMap.get(p) ?? 0,
    }));

    return {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      total,
      completed,
      byDay,
      byPriority,
    };
  }

  async monthly(userId: string, reference: Date = new Date()): Promise<MonthlyResponse> {
    const monthEnd = this.endOfDay(reference);
    const monthStart = this.startOfDay(new Date(monthEnd.getFullYear(), monthEnd.getMonth(), 1));

    const tasks = await this.prisma.task.findMany({
      where: {
        userId,
        OR: [
          { dueDate: { gte: monthStart, lte: monthEnd } },
          { completedAt: { gte: monthStart, lte: monthEnd } },
        ],
      },
      select: { dueDate: true, completedAt: true },
    });

    const weekBuckets: MonthlyBucket[] = [];
    let cursor = this.startOfWeek(monthStart);
    let safety = 0;
    while (cursor.getTime() <= monthEnd.getTime() && safety < 6) {
      const weekEndBucket = new Date(Math.min(
        cursor.getTime() + 6 * MS_PER_DAY,
        monthEnd.getTime(),
      ));
      const weekStart = cursor;
      const weekEndDay = this.endOfDay(weekEndBucket);
      weekBuckets.push({
        weekStart: weekStart.toISOString(),
        weekEnd: weekEndDay.toISOString(),
        total: 0,
        completed: 0,
      });
      cursor = new Date(cursor.getTime() + MS_PER_WEEK);
      safety += 1;
    }

    let total = 0;
    let completed = 0;
    for (const task of tasks) {
      if (task.dueDate) {
        const bucket = this.findBucket(weekBuckets, task.dueDate);
        if (bucket) {
          bucket.total += 1;
          total += 1;
        }
      }
      if (task.completedAt) {
        const bucket = this.findBucket(weekBuckets, task.completedAt);
        if (bucket) {
          bucket.completed += 1;
          completed += 1;
        }
      }
    }

    return {
      monthStart: monthStart.toISOString(),
      monthEnd: monthEnd.toISOString(),
      total,
      completed,
      byWeek: weekBuckets,
    };
  }

  private async cancelledCount(userId: string): Promise<number> {
    return this.prisma.task.count({
      where: { userId, status: 'CANCELLED' },
    });
  }

  private priorityBuckets(
    raw: { priority: string; _count: { _all: number } }[],
  ): DistributionBucket[] {
    const map = new Map<string, number>();
    for (const p of PRIORITY_ORDER) map.set(p, 0);
    for (const row of raw) {
      map.set(row.priority, (map.get(row.priority) ?? 0) + row._count._all);
    }
    return PRIORITY_ORDER.map((p) => ({ key: p, total: map.get(p) ?? 0 }));
  }

  private async categoryBuckets(
    userId: string,
    raw: { categoryId: string | null; _count: { _all: number } }[],
  ): Promise<DistributionBucket[]> {
    const map = new Map<string, number>();
    let uncategorized = 0;
    const ids: string[] = [];
    for (const row of raw) {
      if (row.categoryId === null) {
        uncategorized = row._count._all;
      } else {
        ids.push(row.categoryId);
        map.set(row.categoryId, row._count._all);
      }
    }
    const categories = ids.length
      ? await this.prisma.category.findMany({
          where: { id: { in: ids }, userId },
          select: { id: true, name: true },
        })
      : [];
    const result: DistributionBucket[] = categories.map((c) => ({
      key: c.name,
      total: map.get(c.id) ?? 0,
    }));
    if (uncategorized > 0) {
      result.push({ key: 'Sin categoria', total: uncategorized });
    }
    return result.sort((a, b) => b.total - a.total);
  }

  private startOfDay(d: Date): Date {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  }

  private endOfDay(d: Date): Date {
    const c = new Date(d);
    c.setHours(23, 59, 59, 999);
    return c;
  }

  private startOfWeek(d: Date): Date {
    const day = d.getDay();
    const sunday = new Date(d);
    sunday.setHours(0, 0, 0, 0);
    sunday.setDate(sunday.getDate() - day);
    return sunday;
  }

  private dayKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private findBucket(
    buckets: MonthlyBucket[],
    date: Date,
  ): MonthlyBucket | undefined {
    const t = date.getTime();
    return buckets.find((b) => {
      const start = new Date(b.weekStart).getTime();
      const end = new Date(b.weekEnd).getTime();
      return t >= start && t <= end;
    });
  }
}
