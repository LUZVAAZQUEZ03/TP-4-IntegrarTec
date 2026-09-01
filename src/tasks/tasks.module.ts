import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { RecurrenceService } from './recurrence.service';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [CategoriesModule],
  controllers: [TasksController],
  providers: [TasksService, RecurrenceService],
  exports: [TasksService],
})
export class TasksModule {}
