import { Controller, Post, Body, Version } from '@nestjs/common';
import { DeviceService } from '../../services/device.service';
import { RegisterDeviceDto } from '../../dtos/register-device-dto';
import { Public } from '../../decorators/public.decorator';

@Controller('app/devices')
export class AppDeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Public()
  @Post('register')
  @Version('1')
  async registerDevice(@Body() body: RegisterDeviceDto) {
    const device = await this.deviceService.registerOrUpdateDevice(body);
    return {
      success: true,
      device,
    };
  }
}