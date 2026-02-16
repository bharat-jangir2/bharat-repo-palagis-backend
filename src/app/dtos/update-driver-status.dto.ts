import { IsEnum } from 'class-validator';
import { DriverStatus } from '../entities/driver.entity';

export class UpdateDriverStatusDto {
  @IsEnum(DriverStatus)
  driverStatus: DriverStatus;
}
