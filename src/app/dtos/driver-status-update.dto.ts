import { IsEnum, IsOptional, IsMongoId, ValidateIf } from 'class-validator';
import { DriverStatus } from '../entities/driver.entity';

export class DriverStatusUpdateDto {
  @IsOptional()
  @IsEnum(DriverStatus, { message: 'Status must be either "active" or "inactive"' })
  driverStatus?: DriverStatus;

  @IsOptional()
  @ValidateIf((o) => o.truckId !== null)
  @IsMongoId({ message: 'Truck ID must be a valid MongoDB ObjectId' })
  truckId?: string | null;
}
