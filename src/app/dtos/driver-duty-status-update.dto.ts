import { IsEnum } from 'class-validator';
import { DutyStatus } from '../entities/driver.entity';

export class DriverDutyStatusUpdateDto {
  @IsEnum(DutyStatus, { message: 'Driver status must be either "onduty" or "offduty"' })
  driverStatus: DutyStatus;
}
