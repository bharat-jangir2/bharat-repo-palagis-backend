export class DriverResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  address?: string;
  truckId: string;
  isActive?: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
