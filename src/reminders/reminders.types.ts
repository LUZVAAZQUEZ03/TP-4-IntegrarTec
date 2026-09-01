import type { ReminderType } from '@prisma/client';

export interface ReminderView {
  id: string;
  taskId: string;
  userId: string;
  remindAt: Date;
  type: ReminderType;
  isSent: boolean;
  sentAt: Date | null;
  createdAt: Date;
}
