import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DriverDocument = Driver & Document;

@Schema({ timestamps: true })
export class Driver {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, unique: true })
  phone: string;

  @Prop({ required: true, unique: true })
  licenseNumber: string;

  @Prop()
  address?: string;

  // Reference to Truck - Admin selects this when creating driver
  @Prop({ type: Types.ObjectId, ref: 'Truck', required: true })
  truckId: Types.ObjectId;

  @Prop({ default: true })
  isActive?: boolean;

  @Prop({ default: false })
  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const DriverSchema = SchemaFactory.createForClass(Driver);
// Index for soft delete queries
DriverSchema.index({ isDeleted: 1 });
