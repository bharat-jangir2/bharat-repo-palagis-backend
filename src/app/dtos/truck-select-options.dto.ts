import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationDto } from './pagination.dto';

export class TruckSelectOptionsDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => (value ? parseInt(value, 10) : 100))
  limit?: number = 100; // Override default limit to 100 for dropdown

  @IsOptional()
  @Transform(({ value }) => {
    // Convert empty string to undefined
    if (!value || value === '' || value === null) {
      return undefined;
    }
    // Return trimmed value - sanitization is done in the service layer
    return String(value).trim() || undefined;
  })
  @IsString()
  search?: string; // Search by vehicleNumber
}
