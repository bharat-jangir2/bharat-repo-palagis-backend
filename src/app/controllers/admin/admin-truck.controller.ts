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
import { PaginationDto } from '../../dtos/pagination.dto';

@Controller('admin/trucks')
export class AdminTruckController {
  constructor(private readonly truckService: TruckService) {}

  @Post()
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  async createTruck(@Body() createTruckDto: CreateTruckDto) {
    const truck = await this.truckService.create(createTruckDto);
    return {
      ...truck,
      userMessage: 'Truck created successfully',
      userMessageCode: 'TRUCK_CREATED',
      developerMessage: `Truck with vehicle number ${truck.vehicleNumber} has been created`,
    };
  }

  @Get()
  @Version('1')
  async getAllTrucks(
    @Query() paginationDto: PaginationDto,
  ) {
    return this.truckService.findAll(paginationDto.page, paginationDto.limit);
  }

  @Get(':id')
  @Version('1')
  async getTruck(@Param('id') id: string) {
    return this.truckService.findOne(id);
  }

  @Put(':id')
  @Version('1')
  async updateTruck(
    @Param('id') id: string,
    @Body() updateTruckDto: UpdateTruckDto,
  ) {
    return this.truckService.update(id, updateTruckDto);
  }

  @Delete(':id')
  @Version('1')
  async deleteTruck(@Param('id') id: string) {
    await this.truckService.remove(id);
    return { message: 'Truck deleted successfully' };
  }
}
