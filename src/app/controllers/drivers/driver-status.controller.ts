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
import { DriverDutyStatusUpdateDto } from '../../dtos/driver-duty-status-update.dto';
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
    @Body() updateDto: DriverDutyStatusUpdateDto,
  ) {
    const { userId, userType } = req.user;

    if (!userId || userType !== UserType.DRIVER) {
      throw new UnauthorizedException('Invalid driver token');
    }

    // Update only duty status
    const driver = await this.driverService.update(userId, {
      dutyStatus: updateDto.driverStatus,
    });

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
        accountStatus: driver.accountStatus,
        dutyStatus: driver.dutyStatus,
        createdAt: driver.createdAt,
        updatedAt: driver.updatedAt,
      },
      userMessage: 'Duty status updated successfully',
      userMessageCode: 'DUTY_STATUS_UPDATED',
      developerMessage: `Driver duty status updated to ${updateDto.driverStatus}`,
    };
  }
}
