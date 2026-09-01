import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ReminderType } from '@prisma/client';

export class CreateReminderDto {
  @ApiProperty({ format: 'uuid', description: 'ID de la tarea asociada' })
  @IsUUID()
  taskId!: string;

  @ApiProperty({ example: '2026-09-15T18:00:00.000Z' })
  @IsDateString()
  remindAt!: string;

  @ApiPropertyOptional({ enum: ReminderType, default: ReminderType.AT_TIME })
  @IsOptional()
  @IsEnum(ReminderType)
  type?: ReminderType;
}
