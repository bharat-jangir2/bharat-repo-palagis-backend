import {
  Controller,
  Get,
  Param,
  Query,
  Version,
} from '@nestjs/common';
import { TruckService } from '../../services/truck.service';
import { PaginationDto } from '../../dtos/pagination.dto';
import { FindNearDto } from '../../dtos/find-near.dto';
import { Public } from '../../decorators/public.decorator';

@Controller('users/trucks')
export class UserTruckController {
  constructor(private readonly truckService: TruckService) {}

  @Get()
  @Version('1')
  @Public()
  async getAllTrucks(
    @Query() paginationDto: PaginationDto,
  ) {
    return this.truckService.findAllTrucks(
      paginationDto.page,
      paginationDto.limit,
    );
  }

  @Get('nearby')
  @Version('1')
  @Public()
  async getTrucksNear(
    @Query() findNearDto: FindNearDto,
  ) {
    return this.truckService.findNear(
      findNearDto.longitude,
      findNearDto.latitude,
      findNearDto.maxDistance,
    );
  }

  @Get(':id')
  @Version('1')
  @Public()
  async getTruck(@Param('id') id: string) {
    return this.truckService.findOne(id);
  }
}
