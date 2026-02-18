import { IsString, IsEmail, IsOptional, IsMongoId, MinLength, IsEnum } from 'class-validator';
import { AccountStatus, DutyStatus } from '../entities/driver.entity';

export class UpdateDriverDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  phone?: string;

  @IsOptional()
  @IsEnum(AccountStatus)
  accountStatus?: AccountStatus;

  @IsOptional()
  @IsEnum(DutyStatus)
  dutyStatus?: DutyStatus;

  @IsOptional()
  @IsMongoId()
  truckId?: string;
}
