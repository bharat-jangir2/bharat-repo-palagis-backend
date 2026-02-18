import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
  Version,
} from '@nestjs/common';
import { TokenService } from '../../services/token.service';
import { RegisterFcmTokenDto } from '../../dtos/register-fcm-token.dto';
import { Public } from '../../decorators/public.decorator';
import { DeviceType } from '../../entities/token.entity';

@Controller('users/auth')
export class UserAuthController {
  constructor(private readonly tokenService: TokenService) {}

  @Public()
  @Post('register-fcm')
  @Version('1')
  async registerFcmToken(
    @Body() dto: RegisterFcmTokenDto,
    @Headers('x-device-id') deviceId: string,
    @Headers('x-device-type') deviceType: string,
  ) {
    // Headers are validated by DeviceHeadersGuard
    // No userId for public user app
    const token = await this.tokenService.registerOrUpdateFcmToken(
      deviceId,
      dto.fcmToken,
      deviceType as DeviceType,
      undefined, // userId is undefined for public users
    );

    return {
      success: true,
      result: {
        deviceId: token.deviceId,
        deviceType: token.deviceType,
        registeredAt: token.createdAt,
      },
    };
  }
}
