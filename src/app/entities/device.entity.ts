import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DeviceDocument = Device & Document;

export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
}

@Schema({ timestamps: true })
export class Device {
  @Prop({ required: true, unique: true })
  deviceId: string; // Hardware UUID from mobile app

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  userId?: Types.ObjectId | null; // Future: when you add User

  @Prop({ required: true })
  fcmToken: string;

  @Prop({ required: true, enum: Object.values(DevicePlatform) })
  platform: DevicePlatform;

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0],
    },
  })
  lastLocation?: {
    type: string;
    coordinates: number[];
  };

  @Prop()
  lastNotificationSentAt?: Date;

  @Prop({ default: true })
  isActive: boolean;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);

// Indexes
DeviceSchema.index({ lastLocation: '2dsphere' });
// deviceId index is automatically created by unique: true
DeviceSchema.index({ userId: 1 });
DeviceSchema.index({ isActive: 1 });