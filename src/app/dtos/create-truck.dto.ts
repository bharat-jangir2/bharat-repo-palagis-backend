import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class CreateTruckDto {
  @IsString()
  vehicleNumber: string;

  @IsString()
  truckName: string;

  // Location as [longitude, latitude]
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  coordinates: [number, number]; // [longitude, latitude]

  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;
}
