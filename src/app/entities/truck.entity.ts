import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TruckDocument = Truck & Document;

@Schema({ 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true } 
})
export class Truck {
  @Prop({ required: true, unique: true })
  truckCode: string; // Auto-generated: T-0001, T-0002, etc.

  @Prop({ required: true, unique: true })
  vehicleNumber: string;

  @Prop({ required: true })
  truckName: string;

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
  })
  location: {
    type: string;
    coordinates: number[];
  };

  @Prop({ default: false })
  isOnline: boolean;

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
