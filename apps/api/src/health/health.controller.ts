import { Controller, Get, Res, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { HealthResponse } from '@ventro/types';
import { HealthResponseDto } from './health.dto';
import { HealthService } from './health.service';

@ApiTags('Operations')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly health: HealthService) {}
  @Get()
  @ApiOperation({ summary: 'Readiness: real PostgreSQL query and Redis PING' })
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiResponse({
    status: 503,
    description: 'One or more dependencies are unavailable',
    type: HealthResponseDto,
  })
  async check(@Res({ passthrough: true }) response: Response): Promise<HealthResponse> {
    const result = await this.health.check();
    response.setHeader('Cache-Control', 'no-store');
    response.status(result.status === 'ok' ? 200 : 503);
    return result;
  }
  @Get('live')
  @ApiOperation({ summary: 'Liveness: the API process can serve HTTP' })
  live(@Res({ passthrough: true }) response: Response): { status: 'ok'; service: string } {
    response.setHeader('Cache-Control', 'no-store');
    return { status: 'ok', service: 'ventro-api' };
  }
}
