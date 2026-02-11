import { PartialType } from '@nestjs/mapped-types';
import { CreateTruckDto } from './create-truck.dto';
import { IsString, IsOptional } from 'class-validator';

export class UpdateTruckDto extends PartialType(CreateTruckDto) {
  // Allow truckCode in DTO but it will be ignored in service
  @IsOptional()
  @IsString()
  truckCode?: string; // Read-only field - will be ignored during update
}
