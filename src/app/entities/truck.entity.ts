import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TruckDocument = Truck & Document;

export enum TruckStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Schema({ 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true } 
})
export class Truck {
  @Prop({ required: true, unique: true })
  truckCode: string; // Auto-generated: TRU-001, TRU-002, etc.

  @Prop({ required: true, unique: true })
  vehicleNumber: string;

  @Prop()
  truckName?: string; // Optional - for backward compatibility

  @Prop()
  vehicleModel?: string; // e.g., "Ford Transit 2022"

  // Reference to Driver - Optional
  @Prop({ type: Types.ObjectId, ref: 'Driver', required: false })
  driverId?: Types.ObjectId;

  // GeoJSON structure for Proximity Queries
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
  location: {
    type: string;
    coordinates: number[];
    address?: string; // Human-readable address (e.g., "123 Main St, City, State")
  };

  @Prop({ type: String, enum: TruckStatus, default: TruckStatus.ACTIVE })
  truckStatus: TruckStatus;

  @Prop({ type: Date })
  statusUpdatedAt?: Date; // Track when truckStatus was last updated

  @Prop({ default: false })
  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const TruckSchema = SchemaFactory.createForClass(Truck);

// INDEX: Mandatory for Geo-Near queries
TruckSchema.index({ location: '2dsphere' });
// Index for soft delete queries
TruckSchema.index({ isDeleted: 1 });
// truckCode index is automatically created by unique: true

// VIRTUALS: Allow using truck.latitude and truck.longitude
TruckSchema.virtual('latitude').get(function() {
  return this.location?.coordinates?.[1] || 0;
});

TruckSchema.virtual('longitude').get(function() {
  return this.location?.coordinates?.[0] || 0;
});
