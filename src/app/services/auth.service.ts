import { Injectable, UnauthorizedException } from '@nestjs/common';
import { verify } from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';
import { DeviceType, TokenType } from '../entities/token.entity';

@Injectable()
export class AuthService {
  constructor(
    private tokenService: TokenService,
    private configService: ConfigService,
  ) {}

  async login(deviceId: string, deviceType: DeviceType) {
    // For mobile devices, invalidate previous tokens (single-device login)
    if (deviceType === DeviceType.IOS || deviceType === DeviceType.ANDROID) {
      await this.tokenService.invalidateMobileTokens(deviceId, deviceType);
    }

    // Generate new tokens
    const accessToken = await this.tokenService.generateAccessToken(deviceId, deviceType);
    const refreshToken = await this.tokenService.generateRefreshToken(deviceId, deviceType);

    return {
      accessToken,
      refreshToken,
      deviceId,
    };
  }

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

    // Verify token exists in database
    const token = await this.tokenService.findToken(refreshToken, TokenType.REFRESH);
    if (!token) {
      throw new UnauthorizedException('Refresh token not found or invalidated');
    }

    // Generate new access token
    const accessToken = await this.tokenService.generateAccessToken(
      deviceId,
      token.deviceType,
    );

    return { accessToken };
  }

  async logout(deviceId: string): Promise<void> {
    await this.tokenService.invalidateDeviceTokens(deviceId);
  }
}
