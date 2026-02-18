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
import { DriverAuthService } from '../../services/driver-auth.service';
import { DriverLoginDto } from '../../dtos/driver-login.dto';
import { RefreshTokenDto } from '../../dtos/refresh-token.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Public } from '../../decorators/public.decorator';
import { DeviceType } from '../../entities/token.entity';

@Controller('drivers/auth')
export class DriverAuthController {
  constructor(
    private readonly driverAuthService: DriverAuthService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: DriverLoginDto,
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

    return await this.driverAuthService.login({
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

    return await this.driverAuthService.refreshToken(
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
    const userType = req.user?.userType;

    // If we have userId and it's a driver, invalidate tokens
    // If token is invalid/missing, we still return success (idempotent logout)
    if (userId && userType === 'DRIVER' && deviceId) {
      try {
        await this.driverAuthService.logout(userId, deviceId);
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
}
