import { Injectable, UnauthorizedException } from '@nestjs/common';
import { verify } from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TokenService } from './token.service';
import { DeviceType, UserType, TokenType } from '../entities/token.entity';
import { DriverService } from './driver.service';
import { DriverLoginDto } from '../dtos/driver-login.dto';
import { Truck, TruckDocument } from '../entities/truck.entity';

@Injectable()
export class DriverAuthService {
  constructor(
    private readonly tokenService: TokenService,
    private readonly driverService: DriverService,
    private readonly configService: ConfigService,
    @InjectModel(Truck.name) private truckModel: Model<TruckDocument>,
  ) {}

  async login(
    dto: DriverLoginDto & { deviceId: string; deviceType: DeviceType },
  ) {
    // Validate driver credentials using driverCode
    const driver = await this.driverService.validateDriver(
      dto.driverCode,
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

    // Populate truck information if truckId exists
    let truck: any = null;
    if (driver.truckId) {
      const truckDoc = await this.truckModel
        .findOne({ _id: driver.truckId, isDeleted: false })
        .lean()
        .exec();
      
      if (truckDoc) {
        truck = {
          _id: truckDoc._id.toString(),
          truckCode: truckDoc.truckCode,
          vehicleNumber: truckDoc.vehicleNumber,
          truckName: truckDoc.truckName,
          vehicleModel: truckDoc.vehicleModel,
          location: truckDoc.location,
          truckStatus: truckDoc.truckStatus,
        };
      }
    }

    const loginResponse = {
      driver: {
        _id: driver._id.toString(),
        driverCode: driver.driverCode,
        email: driver.email,
        phone: driver.phone,
        fullName: driver.fullName,
        licenseNumber: driver.licenseNumber,
        address: driver.address,
        isActive: driver.isActive,
        accountStatus: driver.accountStatus,
        dutyStatus: driver.dutyStatus,
        truck, // Add truck object (null if not assigned)
      },
      accessToken,
      refreshToken,
    };

    return loginResponse;
  }

  /**
   * Refresh access token using refresh token for driver.
   */
  async refreshToken(refreshToken: string, deviceId: string) {
    const secret = this.configService.get<string>('jwt.refreshSecret');
    
    if (!secret) {
      throw new UnauthorizedException('JWT refresh secret is not configured');
    }

    let payload: any;
    try {
      payload = verify(refreshToken, secret);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.tokenType !== TokenType.REFRESH) {
      throw new UnauthorizedException('Invalid token type');
    }

    if (payload.userType !== UserType.DRIVER) {
      throw new UnauthorizedException('Invalid user type for refresh token');
    }

    if (payload.deviceId !== deviceId) {
      throw new UnauthorizedException('Device ID mismatch');
    }

    if (!payload.userId) {
      throw new UnauthorizedException('User ID not found in token');
    }

    // Verify token exists in database
    const token = await this.tokenService.findToken(refreshToken, TokenType.REFRESH);
    if (!token) {
      throw new UnauthorizedException('Refresh token not found or invalidated');
    }

    // Verify token belongs to driver
    if (token.userId !== payload.userId || token.userType !== UserType.DRIVER) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new access token
    const accessToken = await this.tokenService.generateAccessToken(
      deviceId,
      token.deviceType,
      payload.userId,
      UserType.DRIVER,
    );

    // Check if refresh token is close to expiring (less than 1 day remaining)
    const oneDayInMs = 24 * 60 * 60 * 1000;
    const timeUntilExpiry = token.expiresAt.getTime() - Date.now();
    const shouldRotateRefreshToken = timeUntilExpiry < oneDayInMs;

    let finalRefreshToken = refreshToken;

    // Only generate new refresh token if current one is close to expiring
    if (shouldRotateRefreshToken) {
      // Invalidate old refresh token before generating new one
      await this.tokenService.invalidateToken(refreshToken);
      
      finalRefreshToken = await this.tokenService.generateRefreshToken(
        deviceId,
        token.deviceType,
        payload.userId,
        UserType.DRIVER,
      );
    }

    return {
      accessToken,
      refreshToken: finalRefreshToken,
    };
  }

  /**
   * Logout driver from a specific device (does NOT affect other devices).
   */
  async logout(userId: string, deviceId: string): Promise<void> {
    await this.tokenService.invalidateUserDeviceTokens(userId, deviceId);
  }
}
