import { IsString, IsEmail, IsOptional, IsMongoId, MinLength, IsEnum } from 'class-validator';
import { DriverStatus } from '../entities/driver.entity';

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
  @IsEnum(DriverStatus)
  driverStatus?: DriverStatus;

  @IsOptional()
  @IsMongoId()
  truckId?: string;
}
