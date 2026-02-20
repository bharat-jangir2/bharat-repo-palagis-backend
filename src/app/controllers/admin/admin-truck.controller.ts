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
import { UpdateTruckStatusDto } from '../../dtos/update-truck-status.dto';
import { TruckFilterDto } from '../../dtos/truck-filter.dto';
import { TruckSelectOptionsDto } from '../../dtos/truck-select-options.dto';
import { Public } from 'src/app/decorators/public.decorator';

@Controller('super-admin/trucks')
export class AdminTruckController {
  constructor(private readonly truckService: TruckService) {}

  @Post()
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  @Public()
  async createTruck(@Body() createTruckDto: CreateTruckDto) {
    const truck = await this.truckService.addTruck(createTruckDto);
    return {
      ...truck,
      userMessage: 'Truck Added Successfully',
      userMessageCode: 'TRUCK_ADDED',
      developerMessage: `Truck with vehicle number ${truck.vehicleNumber} has been created`,
    };
  }

  @Get()
  @Version('1')
  async getAllTrucks(
    @Query() filterDto: TruckFilterDto,
  ) {
    const trucks = await this.truckService.findAllTrucks(
      filterDto.page,
      filterDto.limit,
      filterDto.status,
      filterDto.search,
    );
    return {
      ...trucks,
      userMessage: '',
      userMessageCode: 'TRUCKS_FETCHED',
      developerMessage: 'Trucks fetched successfully',
    };
  }

  @Get('select-options')
  @Version('1')
  async getTrucksForSelectOptions(
    @Query() filterDto: TruckSelectOptionsDto,
  ) {
    const trucks = await this.truckService.findAllTrucksForDropdown(
      filterDto.page,
      filterDto.limit,
      filterDto.search,
    );
    return {
      ...trucks,
      userMessage: '',
      userMessageCode: 'TRUCKS_FETCHED',
      developerMessage: 'Trucks fetched successfully',
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

  @Put(':id')
  @Version('1')
  async updateTruck(
    @Param('id') id: string,
    @Body() updateTruckDto: UpdateTruckDto,
  ) {
    const truck = await this.truckService.updateTruck(id, updateTruckDto);
    return {
      result: truck,
      userMessage: 'Truck Updated Successfully',
      userMessageCode: 'TRUCK_UPDATED',
      developerMessage: 'Truck Updated Successfully',
    };
  }

  @Delete(':id')
  @Version('1')
  async deleteTruck(@Param('id') id: string) {
    await this.truckService.deleteTruck(id);
    return {
      userMessage: 'Truck deleted successfully',
      userMessageCode: 'TRUCK_DELETED',
      developerMessage: `Truck with ID ${id} deleted successfully`,
    };
  }


  @Post(':truckId/update-status')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async updateTruckStatus(
    @Param('truckId') truckId: string,
    @Body() updateTruckStatusDto: UpdateTruckStatusDto,
  ) {
    const truck = await this.truckService.updateTruckStatus(truckId, updateTruckStatusDto.truckStatus);
    return {
      result: truck,
      userMessage: 'Truck status updated successfully',
      userMessageCode: 'TRUCK_STATUS_UPDATED',
      developerMessage: `Truck status updated to ${updateTruckStatusDto.truckStatus}`,
    };
  }
}
