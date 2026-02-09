export class TruckResponseDto {
  id: string;
  vehicleNumber: string;
  truckName: string;
  location: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  isOnline: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
