import { IsString, IsOptional, IsMongoId, IsEnum, ValidateIf } from 'class-validator';
import { TruckStatus } from '../entities/truck.entity';

export class CreateTruckDto {
  @IsString()
  vehicleNumber: string;

  @IsEnum(TruckStatus)
  truckStatus: TruckStatus;

  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @ValidateIf((o) => o.driverId !== '' && o.driverId !== null && o.driverId !== undefined)
  @IsMongoId()
  driverId?: string | null;
}
