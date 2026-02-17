import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class DriverLocationUpdateDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsString()
  address?: string;
}
