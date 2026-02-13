import { Injectable } from '@nestjs/common';
import { TokenService } from './token.service';
import { DeviceType, UserType } from '../entities/token.entity';
import { DriverService } from './driver.service';
import { DriverLoginDto } from '../dtos/driver-login.dto';

@Injectable()
export class DriverAuthService {
  constructor(
    private readonly tokenService: TokenService,
    private readonly driverService: DriverService,
  ) {}

  async login(
    dto: DriverLoginDto & { deviceId: string; deviceType: DeviceType },
  ) {
    // Get phone or email from dto
    const phoneOrEmail = dto.phone || dto.email;
    if (!phoneOrEmail) {
      throw new Error('Either phone or email is required');
    }

    // Validate driver credentials
    const driver = await this.driverService.validateDriver(
      phoneOrEmail,
      dto.passcode,
    );

    const userId = driver._id.toString();
    const deviceId = dto.deviceId;
    const deviceType = dto.deviceType ?? DeviceType.ANDROID; // Default to ANDROID for mobile app

    // Generate tokens with userId and userType
    const accessToken = await this.tokenService.generateAccessToken(
      deviceId,
      deviceType,
      userId,
      UserType.DRIVER,
    );

    const refreshToken = await this.tokenService.generateRefreshToken(
      deviceId,
      deviceType,
      userId,
      UserType.DRIVER,
    );

    const loginResponse = {
      driver: {
        _id: driver._id,
        email: driver.email,
        phone: driver.phone,
        fullName: driver.fullName,
        truckId: driver.truckId ? driver.truckId.toString() : null,
      },
      accessToken,
      refreshToken,
    };

    return {
      userMessage: 'Login successfully',
      userMessageCode: 'LOGIN_SUCCESS',
      developerMessage: 'Login successfully',
      result: loginResponse,
    };
  }

  /**
   * Logout driver from a specific device (does NOT affect other devices).
   */
  async logout(userId: string, deviceId: string): Promise<void> {
    await this.tokenService.invalidateUserDeviceTokens(userId, deviceId);
  }
}
