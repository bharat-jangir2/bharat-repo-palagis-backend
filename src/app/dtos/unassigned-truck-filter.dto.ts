import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from './pagination.dto';

export class UnassignedTruckFilterDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }) => {
    // Convert empty string to undefined
    if (!value || value === '' || value === null) {
      return undefined;
    }
    // Sanitize search string - escape special regex characters
    const sanitized = String(value)
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex special characters
    return sanitized || undefined;
  })
  @IsString()
  search?: string; // Search by truck name, vehicle number, or license plate
}
