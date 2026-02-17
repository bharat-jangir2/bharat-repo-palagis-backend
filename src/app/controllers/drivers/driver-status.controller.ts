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
import { DriverService } from '../../services/driver.service';
import { DriverStatusUpdateDto } from '../../dtos/driver-status-update.dto';
import { UserType } from '../../entities/token.entity';

@Controller('drivers')
@UseGuards(JwtAuthGuard)
export class DriverStatusController {
  constructor(private readonly driverService: DriverService) {}

  @Post('update-status')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Request() req,
    @Body() updateDto: DriverStatusUpdateDto,
  ) {
    const { userId, userType } = req.user;

    if (!userId || userType !== UserType.DRIVER) {
      throw new UnauthorizedException('Invalid driver token');
    }

    // Validate at least one field is provided
    if (updateDto.driverStatus === undefined && updateDto.truckId === undefined) {
      throw new UnauthorizedException('At least one field (driverStatus or truckId) must be provided');
    }

    // Build update object with only provided fields - directly compatible with UpdateDriverDto
    const updateData: any = {};
    if (updateDto.driverStatus !== undefined) {
      updateData.driverStatus = updateDto.driverStatus;
    }
    if (updateDto.truckId !== undefined) {
      updateData.truckId = updateDto.truckId;
    }

    // Use the existing update method which handles status logging and truck sync
    const driver = await this.driverService.update(userId, updateData);

    return {
      result: {
        _id: driver._id,
        fullName: driver.fullName,
        email: driver.email,
        phone: driver.phone,
        licenseNumber: driver.licenseNumber,
        address: driver.address,
        truck: driver.truck,
        isActive: driver.isActive,
        driverStatus: driver.driverStatus,
        createdAt: driver.createdAt,
        updatedAt: driver.updatedAt,
      },
      userMessage: 'Status updated successfully',
      userMessageCode: 'STATUS_UPDATED',
      developerMessage: 'Driver status and/or truck updated successfully',
    };
  }
}
