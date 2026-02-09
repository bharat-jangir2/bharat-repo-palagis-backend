import {
  Controller,
  Get,
  Param,
  Query,
  Version,
} from '@nestjs/common';
import { DriverService } from '../../services/driver.service';
import { PaginationDto } from '../../dtos/pagination.dto';

@Controller('app/drivers')
export class AppDriverController {
  constructor(private readonly driverService: DriverService) {}

  @Get()
  @Version('1')
  async getAllDrivers(
    @Query() paginationDto: PaginationDto,
  ) {
    return this.driverService.findAll(paginationDto.page, paginationDto.limit);
  }

  @Get(':id')
  @Version('1')
  async getDriver(@Param('id') id: string) {
    return this.driverService.findOne(id);
  }
}
