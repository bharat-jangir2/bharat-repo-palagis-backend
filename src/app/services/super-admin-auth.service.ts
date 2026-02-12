import { Injectable } from '@nestjs/common';
import { TokenService } from './token.service';
import { DeviceType, UserType } from '../entities/token.entity';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminLoginDto } from '../dtos/super-admin-login.dto';
import { SuperAdminChangePasswordDto } from '../dtos/super-admin-change-password.dto';

@Injectable()
export class SuperAdminAuthService {
  constructor(
    private readonly tokenService: TokenService,
    private readonly superAdminService: SuperAdminService,
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

