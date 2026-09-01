import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import type { AuthResult, AuthenticatedUser, PublicUser, TokenPair } from './auth.types';

const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle(AUTH_THROTTLE)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar un usuario',
    description: 'Crea un usuario. La contrasena se hashea con bcrypt (12 rounds).',
  })
  @ApiCreatedResponse({ description: 'Usuario creado. Devuelve perfil + tokens.' })
  @ApiConflictResponse({ description: 'El email ya esta registrado.' })
  register(@Body() dto: CreateUserDto): Promise<AuthResult> {
    return this.authService.register(dto);
  }

  @Throttle(AUTH_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesion' })
  @ApiOkResponse({ description: 'Credenciales validas. Devuelve perfil + tokens.' })
  @ApiUnauthorizedResponse({ description: 'Credenciales invalidas.' })
  login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.authService.login(dto);
  }

  @Throttle(AUTH_THROTTLE)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotar refresh token',
    description: 'Invalida el refresh token recibido y emite uno nuevo.',
  })
  @ApiOkResponse({ description: 'Nuevo par de tokens.' })
  @ApiUnauthorizedResponse({ description: 'Refresh token invalido o expirado.' })
  refresh(@Body() dto: RefreshTokenDto): Promise<TokenPair> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cerrar sesion', description: 'Invalida el refresh token en DB.' })
  async logout(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.authService.logout(user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Perfil del usuario autenticado (alias bajo /auth)' })
  @ApiOkResponse({ description: 'Perfil publico del usuario.' })
  me(@CurrentUser() user: AuthenticatedUser): Promise<PublicUser> {
    return this.authService.getProfile(user.id);
  }
}
