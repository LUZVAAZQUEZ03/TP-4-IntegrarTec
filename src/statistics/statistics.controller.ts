import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { StatisticsService } from './statistics.service';
import type {
  MonthlyResponse,
  SummaryResponse,
  WeeklyResponse,
} from './statistics.types';

@Controller('statistics')
@UseGuards(JwtAuthGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser): Promise<SummaryResponse> {
    return this.statisticsService.summary(user.id);
  }

  @Get('weekly')
  weekly(@CurrentUser() user: AuthenticatedUser): Promise<WeeklyResponse> {
    return this.statisticsService.weekly(user.id);
  }

  @Get('monthly')
  monthly(@CurrentUser() user: AuthenticatedUser): Promise<MonthlyResponse> {
    return this.statisticsService.monthly(user.id);
  }
}
