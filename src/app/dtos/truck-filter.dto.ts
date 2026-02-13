import { IsOptional, IsEnum, IsString, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from './pagination.dto';

export enum TruckStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class TruckFilterDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }) => {
    // Convert empty string to undefined
    if (value === '' || value === null) {
      return undefined;
    }
    return value;
  })
  @ValidateIf((o) => o.status !== undefined && o.status !== null && o.status !== '')
  @IsEnum(TruckStatus, { message: 'Status must be either "active" or "inactive"' })
  status?: TruckStatus;

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
  search?: string; // Search by truck name, driver email, or driver phone
}
