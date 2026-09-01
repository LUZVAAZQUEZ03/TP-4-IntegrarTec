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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import type { CategoryView } from './categories.types';

@ApiTags('categories')
@ApiBearerAuth('access-token')
@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear categoria' })
  @ApiCreatedResponse({ description: 'Categoria creada.' })
  @ApiConflictResponse({ description: 'Ya existe una categoria con ese nombre.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryView> {
    return this.categoriesService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar categorias del usuario' })
  @ApiOkResponse({ description: 'Categorias del usuario autenticado.' })
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<CategoryView[]> {
    return this.categoriesService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una categoria' })
  @ApiOkResponse({ description: 'Categoria encontrada.' })
  @ApiNotFoundResponse({ description: 'Categoria inexistente.' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<CategoryView> {
    return this.categoriesService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar categoria' })
  @ApiOkResponse({ description: 'Categoria actualizada.' })
  @ApiNotFoundResponse({ description: 'Categoria inexistente.' })
  @ApiConflictResponse({ description: 'Ya existe una categoria con ese nombre.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryView> {
    return this.categoriesService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar categoria',
    description: 'Las tareas asociadas quedan con categoryId=null (SetNull).',
  })
  @ApiNoContentResponse({ description: 'Categoria eliminada.' })
  @ApiNotFoundResponse({ description: 'Categoria inexistente.' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.categoriesService.remove(user.id, id);
  }
}
