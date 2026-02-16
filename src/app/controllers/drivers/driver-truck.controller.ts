import { Controller, Get, Query, Version } from '@nestjs/common';
import { TruckService } from '../../services/truck.service';
import { UnassignedTruckFilterDto } from '../../dtos/unassigned-truck-filter.dto';

@Controller('drivers/trucks')
export class DriverTruckController {
  constructor(private readonly truckService: TruckService) {}

  @Get()
  @Version('1')
  async getAllTrucks(@Query() filterDto: UnassignedTruckFilterDto) {
    // Use the common findAllTrucks with pagination + search; no status filter for drivers
    return this.truckService.findAllTrucks(
      filterDto.page,
      filterDto.limit,
      undefined,
      filterDto.search,
    );
  }
}