import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verify } from 'jsonwebtoken';
import { UserService } from './user.service';
import { TokenService } from './token.service';
import { DeviceType, TokenType, UserType } from '../entities/token.entity';

@Injectable()
export class UserAuthService {
  constructor(
    private userService: UserService,
    private tokenService: TokenService,
    private configService: ConfigService,
  ) {}

  /**
   * Login or auto-register user by deviceId
   * No credentials required - deviceId acts as the unique identifier
   */
  async loginOrRegister(deviceId: string, deviceType: DeviceType) {
    // Find or create user by deviceId
    const user = await this.userService.findOrCreateByDeviceId(deviceId, deviceType);

    // For mobile devices, invalidate previous tokens (single-device login)
    if (deviceType === DeviceType.IOS || deviceType === DeviceType.ANDROID) {
      await this.tokenService.invalidateMobileTokens(deviceId, deviceType);
    }

    // Generate tokens with userId
    const accessToken = await this.tokenService.generateAccessToken(
      deviceId,
      deviceType,
      user._id.toString(),
      UserType.USER,
    );

    const refreshToken = await this.tokenService.generateRefreshToken(
      deviceId,
      deviceType,
      user._id.toString(),
      UserType.USER,
    );

    return {
      user: {
        _id: user._id,
        deviceId: user.deviceId,
        deviceType: user.deviceType,
        settings: user.settings,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token using refresh token
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

    if (payload.deviceId !== deviceId) {
      throw new UnauthorizedException('Device ID mismatch');
    }

    if (payload.userType !== UserType.USER) {
      throw new UnauthorizedException('Invalid user type');
    }

    // Verify token exists in database
    const token = await this.tokenService.findToken(refreshToken, TokenType.REFRESH);
    if (!token) {
      throw new UnauthorizedException('Refresh token not found or invalidated');
    }

    // Generate new access token
    const accessToken = await this.tokenService.generateAccessToken(
      deviceId,
      token.deviceType,
      payload.userId,
      UserType.USER,
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
        UserType.USER,
      );
    }

    return {
      accessToken,
      refreshToken: finalRefreshToken,
    };
  }

  /**
   * Logout user (invalidate tokens for device)
   */
  async logout(userId: string, deviceId: string): Promise<void> {
    await this.tokenService.invalidateUserDeviceTokens(userId, deviceId);
  }
}
