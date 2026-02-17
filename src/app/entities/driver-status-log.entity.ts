import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { DriverStatus } from './driver.entity';

export type DriverStatusLogDocument = DriverStatusLog & Document;

export interface StatusLogEntry {
  status: DriverStatus;
  timestamp: Date;
}

@Schema({ timestamps: true })
export class DriverStatusLog {
  @Prop({ type: Types.ObjectId, ref: 'Driver', required: true, index: true })
  driverId: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  date: string; // Format: YYYY-MM-DD

  @Prop({
    type: [
      {
        status: { type: String, enum: Object.values(DriverStatus), required: true },
        timestamp: { type: Date, required: true },
        _id: false, // Disable _id for nested objects
      },
    ],
    default: [],
  })
  statusLogs: StatusLogEntry[];

  createdAt: Date;
  updatedAt: Date;
}

export const DriverStatusLogSchema = SchemaFactory.createForClass(DriverStatusLog);

// Compound unique index on driverId and date
DriverStatusLogSchema.index({ driverId: 1, date: 1 }, { unique: true });
