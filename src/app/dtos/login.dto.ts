import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { DeviceType } from '../entities/token.entity';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsEnum(DeviceType)
  @IsOptional()
  deviceType?: DeviceType = DeviceType.UNKNOWN;
}
