import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateSuperAdminProfileDto {
  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters long' })
  fullName?: string;
}
