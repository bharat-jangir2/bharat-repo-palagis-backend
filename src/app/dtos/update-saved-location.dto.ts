import {
  IsString,
  IsOptional,
  IsEnum,
  ValidateNested,
  IsArray,
  ArrayMinSize,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SavedLocationType } from '../entities/saved-location.entity';

class LocationDto {
  @IsArray()
  @ArrayMinSize(2)
  @IsNumber({}, { each: true })
  coordinates: number[]; // [longitude, latitude]

  @IsOptional()
  @IsString()
  address?: string;
}

class AlertConfigDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  alertRadius?: number; // in meters

  @IsOptional()
  @IsBoolean()
  alertEnabled?: boolean;
}

export class UpdateSavedLocationDto {
  @IsOptional()
  @IsString()
  locationName?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsEnum(SavedLocationType)
  type?: SavedLocationType;

  @IsOptional()
  @ValidateNested()
  @Type(() => AlertConfigDto)
  alertConfig?: AlertConfigDto;
}
