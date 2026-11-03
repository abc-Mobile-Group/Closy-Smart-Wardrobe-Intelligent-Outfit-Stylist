import { Controller, Get, Redirect } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller()
export class HealthController {
  @Get() @Redirect('/docs') root() {}
  @Get('health') health() { return { status: 'ok' }; }
}
