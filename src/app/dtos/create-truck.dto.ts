import { IsString, IsOptional, IsMongoId, IsEnum } from 'class-validator';
import { TruckStatus } from '../entities/truck.entity';

export class CreateTruckDto {
  @IsString()
  vehicleNumber: string;

  @IsString()
  licensePlate: string;

  @IsEnum(TruckStatus)
  truckStatus: TruckStatus;

  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsMongoId()
  driverId?: string;
}
