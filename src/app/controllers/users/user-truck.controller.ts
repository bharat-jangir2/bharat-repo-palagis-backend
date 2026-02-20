import {
  Controller,
  Get,
  Param,
  Query,
  Version,
  UseGuards,
} from '@nestjs/common';
import { TruckService } from '../../services/truck.service';
import { PaginationDto } from '../../dtos/pagination.dto';
import { FindNearDto } from '../../dtos/find-near.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@Controller('users/trucks')
@UseGuards(JwtAuthGuard)
export class UserTruckController {
  constructor(private readonly truckService: TruckService) {}

  @Get()
  @Version('1')
  async getAllTrucks(
    @Query() paginationDto: PaginationDto,
  ) {
    const trucks = await this.truckService.findAllTrucks(
      paginationDto.page,
      paginationDto.limit,
    );
    return {
      ...trucks,
      userMessage: '',
      userMessageCode: 'TRUCKS_FETCHED',
      developerMessage: 'Trucks fetched successfully',
    };
  }

  @Get('nearby')
  @Version('1')
  async getTrucksNear(
    @Query() findNearDto: FindNearDto,
  ) {
    const trucks = await this.truckService.findNear(
      findNearDto.longitude,
      findNearDto.latitude,
      findNearDto.maxDistance,
    );
    return {
      result: trucks,
      userMessage: '',
      userMessageCode: 'TRUCKS_FETCHED',
      developerMessage: 'Nearby trucks fetched successfully',
    };
  }

  @Get(':id')
  @Version('1')
  async getTruck(@Param('id') id: string) {
    const truck = await this.truckService.findOne(id);
    return {
      result: truck,
      userMessage: 'Truck fetched successfully',
      userMessageCode: 'TRUCK_FETCHED',
      developerMessage: 'Truck fetched successfully',
    };
  }
}
