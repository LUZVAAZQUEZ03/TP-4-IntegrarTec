import type { Priority, Recurrence, TaskStatus } from '@prisma/client';

export interface TaskView {
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
  recurrence: Recurrence;
  recurrenceDays: number[];
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
