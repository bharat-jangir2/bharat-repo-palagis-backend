import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsEnum,
  IsOptional,
  IsDateString,
  ValidateNested,
  IsArray,
  ArrayMinSize,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TruckBookingType } from '../entities/truck-booking.entity';

class EventLocationDto {
  @IsArray()
  @ArrayMinSize(2)
  @IsNumber({}, { each: true })
  coordinates: number[]; // [longitude, latitude]

  @IsOptional()
  @IsString()
  address?: string;
}

export class CreateTruckBookingDto {
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsEnum(TruckBookingType)
  type: TruckBookingType;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => EventLocationDto)
  eventLocation: EventLocationDto;

  @IsNotEmpty()
  @IsDateString()
  bookingDate: string; // ISO date string

  @IsNotEmpty()
  @IsString()
  bookingTime: string; // e.g., "14:00" or "2:00 PM"

  @IsOptional()
  @IsString()
  bookingNote?: string;
}
