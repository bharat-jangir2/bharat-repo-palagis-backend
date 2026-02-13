import { Injectable, UnauthorizedException } from '@nestjs/common';
import { verify } from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';
import { DeviceType, UserType, TokenType } from '../entities/token.entity';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminLoginDto } from '../dtos/super-admin-login.dto';
import { SuperAdminChangePasswordDto } from '../dtos/super-admin-change-password.dto';

@Injectable()
export class SuperAdminAuthService {
  constructor(
    private readonly tokenService: TokenService,
    private readonly superAdminService: SuperAdminService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    dto: SuperAdminLoginDto & { deviceId: string; deviceType: DeviceType },
  ) {
    const admin = await this.superAdminService.validateAdmin(
      dto.email,
      dto.password,
    );

    const userId = admin._id.toString();
    const deviceId = dto.deviceId;
    const deviceType = dto.deviceType ?? DeviceType.WEB;

    const accessToken = await this.tokenService.generateAccessToken(
      deviceId,
      deviceType,
      userId,
      UserType.SUPER_ADMIN,
    );

    const refreshToken = await this.tokenService.generateRefreshToken(
      deviceId,
      deviceType,
      userId,
      UserType.SUPER_ADMIN,
    );

    await this.superAdminService.updateLastLogin(userId);

    const loginResponse = {
      admin: {
        _id: admin._id,
        email: admin.email,
        fullName: admin.fullName,
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
   * Logout super admin from a specific device (does NOT affect other devices).
   */
  async logout(userId: string, deviceId: string): Promise<void> {
    await this.tokenService.invalidateUserDeviceTokens(userId, deviceId);
  }

  /**
   * Refresh access token using refresh token for super admin.
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

    if (payload.userType !== UserType.SUPER_ADMIN) {
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

    // Verify token belongs to super admin
    if (token.userId !== payload.userId || token.userType !== UserType.SUPER_ADMIN) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new access token and refresh token with same userId and userType
    // This will update the token entity in the database
    const accessToken = await this.tokenService.generateAccessToken(
      deviceId,
      token.deviceType,
      payload.userId,
      UserType.SUPER_ADMIN,
    );

    const newRefreshToken = await this.tokenService.generateRefreshToken(
      deviceId,
      token.deviceType,
      payload.userId,
      UserType.SUPER_ADMIN,
    );

    return {
      userMessage: 'Token refreshed successfully',
      userMessageCode: 'TOKEN_REFRESHED',
      developerMessage: 'Token refreshed successfully',
      result: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    };
  }

  /**
   * Change password for super admin and logout from all devices.
   */
  async changePassword(
    userId: string,
    dto: SuperAdminChangePasswordDto,
  ): Promise<void> {
    await this.superAdminService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );

    // Invalidate all tokens for this super admin after password change
    await this.tokenService.invalidateAllUserTokens(userId);
  }
}

