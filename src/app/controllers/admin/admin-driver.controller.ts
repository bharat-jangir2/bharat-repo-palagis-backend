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
} from '@nestjs/common';
import { DriverService } from '../../services/driver.service';
import { CreateDriverDto } from '../../dtos/create-driver.dto';
import { UpdateDriverDto } from '../../dtos/update-driver.dto';
import { DriverResponseDto } from '../../dtos/driver-response.dto';

@Controller('admin/drivers')
export class AdminDriverController {
  constructor(private readonly driverService: DriverService) {}

  @Post()
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  async createDriver(@Body() createDriverDto: CreateDriverDto): Promise<DriverResponseDto> {
    return this.driverService.create(createDriverDto);
  }

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

  @Put(':id')
  @Version('1')
  async updateDriver(
    @Param('id') id: string,
    @Body() updateDriverDto: UpdateDriverDto,
  ): Promise<DriverResponseDto> {
    return this.driverService.update(id, updateDriverDto);
  }

  @Delete(':id')
  @Version('1')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDriver(@Param('id') id: string): Promise<void> {
    return this.driverService.remove(id);
  }
}
