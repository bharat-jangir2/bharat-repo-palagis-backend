import { IsString, IsEmail, IsOptional, IsBoolean, IsMongoId, MinLength } from 'class-validator';

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
  isActive?: boolean;
}
