import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, ArrayMinSize, ArrayMaxSize, IsMongoId } from 'class-validator';

export class CreateTruckDto {
  @IsString()
  vehicleNumber: string;

  @IsOptional()
  @IsString()
  truckName?: string;

  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @IsString()
  licensePlate: string;

  @IsOptional()
  @IsMongoId()
  driverId?: string;

  // Location as [longitude, latitude] - optional for initial creation
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  coordinates?: [number, number]; // [longitude, latitude]

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
