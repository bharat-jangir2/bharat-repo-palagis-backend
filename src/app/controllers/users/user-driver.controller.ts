import {
  Controller,
  Get,
  Param,
  Query,
  Version,
  UseGuards,
} from '@nestjs/common';
import { DriverService } from '../../services/driver.service';
import { PaginationDto } from '../../dtos/pagination.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@Controller('users/drivers')
@UseGuards(JwtAuthGuard)
export class UserDriverController {
  constructor(private readonly driverService: DriverService) {}

  @Get()
  @Version('1')
  async getAllDrivers(
    @Query() paginationDto: PaginationDto,
  ) {
    const drivers = await this.driverService.findAll(paginationDto.page, paginationDto.limit);
    return {
      ...drivers,
      userMessage: '',
      userMessageCode: 'DRIVERS_FETCHED',
      developerMessage: 'Drivers fetched successfully',
    };
  }

  @Get(':id')
  @Version('1')
  async getDriver(@Param('id') id: string) {
    const driver = await this.driverService.findOne(id);
    return {
      result: driver,
      userMessage: 'Driver fetched successfully',
      userMessageCode: 'DRIVER_FETCHED',
      developerMessage: 'Driver fetched successfully',
    };
  }
}
