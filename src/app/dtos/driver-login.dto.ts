import { IsString, IsNotEmpty } from 'class-validator';

export class DriverLoginDto {
  @IsString()
  @IsNotEmpty()
  driverCode: string;

  @IsString()
  @IsNotEmpty()
  passcode: string;
}
