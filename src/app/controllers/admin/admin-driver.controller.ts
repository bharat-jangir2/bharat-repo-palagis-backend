import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Version,
  Query,
} from '@nestjs/common';
import { DriverService } from '../../services/driver.service';
import { CreateDriverDto } from '../../dtos/create-driver.dto';
import { UpdateDriverDto } from '../../dtos/update-driver.dto';
import { PaginationDto } from '../../dtos/pagination.dto';

@Controller('admin/drivers')
export class AdminDriverController {
  constructor(private readonly driverService: DriverService) {}

  @Post()
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  async createDriver(@Body() createDriverDto: CreateDriverDto) {
    return this.driverService.create(createDriverDto);
  }

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

  @Put(':id')
  @Version('1')
  async updateDriver(
    @Param('id') id: string,
    @Body() updateDriverDto: UpdateDriverDto,
  ) {
    return this.driverService.update(id, updateDriverDto);
  }

  @Delete(':id')
  @Version('1')
  async deleteDriver(@Param('id') id: string) {
    await this.driverService.remove(id);
    return { message: 'Driver deleted successfully' };
  }
}
