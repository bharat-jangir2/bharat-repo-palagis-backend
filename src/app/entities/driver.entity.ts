import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DriverDocument = Driver & Document;

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum DutyStatus {
  ONDUTY = 'onduty',
  OFFDUTY = 'offduty',
}

@Schema({ timestamps: true })
export class Driver {
  @Prop({ required: true, unique: true })
  driverCode: string; // Auto-generated: DRV-001, DRV-002, etc.

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
  passcode: string; // Plain text 6-digit passcode for login

  @Prop({ default: true })
  isActive?: boolean;

  @Prop({ type: String, enum: AccountStatus, default: AccountStatus.ACTIVE })
  accountStatus: AccountStatus;

  @Prop({ type: String, enum: DutyStatus, default: DutyStatus.OFFDUTY })
  dutyStatus: DutyStatus;

  @Prop({ default: false })
  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const DriverSchema = SchemaFactory.createForClass(Driver);
// Index for soft delete queries
DriverSchema.index({ isDeleted: 1 });
// driverCode index is automatically created by unique: true