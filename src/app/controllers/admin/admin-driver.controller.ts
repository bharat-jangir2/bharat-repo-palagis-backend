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
import { UpdateDriverStatusDto } from '../../dtos/update-driver-status.dto';
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
     const drivers = await this.driverService.findAll(paginationDto.page, paginationDto.limit);
     return {
      ...drivers,
      userMessage: '',
      userMessageCode: 'DRIVERS_FETCHED',
      developerMessage: `Drivers fetched successfully`,
    };
  }

  @Get(':id')
  @Version('1')
  async getDriver(@Param('id') id: string) {
    const driver = await this.driverService.findOne(id);
    return {
      ...driver,
      userMessage: 'Driver fetched successfully',
      userMessageCode: 'DRIVER_FETCHED',
      developerMessage: `Driver fetched successfully`,
    };
  }

  @Put(':id')
  @Version('1')
  async updateDriver(
    @Param('id') id: string,
    @Body() updateDriverDto: UpdateDriverDto,
  ) {
    const driver = await this.driverService.update(id, updateDriverDto);
    return {
      ...driver,
      userMessage: 'Driver updated successfully',
      userMessageCode: 'DRIVER_UPDATED',
      developerMessage: `Driver updated successfully`,
    };
  }

  @Delete(':id')
  @Version('1')
  async deleteDriver(@Param('id') id: string) {
    await this.driverService.remove(id);
    return {
      userMessage: 'Driver deleted successfully',
      userMessageCode: 'DRIVER_DELETED',
      developerMessage: `Driver deleted successfully`,
    };
  }

  @Post(':driverId/update-status')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async updateDriverStatus(
    @Param('driverId') driverId: string,
    @Body() updateDriverStatusDto: UpdateDriverStatusDto,
  ) {
    const driver = await this.driverService.updateStatus(driverId, updateDriverStatusDto.driverStatus);
    return {
      ...driver,
      userMessage: 'Driver status updated successfully',
      userMessageCode: 'DRIVER_STATUS_UPDATED',
      developerMessage: `Driver status updated to ${updateDriverStatusDto.driverStatus}`,
    };
  }
}
