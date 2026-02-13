import { IsString, IsEmail, IsOptional, IsBoolean, IsMongoId, MinLength, IsEnum } from 'class-validator';
import { DriverStatus } from '../entities/driver.entity';

export class CreateDriverDto {
  @IsString()
  @MinLength(2)
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(10)
  phone: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsMongoId()
  truckId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean; // Defaults to true on creation

  @IsOptional()
  @IsEnum(DriverStatus)
  driverStatus?: DriverStatus; // Managed via API, defaults to ACTIVE in entity
}
