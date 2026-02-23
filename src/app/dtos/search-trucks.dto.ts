import { IsOptional, IsNumber, IsString, Min, Max, ValidateIf } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationDto } from './pagination.dto';

export class SearchTrucksDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500) // Max 500 miles
  @Transform(({ value }) => (value ? parseFloat(value) : 50)) // Default 50 miles
  radius?: number = 50; // Radius in miles

  @IsOptional()
  @Transform(({ value }) => {
    if (!value || value === '' || value === null) {
      return undefined;
    }
    const sanitized = String(value)
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return sanitized || undefined;
  })
  @IsString()
  search?: string; // Search by truck code, vehicle number, or location address
}
