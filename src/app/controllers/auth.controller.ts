import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dtos/login.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Public } from '../decorators/public.decorator';
import { DeviceType } from '../entities/token.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(
      loginDto.deviceId,
      loginDto.deviceType || DeviceType.UNKNOWN,
    );
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    if (!refreshTokenDto.deviceId) {
      throw new UnauthorizedException('Device ID is required');
    }
    return this.authService.refreshToken(
      refreshTokenDto.refreshToken,
      refreshTokenDto.deviceId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req) {
    // Try to get deviceId from authenticated user, but don't fail if token is invalid
    const deviceId = req.user?.deviceId;

    // If we have deviceId, invalidate tokens
    // If token is invalid/missing, we still return success (idempotent logout)
    if (deviceId) {
      try {
        await this.authService.logout(deviceId);
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
