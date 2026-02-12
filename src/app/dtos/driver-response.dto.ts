export class DriverResponseDto {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  licenseNumber?: string;
  address?: string;
  truckId?: string;
  isActive?: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
