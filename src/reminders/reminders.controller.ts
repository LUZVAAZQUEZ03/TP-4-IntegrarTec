import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RemindersService } from './reminders.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import type { ReminderView } from './reminders.types';
import { ListRemindersQueryDto } from './dto/list-reminders-query.dto';

@ApiTags('reminders')
@ApiBearerAuth('access-token')
@Controller('reminders')
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear recordatorio' })
  @ApiCreatedResponse({ description: 'Recordatorio creado.' })
  @ApiForbiddenResponse({
    description: 'La tarea asociada no pertenece al usuario.',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReminderDto,
  ): Promise<ReminderView> {
    return this.remindersService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar recordatorios',
    description: 'Pendientes=true devuelve solo no enviados.',
  })
  @ApiOkResponse({ description: 'Listado de recordatorios.' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListRemindersQueryDto,
  ): Promise<ReminderView[]> {
    return this.remindersService.findAll(user.id, query.pending ?? false);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un recordatorio' })
  @ApiOkResponse({ description: 'Recordatorio encontrado.' })
  @ApiNotFoundResponse({ description: 'Recordatorio inexistente.' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ReminderView> {
    return this.remindersService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar recordatorio' })
  @ApiOkResponse({ description: 'Recordatorio actualizado.' })
  @ApiNotFoundResponse({ description: 'Recordatorio inexistente.' })
  @ApiForbiddenResponse({
    description: 'La tarea destino no pertenece al usuario.',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateReminderDto,
  ): Promise<ReminderView> {
    return this.remindersService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar recordatorio' })
  @ApiNoContentResponse({ description: 'Recordatorio eliminado.' })
  @ApiNotFoundResponse({ description: 'Recordatorio inexistente.' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.remindersService.remove(user.id, id);
  }
}
