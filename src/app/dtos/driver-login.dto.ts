import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class DriverLoginDto {
  // Driver can login with either phone or email (at least one required - validated in controller)
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @IsNotEmpty()
  passcode: string;
}
