import {
  Controller,
  Get,
  Param,
  Query,
  Version,
} from '@nestjs/common';
import { TruckService } from '../../services/truck.service';
import { TruckResponseDto } from '../../dtos/truck-response.dto';

@Controller('app/trucks')
export class AppTruckController {
  constructor(private readonly truckService: TruckService) {}

  @Get()
  @Version('1')
  async getAllTrucks(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ result: TruckResponseDto[]; pagination: { page: number; limit: number; totalItems: number; totalPages: number } }> {
    return this.truckService.findAll(page, limit);
  }

  @Get('near')
  @Version('1')
  async getTrucksNear(
    @Query('longitude') longitude: number,
    @Query('latitude') latitude: number,
    @Query('maxDistance') maxDistance?: number,
  ): Promise<TruckResponseDto[]> {
    return this.truckService.findNear(
      Number(longitude),
      Number(latitude),
      maxDistance ? Number(maxDistance) : 10000,
    );
  }

  @Get(':id')
  @Version('1')
  async getTruck(@Param('id') id: string): Promise<TruckResponseDto> {
    return this.truckService.findOne(id);
  }
}
