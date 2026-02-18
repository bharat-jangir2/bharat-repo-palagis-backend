import {
  Controller,
  Get,
  Request,
  UseGuards,
  UnauthorizedException,
  Version,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { DriverService } from '../../services/driver.service';
import { UserType } from '../../entities/token.entity';

@Controller('drivers/profile')
@UseGuards(JwtAuthGuard)
export class DriverProfileController {
  constructor(private readonly driverService: DriverService) {}

  @Get()
  @Version('1')
  async getProfile(@Request() req) {
    const { userId, userType } = req.user;

    if (!userId || userType !== UserType.DRIVER) {
      throw new UnauthorizedException('Invalid driver token');
    }

    const profile = await this.driverService.findOne(userId);
    
    return {
      result: {
        _id: profile._id,
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        licenseNumber: profile.licenseNumber,
        address: profile.address,
        truck: profile.truck,
        isActive: profile.isActive,
        accountStatus: profile.accountStatus,
        dutyStatus: profile.dutyStatus,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
      userMessage: 'Profile fetched successfully',
      userMessageCode: 'PROFILE_FETCHED',
      developerMessage: 'Profile fetched successfully',
    };
  }
}
