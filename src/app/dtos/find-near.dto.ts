import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class FindNearDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Transform(({ value }) => parseFloat(value))
  longitude: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Transform(({ value }) => parseFloat(value))
  latitude: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100000)
  @Transform(({ value }) => (value ? parseFloat(value) : 10000))
  maxDistance?: number = 10000;
}
