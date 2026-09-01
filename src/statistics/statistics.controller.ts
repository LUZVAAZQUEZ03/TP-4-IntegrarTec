import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { StatisticsService } from './statistics.service';
import type {
  MonthlyResponse,
  SummaryResponse,
  WeeklyResponse,
} from './statistics.types';

@ApiTags('statistics')
@ApiBearerAuth('access-token')
@Controller('statistics')
@UseGuards(JwtAuthGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Resumen general de productividad',
    description:
      'Totales, completionRate, distribuciones por categoria y prioridad. Scope: usuario autenticado.',
  })
  @ApiOkResponse({ description: 'Resumen.' })
  summary(@CurrentUser() user: AuthenticatedUser): Promise<SummaryResponse> {
    return this.statisticsService.summary(user.id);
  }

  @Get('weekly')
  @ApiOperation({
    summary: 'Productividad de los ultimos 7 dias',
    description: 'Incluye buckets por dia y distribucion por prioridad.',
  })
  @ApiOkResponse({ description: 'Estadistica semanal.' })
  weekly(@CurrentUser() user: AuthenticatedUser): Promise<WeeklyResponse> {
    return this.statisticsService.weekly(user.id);
  }

  @Get('monthly')
  @ApiOperation({
    summary: 'Productividad del mes en curso',
    description: 'Buckets semanales (alineados a domingo) con totales.',
  })
  @ApiOkResponse({ description: 'Estadistica mensual.' })
  monthly(@CurrentUser() user: AuthenticatedUser): Promise<MonthlyResponse> {
    return this.statisticsService.monthly(user.id);
  }
}
