import { IsString, IsEmail, IsOptional, IsMongoId, MinLength, IsEnum } from 'class-validator';
import { AccountStatus, DutyStatus } from '../entities/driver.entity';

export class CreateDriverDto {
  @IsString()
  @MinLength(2)
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(10)
  phone: string;

  @IsEnum(AccountStatus)
  accountStatus: AccountStatus;

  @IsOptional()
  @IsEnum(DutyStatus)
  dutyStatus?: DutyStatus;

  @IsOptional()
  @IsMongoId()
  truckId?: string;
}
