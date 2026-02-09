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
import { TruckService } from '../../services/truck.service';
import { CreateTruckDto } from '../../dtos/create-truck.dto';
import { UpdateTruckDto } from '../../dtos/update-truck.dto';
import { TruckResponseDto } from '../../dtos/truck-response.dto';

@Controller('admin/trucks')
export class AdminTruckController {
  constructor(private readonly truckService: TruckService) {}

  @Post()
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  async createTruck(@Body() createTruckDto: CreateTruckDto): Promise<TruckResponseDto> {
    return this.truckService.create(createTruckDto);
  }

  @Get()
  @Version('1')
  async getAllTrucks(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ result: TruckResponseDto[]; pagination: { page: number; limit: number; totalItems: number; totalPages: number } }> {
    return this.truckService.findAll(page, limit);
  }

  @Get(':id')
  @Version('1')
  async getTruck(@Param('id') id: string): Promise<TruckResponseDto> {
    return this.truckService.findOne(id);
  }

  @Put(':id')
  @Version('1')
  async updateTruck(
    @Param('id') id: string,
    @Body() updateTruckDto: UpdateTruckDto,
  ): Promise<TruckResponseDto> {
    return this.truckService.update(id, updateTruckDto);
  }

  @Delete(':id')
  @Version('1')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTruck(@Param('id') id: string): Promise<void> {
    return this.truckService.remove(id);
  }
}
