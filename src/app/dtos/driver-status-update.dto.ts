import { IsEnum, IsOptional, IsMongoId, ValidateIf } from 'class-validator';
import { AccountStatus, DutyStatus } from '../entities/driver.entity';

export class DriverStatusUpdateDto {
  @IsOptional()
  @IsEnum(AccountStatus, { message: 'Account status must be either "active" or "inactive"' })
  accountStatus?: AccountStatus;

  @IsOptional()
  @IsEnum(DutyStatus, { message: 'Duty status must be either "onduty" or "offduty"' })
  dutyStatus?: DutyStatus;

  @IsOptional()
  @ValidateIf((o) => o.truckId !== null)
  @IsMongoId({ message: 'Truck ID must be a valid MongoDB ObjectId' })
  truckId?: string | null;
}
