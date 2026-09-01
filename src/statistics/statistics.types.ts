import type { Priority, TaskStatus } from '@prisma/client';

export interface DistributionBucket {
  key: string;
  total: number;
}

export interface SummaryResponse {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  completionRate: number;
  byCategory: DistributionBucket[];
  byPriority: DistributionBucket[];
}

export interface DailyBucket {
  date: string;
  total: number;
  completed: number;
}

export interface WeeklyResponse {
  weekStart: string;
  weekEnd: string;
  total: number;
  completed: number;
  byDay: DailyBucket[];
  byPriority: DistributionBucket[];
}

export interface MonthlyBucket {
  weekStart: string;
  weekEnd: string;
  total: number;
  completed: number;
}

export interface MonthlyResponse {
  monthStart: string;
  monthEnd: string;
  total: number;
  completed: number;
  byWeek: MonthlyBucket[];
}

export const PRIORITY_ORDER: Priority[] = ['LOW', 'MEDIUM', 'HIGH'];

export const STATUS_BUCKETS: { status: TaskStatus; label: string }[] = [
  { status: 'PENDING', label: 'PENDING' },
  { status: 'IN_PROGRESS', label: 'IN_PROGRESS' },
  { status: 'COMPLETED', label: 'COMPLETED' },
  { status: 'OVERDUE', label: 'OVERDUE' },
  { status: 'CANCELLED', label: 'CANCELLED' },
];
