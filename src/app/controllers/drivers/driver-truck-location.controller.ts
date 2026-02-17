import {
  Controller,
  Post,
  Body,
  Request,
  UseGuards,
  UnauthorizedException,
  Version,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { TruckService } from '../../services/truck.service';
import { DriverLocationUpdateDto } from '../../dtos/driver-location-update.dto';
import { UserType } from '../../entities/token.entity';

@UseGuards(JwtAuthGuard)
@Controller('drivers/truck')
export class DriverTruckLocationController {
  constructor(private readonly truckService: TruckService) {}

  @Post('update-location')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async updateLocation(
    @Request() req,
    @Body() dto: DriverLocationUpdateDto,
  ) {
    const { userId, userType } = req.user;

    if (!userId || userType !== UserType.DRIVER) {
      throw new UnauthorizedException('Invalid driver token');
    }

    const truck = await this.truckService.updateLocationForDriver(
      userId,
      dto.latitude,
      dto.longitude,
      dto.address,
    );

    return {
      result: truck,
      userMessage: 'Location updated successfully',
      userMessageCode: 'LOCATION_UPDATED',
      developerMessage: 'Truck location updated successfully for driver',
    };
  }
}

