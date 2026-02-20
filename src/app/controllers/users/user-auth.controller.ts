import {
  Controller,
  Post,
  Body,
  Headers,
  Request,
  HttpCode,
  HttpStatus,
  Version,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { UserAuthService } from '../../services/user-auth.service';
import { UserService } from '../../services/user.service';
import { TokenService } from '../../services/token.service';
import { RegisterFcmTokenDto } from '../../dtos/register-fcm-token.dto';
import { RefreshTokenDto } from '../../dtos/refresh-token.dto';
import { Public } from '../../decorators/public.decorator';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { DeviceType, UserType } from '../../entities/token.entity';

@Controller('users/auth')
export class UserAuthController {
  constructor(
    private readonly userAuthService: UserAuthService,
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Login or auto-register user by deviceId
   * No credentials required - deviceId from headers acts as identifier
   */
  @Public()
  @Post('login')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async login(
    @Headers('x-device-id') deviceId: string,
    @Headers('x-device-type') deviceType: string,
  ) {
    // Headers are validated by DeviceHeadersGuard
    const result = await this.userAuthService.loginOrRegister(
      deviceId,
      deviceType as DeviceType,
    );
    return {
      result,
      userMessage: 'Login successful',
      userMessageCode: 'LOGIN_SUCCESS',
      developerMessage: 'User authenticated successfully',
    };
  }

  /**
   * Refresh access token using refresh token
   */
  @Public()
  @Post('refresh-token')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @Headers('x-device-id') deviceId: string,
  ) {
    const finalDeviceId = deviceId || dto.deviceId;

    if (!finalDeviceId) {
      throw new BadRequestException('Device ID is required in header or body');
    }

    const result = await this.userAuthService.refreshToken(
      dto.refreshToken,
      finalDeviceId,
    );
    return {
      result,
      userMessage: 'Token refreshed successfully',
      userMessageCode: 'TOKEN_REFRESHED',
      developerMessage: 'Access token refreshed successfully',
    };
  }

  /**
   * Logout user (invalidate tokens for device)
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Request() req,
    @Headers('x-device-id') deviceId: string,
  ) {
    const { userId, userType } = req.user;

    if (userType !== UserType.USER) {
      throw new BadRequestException('Invalid user token');
    }

    await this.userAuthService.logout(userId, deviceId);

    return {
      userMessage: 'Logged out successfully',
      userMessageCode: 'LOGOUT_SUCCESS',
      developerMessage: 'Logged out successfully',
    };
  }

  /**
   * Register FCM token for push notifications
   */
  @UseGuards(JwtAuthGuard)
  @Post('register-fcm')
  @Version('1')
  async registerFcmToken(
    @Request() req,
    @Body() dto: RegisterFcmTokenDto,
    @Headers('x-device-id') deviceId: string,
    @Headers('x-device-type') deviceType: string,
  ) {
    const { userId, userType } = req.user;

    if (!userId || userType !== UserType.USER) {
      throw new BadRequestException('Invalid user token');
    }

    // Update FCM token for user
    await this.userService.updateFcmToken(userId, dto.fcmToken);

    // Also store in token service for device-based notifications
    const token = await this.tokenService.registerOrUpdateFcmToken(
      deviceId,
      dto.fcmToken,
      deviceType as DeviceType,
      userId,
    );

    return {
      result: {
        deviceId: token.deviceId,
        deviceType: token.deviceType,
        registeredAt: token.createdAt,
      },
      userMessage: 'FCM token registered successfully',
      userMessageCode: 'FCM_REGISTERED',
      developerMessage: 'FCM token registered successfully',
    };
  }
}
