import { IsEnum } from 'class-validator';
import { TruckStatus } from '../entities/truck.entity';

export class UpdateTruckStatusDto {
  @IsEnum(TruckStatus)
  truckStatus: TruckStatus;
}
