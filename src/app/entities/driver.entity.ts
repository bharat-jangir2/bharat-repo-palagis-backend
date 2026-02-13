import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DriverDocument = Driver & Document;

export enum DriverStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Schema({ timestamps: true })
export class Driver {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, unique: true })
  phone: string;

  @Prop()
  licenseNumber?: string;

  @Prop()
  address?: string;

  // Reference to Truck - Optional
  @Prop({ type: Types.ObjectId, ref: 'Truck', required: false })
  truckId?: Types.ObjectId;

  @Prop({ required: true })
  passcode: string; // Hashed 6-digit passcode for login

  @Prop({ default: true })
  isActive?: boolean;

  @Prop({ type: String, enum: DriverStatus, default: DriverStatus.ACTIVE })
  driverStatus: DriverStatus;

  @Prop({ default: false })
  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const DriverSchema = SchemaFactory.createForClass(Driver);
// Index for soft delete queries
DriverSchema.index({ isDeleted: 1 });
