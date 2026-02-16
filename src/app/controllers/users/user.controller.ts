import { Controller, Get, Version } from '@nestjs/common';
import { AppService } from '../../services/app.service';
import { Public } from '../../decorators/public.decorator';

@Controller('health')
export class UserController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @Version('1')
  getHealth(): { status: string; message: string } {
    return {
      status: 'ok',
      message: this.appService.getHealthCheckMessage(),
    };
  }
}
