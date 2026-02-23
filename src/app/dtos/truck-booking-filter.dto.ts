import { IsOptional, IsEnum, IsString, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from './pagination.dto';
import { TruckBookingType, TruckBookingStatus } from '../entities/truck-booking.entity';

export class TruckBookingFilterDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }) => {
    // Convert empty string to undefined
    if (value === '' || value === null) {
      return undefined;
    }
    return value;
  })
  @ValidateIf((o) => o.type !== undefined && o.type !== null && o.type !== '')
  @IsEnum(TruckBookingType, { message: 'Type must be either "standard" or "emergency"' })
  type?: TruckBookingType;

  @IsOptional()
  @Transform(({ value }) => {
    // Convert empty string to undefined
    if (value === '' || value === null) {
      return undefined;
    }
    return value;
  })
  @ValidateIf((o) => o.status !== undefined && o.status !== null && o.status !== '')
  @IsEnum(TruckBookingStatus, {
    message: 'Status must be one of: "pending", "in_progress", "completed", "rejected"',
  })
  status?: TruckBookingStatus;

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
  search?: string; // Search by fullName, email, or eventLocation.address
}
