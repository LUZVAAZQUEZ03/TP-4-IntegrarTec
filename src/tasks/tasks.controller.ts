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
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FindTasksQueryDto } from './dto/find-tasks-query.dto';
import type { TaskView } from './tasks.types';

@ApiTags('tasks')
@ApiBearerAuth('access-token')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear tarea' })
  @ApiCreatedResponse({ description: 'Tarea creada.' })
  @ApiForbiddenResponse({ description: 'La categoria no pertenece al usuario.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaskDto,
  ): Promise<TaskView> {
    return this.tasksService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar tareas con filtros y expansion de recurrencias',
    description:
      'Devuelve tareas del usuario. Las tareas con recurrence != NONE se proyectan como ocurrencias virtuales dentro de la ventana (default ±7 dias).',
  })
  @ApiOkResponse({ description: 'Listado de tareas/ocurrencias.' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FindTasksQueryDto,
  ): Promise<TaskView[]> {
    return this.tasksService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una tarea por id' })
  @ApiOkResponse({ description: 'Tarea encontrada.' })
  @ApiNotFoundResponse({ description: 'Tarea inexistente.' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<TaskView> {
    return this.tasksService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una tarea' })
  @ApiOkResponse({ description: 'Tarea actualizada.' })
  @ApiNotFoundResponse({ description: 'Tarea inexistente.' })
  @ApiForbiddenResponse({ description: 'La categoria no pertenece al usuario.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<TaskView> {
    return this.tasksService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una tarea' })
  @ApiNoContentResponse({ description: 'Tarea eliminada.' })
  @ApiNotFoundResponse({ description: 'Tarea inexistente.' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.tasksService.remove(user.id, id);
  }

  @Patch(':id/complete')
  @ApiOperation({
    summary: 'Marcar tarea como completada',
    description: 'Setea status=COMPLETED y completedAt=now().',
  })
  @ApiOkResponse({ description: 'Tarea completada.' })
  @ApiNotFoundResponse({ description: 'Tarea inexistente.' })
  @ApiForbiddenResponse({ description: 'La tarea ya estaba completada.' })
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<TaskView> {
    return this.tasksService.complete(user.id, id);
  }
}
