import {
  Controller,
  Get,
  Param,
  Version,
} from '@nestjs/common';
import { DriverService } from '../../services/driver.service';
import { DriverResponseDto } from '../../dtos/driver-response.dto';

@Controller('app/drivers')
export class AppDriverController {
  constructor(private readonly driverService: DriverService) {}

  @Get()
  @Version('1')
  async getAllDrivers(): Promise<DriverResponseDto[]> {
    return this.driverService.findAll();
  }

  @Get(':id')
  @Version('1')
  async getDriver(@Param('id') id: string): Promise<DriverResponseDto> {
    return this.driverService.findOne(id);
  }
}
