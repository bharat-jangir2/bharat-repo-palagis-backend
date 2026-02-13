import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, ArrayMinSize, ArrayMaxSize, IsMongoId, IsEnum } from 'class-validator';
import { TruckStatus } from '../entities/truck.entity';

export class CreateTruckDto {
  @IsString()
  vehicleNumber: string;

  @IsOptional()
  @IsString()
  truckName?: string;

  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @IsString()
  licensePlate: string;

  @IsOptional()
  @IsMongoId()
  driverId?: string;

  // Location as [longitude, latitude] - optional for initial creation
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  coordinates?: [number, number]; // [longitude, latitude]

  @IsOptional()
  @IsBoolean()
  isActive?: boolean; // Defaults to true on creation

  @IsOptional()
  @IsEnum(TruckStatus)
  truckStatus?: TruckStatus; // Managed via API, defaults to ACTIVE in entity
}
