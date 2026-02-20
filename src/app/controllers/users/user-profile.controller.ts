import {
  Controller,
  Get,
  Put,
  Body,
  Request,
  Version,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../../services/user.service';
import { UpdateUserSettingsDto } from '../../dtos/update-user-settings.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { UserType } from '../../entities/token.entity';

@Controller('users/profile')
@UseGuards(JwtAuthGuard)
export class UserProfileController {
  constructor(private readonly userService: UserService) {}

  /**
   * Get user profile
   */
  @Get()
  @Version('1')
  async getProfile(@Request() req) {
    const { userId, userType } = req.user;

    if (!userId || userType !== UserType.USER) {
      throw new UnauthorizedException('Invalid user token');
    }

    const profile = await this.userService.getProfile(userId);
    return {
      result: profile,
      userMessage: 'Profile fetched successfully',
      userMessageCode: 'PROFILE_FETCHED',
      developerMessage: 'User profile fetched successfully',
    };
  }

  /**
   * Get user settings
   */
  @Get('settings')
  @Version('1')
  async getSettings(@Request() req) {
    const { userId, userType } = req.user;

    if (!userId || userType !== UserType.USER) {
      throw new UnauthorizedException('Invalid user token');
    }

    const result = await this.userService.getSettings(userId);
    return {
      result: result.settings,
      userMessage: 'Settings fetched successfully',
      userMessageCode: 'SETTINGS_FETCHED',
      developerMessage: 'User settings fetched successfully',
    };
  }

  /**
   * Update user settings
   */
  @Put('settings')
  @Version('1')
  async updateSettings(
    @Request() req,
    @Body() dto: UpdateUserSettingsDto,
  ) {
    const { userId, userType } = req.user;

    if (!userId || userType !== UserType.USER) {
      throw new UnauthorizedException('Invalid user token');
    }

    const result = await this.userService.updateSettings(userId, dto);
    return {
      result: result.settings,
      userMessage: 'Settings updated successfully',
      userMessageCode: 'SETTINGS_UPDATED',
      developerMessage: 'User settings updated successfully',
    };
  }
}
