import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser, PublicUser } from '../auth/auth.types';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiOkResponse({ description: 'Perfil publico del usuario.' })
  me(@CurrentUser() user: AuthenticatedUser): Promise<PublicUser> {
    return this.usersService.findById(user.id);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Actualizar nombre y/o avatar del usuario autenticado',
    description: 'Solo se aceptan name y avatar; cualquier otro campo es rechazado (400).',
  })
  @ApiOkResponse({ description: 'Perfil actualizado.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateUserDto,
  ): Promise<PublicUser> {
    return this.usersService.update(user.id, dto);
  }
}
