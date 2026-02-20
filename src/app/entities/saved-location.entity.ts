import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.entity';

export type SavedLocationDocument = SavedLocation & Document;

export enum SavedLocationType {
  HOME = 'home',
  SCHOOL = 'school',
  WORK = 'work',
  OTHER = 'other',
}

export class AlertConfig {
  alertRadius: number; // in meters
  alertEnabled: boolean;
}

@Schema({ timestamps: true })
export class SavedLocation {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  deviceId: string;

  @Prop({ required: true })
  locationName: string;

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
    _id: false,
  })
  location: {
    type: string;
    coordinates: number[];
    address?: string;
  };

  @Prop({ type: String, enum: SavedLocationType, required: true })
  type: SavedLocationType;

  @Prop({
    type: {
      alertRadius: { type: Number, default: 500 },
      alertEnabled: { type: Boolean, default: false },
    },
    default: {
      alertRadius: 500,
      alertEnabled: false,
    },
    _id: false,
  })
  alertConfig: AlertConfig;

  @Prop({ default: false })
  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const SavedLocationSchema = SchemaFactory.createForClass(SavedLocation);

// Indexes
SavedLocationSchema.index({ location: '2dsphere' });
SavedLocationSchema.index({ userId: 1 });
SavedLocationSchema.index({ isDeleted: 1 });
