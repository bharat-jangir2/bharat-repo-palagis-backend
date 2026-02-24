import { Controller, Get, Version } from '@nestjs/common';
import { AppService } from '../../services/app.service';
import { Public } from '../../decorators/public.decorator';
import { BypassDeviceHeaders } from '../../decorators/bypass-device-headers.decorator';

@Controller('health')
export class UserController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @BypassDeviceHeaders()
  @Get()
  @Version('1')
  getHealth(): { status: string; message: string } {
    return {
      status: 'ok',
      message: this.appService.getHealthCheckMessage(),
    };
  }
}
