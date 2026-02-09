export class TruckResponseDto {
  id: string;
  vehicleNumber: string;
  truckName: string;
  location: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  latitude?: number;
  longitude?: number;
  isOnline: boolean;
  currentDriver?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
