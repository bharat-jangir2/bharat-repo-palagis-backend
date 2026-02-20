import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserSettingsDto {
  @IsOptional()
  @IsBoolean()
  notificationEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  locationEnabled?: boolean;
}
