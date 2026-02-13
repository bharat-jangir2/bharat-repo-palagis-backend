import { TruckStatus } from '../entities/truck.entity';

export class TruckResponseDto {
  id: string;
  truckCode: string;
  vehicleNumber: string;
  truckName?: string;
  vehicleModel?: string;
  licensePlate: string;
  driverId?: string;
  location: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  truckStatus: TruckStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
