import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Healthcheck' })
  @ApiOkResponse({
    description: 'Estado del servicio.',
    schema: {
      example: { status: 'ok', service: 'planify-backend' },
    },
  })
  check(): { status: string; service: string } {
    return { status: 'ok', service: 'planify-backend' };
  }
}
