import { IsEnum } from 'class-validator';
import { TruckBookingStatus } from '../entities/truck-booking.entity';

export class UpdateBookingStatusDto {
  @IsEnum(TruckBookingStatus, {
    message: 'Status must be one of: "pending", "in_progress", "completed", "rejected"',
  })
  status: TruckBookingStatus;
}
