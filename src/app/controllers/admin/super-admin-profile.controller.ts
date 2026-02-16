import {
  Controller,
  Get,
  Put,
  Body,
  Request,
  UseGuards,
  UnauthorizedException,
  Version,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { SuperAdminService } from '../../services/super-admin.service';
import { UpdateSuperAdminProfileDto } from '../../dtos/update-super-admin-profile.dto';
import { UserType } from '../../entities/token.entity';

@Controller('super-admin/profile')
@UseGuards(JwtAuthGuard)
export class SuperAdminProfileController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get()
  @Version('1')
  async getProfile(@Request() req) {
    const { userId, userType } = req.user;

    if (!userId || userType !== UserType.SUPER_ADMIN) {
      throw new UnauthorizedException('Invalid super admin token');
    }

    const profile = await this.superAdminService.getProfile(userId);
    
    return {
      result: {
        _id: profile._id,
        email: profile.email,
        fullName: profile.fullName,
        isActive: profile.isActive,
        lastLoginAt: profile.lastLoginAt,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
      userMessage: 'Profile fetched successfully',
      userMessageCode: 'PROFILE_FETCHED',
      developerMessage: 'Profile fetched successfully',
    };
  }

  @Put()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Request() req,
    @Body() updateDto: UpdateSuperAdminProfileDto,
  ) {
    const { userId, userType } = req.user;

    if (!userId || userType !== UserType.SUPER_ADMIN) {
      throw new UnauthorizedException('Invalid super admin token');
    }

    const updatedProfile = await this.superAdminService.updateProfile(
      userId,
      updateDto.email,
      updateDto.fullName,
    );

    return {
      result: {
        _id: updatedProfile._id,
        email: updatedProfile.email,
        fullName: updatedProfile.fullName,
        isActive: updatedProfile.isActive,
        lastLoginAt: updatedProfile.lastLoginAt,
        createdAt: updatedProfile.createdAt,
        updatedAt: updatedProfile.updatedAt,
      },
      userMessage: 'Profile updated successfully',
      userMessageCode: 'PROFILE_UPDATED',
      developerMessage: 'Profile updated successfully',
    };
  }
}
