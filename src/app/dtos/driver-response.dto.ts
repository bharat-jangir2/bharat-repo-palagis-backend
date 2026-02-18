import { AccountStatus, DutyStatus } from '../entities/driver.entity';

export class DriverResponseDto {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  licenseNumber?: string;
  address?: string;
  truckId?: string;
  isActive?: boolean;
  accountStatus: AccountStatus;
  dutyStatus: DutyStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
