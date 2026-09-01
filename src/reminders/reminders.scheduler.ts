import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Scheduler de recordatorios (spec §30).
 *
 * Cada 5 minutos revisa los recordatorios cuya fecha remindAt ya paso y que
 * aun no fueron marcados como enviados. Los marca como enviados. La
 * notificacion real al usuario queda fuera de scope (Web Push / PWA son
 * opcionales segun el spec §30). El log sirve como punto de extension para
 * conectar envio real en el futuro.
 */
@Injectable()
export class RemindersScheduler {
  private readonly logger = new Logger(RemindersScheduler.name);
  private isRunning = false;

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'reminders-dispatch' })
  async dispatchDueReminders(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Skip tick: dispatch previo aun en curso');
      return;
    }
    this.isRunning = true;
    const startedAt = Date.now();
    try {
      const due = await this.prisma.reminder.findMany({
        where: { isSent: false, remindAt: { lte: new Date() } },
        select: { id: true, taskId: true, userId: true, type: true, remindAt: true },
      });

      if (due.length === 0) {
        this.logger.debug('Sin recordatorios pendientes');
        return;
      }

      const ids = due.map((r) => r.id);
      const result = await this.prisma.reminder.updateMany({
        where: { id: { in: ids } },
        data: { isSent: true, sentAt: new Date() },
      });

      this.logger.log(
        `Recordatorios procesados: ${result.count} (en ${Date.now() - startedAt}ms)`,
      );
    } catch (error) {
      this.logger.error(
        'Error procesando recordatorios',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.isRunning = false;
    }
  }
}
