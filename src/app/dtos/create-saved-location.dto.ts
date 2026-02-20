import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
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

export class CreateSavedLocationDto {
  @IsNotEmpty()
  @IsString()
  locationName: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @IsNotEmpty()
  @IsEnum(SavedLocationType)
  type: SavedLocationType;

  @IsOptional()
  @ValidateNested()
  @Type(() => AlertConfigDto)
  alertConfig?: AlertConfigDto;
}
