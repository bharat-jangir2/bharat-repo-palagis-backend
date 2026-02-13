import {
  Body,
  Controller,
  Headers,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SuperAdminAuthService } from '../../services/super-admin-auth.service';
import { SuperAdminLoginDto } from '../../dtos/super-admin-login.dto';
import { SuperAdminChangePasswordDto } from '../../dtos/super-admin-change-password.dto';
import { RefreshTokenDto } from '../../dtos/refresh-token.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Public } from '../../decorators/public.decorator';
import { DeviceType } from '../../entities/token.entity';

@Controller('super-admin/auth')
export class SuperAdminAuthController {
  constructor(
    private readonly superAdminAuthService: SuperAdminAuthService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: SuperAdminLoginDto,
    @Headers('x-device-id') deviceId: string,
    @Headers('x-device-type') deviceType: string,
  ) {
    if (!deviceId || !deviceType) {
      throw new UnauthorizedException(
        'Device ID and Device Type are required in headers',
      );
    }

    if (!Object.values(DeviceType).includes(deviceType as DeviceType)) {
      throw new UnauthorizedException('Invalid device type');
    }

    return await this.superAdminAuthService.login({
      ...dto,
      deviceId,
      deviceType: deviceType as DeviceType,
    });
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Headers('x-device-id') deviceId: string,
  ) {
    // Use deviceId from header if provided, otherwise use from body
    const finalDeviceId = deviceId || refreshTokenDto.deviceId;

    if (!finalDeviceId) {
      throw new UnauthorizedException('Device ID is required');
    }

    return await this.superAdminAuthService.refreshToken(
      refreshTokenDto.refreshToken,
      finalDeviceId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Request() req,
    @Headers('x-device-id') deviceId: string,
    @Headers('x-device-type') deviceType: string,
  ) {
    // Try to get userId from authenticated user, but don't fail if token is invalid
    const userId = req.user?.userId;

    // If we have userId and deviceId, invalidate tokens
    // If token is invalid/missing, we still return success (idempotent logout)
    if (userId && deviceId) {
      try {
        await this.superAdminAuthService.logout(userId, deviceId);
      } catch (error) {
        // Even if logout fails (e.g., tokens already deleted), return success
        // This makes logout idempotent
      }
    }

    // Always return success, even if token was invalid or tokens not found
    return {
      userMessage: 'Logged out successfully',
      userMessageCode: 'LOGOUT_SUCCESS',
      developerMessage: 'Logged out successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req,
    @Body() dto: SuperAdminChangePasswordDto,
  ) {
    const { userId } = req.user;

    if (!userId) {
      throw new UnauthorizedException('Invalid super admin token');
    }

    await this.superAdminAuthService.changePassword(userId, dto);
    return {
      userMessage:
        'Password changed successfully. All sessions have been logged out.',
      userMessageCode: 'PASSWORD_CHANGED',
      developerMessage: 'Password changed and all tokens invalidated',
    };
  }
}

