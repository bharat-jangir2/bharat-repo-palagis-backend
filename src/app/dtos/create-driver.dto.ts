import { IsString, IsEmail, IsOptional, IsBoolean, IsMongoId, MinLength } from 'class-validator';

export class CreateDriverDto {
  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(10)
  phone: string;

  @IsString()
  @MinLength(5)
  licenseNumber: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsMongoId()
  truckId: string; // Required - Admin selects truck when creating driver

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
