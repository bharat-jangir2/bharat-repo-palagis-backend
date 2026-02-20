import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Truck } from './truck.entity';
import { Driver } from './driver.entity';
import { User } from './user.entity';

export type TruckBookingDocument = TruckBooking & Document;

export enum TruckBookingType {
  STANDARD = 'standard',
  EMERGENCY = 'emergency',
}

export enum TruckBookingStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class TruckBooking {
  @Prop({ required: true, unique: true })
  requestId: string; // Auto-generated: REQ-2024-001, REQ-2024-002, etc.

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  userId: Types.ObjectId; // Reference to the user who created the booking

  @Prop({ required: true })
  deviceId: string; // Device ID of the user who created the booking

  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  email: string;

  @Prop({ type: String, enum: TruckBookingType, required: true })
  type: TruckBookingType;

  // Event location as GeoJSON Point + address
  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      default: [0, 0],
    },
    address: {
      type: String,
      required: false,
      default: '',
    },
  })
  eventLocation: {
    type: string;
    coordinates: number[]; // [lng, lat]
    address?: string; // Human-readable address
  };

  // Separate date and time fields from the UI
  @Prop({ type: Date, required: true })
  bookingDate: Date; // Date portion (e.g., 2024-02-15)

  @Prop({ type: String, required: true })
  bookingTime: string; // Time string (e.g., "14:00" or "2:00 PM")

  @Prop()
  bookingNote?: string; // Additional notes / emergency details


  @Prop({ type: String, enum: TruckBookingStatus, default: TruckBookingStatus.PENDING })
  status: TruckBookingStatus;

  @Prop({ default: false })
  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const TruckBookingSchema = SchemaFactory.createForClass(TruckBooking);

// Indexes
TruckBookingSchema.index({ eventLocation: '2dsphere' });
TruckBookingSchema.index({ isDeleted: 1 });
TruckBookingSchema.index({ bookingDate: 1 });
TruckBookingSchema.index({ userId: 1 });
TruckBookingSchema.index({ status: 1 });

