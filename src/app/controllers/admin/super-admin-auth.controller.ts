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

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Request() req,
    @Headers('x-device-id') deviceId: string,
    @Headers('x-device-type') deviceType: string,
  ) {
    const { userId } = req.user;

    if (!userId) {
      throw new UnauthorizedException('Invalid super admin token');
    }

    if (!deviceId || !deviceType) {
      throw new UnauthorizedException(
        'Device ID and Device Type are required in headers',
      );
    }

    await this.superAdminAuthService.logout(userId, deviceId);
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

