import { Controller, Get, Version } from '@nestjs/common';
import { AppService } from '../../services/app.service';

@Controller('health')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Version('1')
  getHealth(): { status: string; message: string } {
    return {
      status: 'ok',
      message: this.appService.getHealthCheckMessage(),
    };
  }
}
