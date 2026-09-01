import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ReminderType } from '@prisma/client';

export class CreateReminderDto {
  @IsUUID()
  taskId!: string;

  @IsDateString()
  remindAt!: string;

  @IsOptional()
  @IsEnum(ReminderType)
  type?: ReminderType;
}
