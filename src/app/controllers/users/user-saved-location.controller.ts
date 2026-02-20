import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  Headers,
  Version,
  UseGuards,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { SavedLocationService } from '../../services/saved-location.service';
import { CreateSavedLocationDto } from '../../dtos/create-saved-location.dto';
import { UpdateSavedLocationDto } from '../../dtos/update-saved-location.dto';
import { UserType } from '../../entities/token.entity';

@Controller('users/saved-locations')
@UseGuards(JwtAuthGuard)
export class UserSavedLocationController {
  constructor(private readonly savedLocationService: SavedLocationService) {}

  /**
   * Create a new saved location
   */
  @Post()
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  async createSavedLocation(
    @Request() req,
    @Headers('x-device-id') deviceId: string,
    @Body() createDto: CreateSavedLocationDto,
  ) {
    const { userId, userType } = req.user;

    if (!userId || userType !== UserType.USER) {
      throw new UnauthorizedException('Invalid user token');
    }

    const location = await this.savedLocationService.create(
      userId,
      deviceId,
      createDto,
    );

    return {
      result: {
        _id: location._id,
        locationName: location.locationName,
        location: location.location,
        type: location.type,
        alertConfig: location.alertConfig,
        createdAt: location.createdAt,
      },
      userMessage: 'Location saved successfully',
      userMessageCode: 'LOCATION_SAVED',
      developerMessage: 'Saved location created successfully',
    };
  }

  /**
   * Get all saved locations for the logged-in user
   */
  @Get()
  @Version('1')
  async getMySavedLocations(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const { userId, userType } = req.user;

    if (!userId || userType !== UserType.USER) {
      throw new UnauthorizedException('Invalid user token');
    }

    const locations = await this.savedLocationService.findAllByUserId(
      userId,
      page,
      limit,
    );

    return {
      ...locations,
      userMessage: '',
      userMessageCode: 'LOCATIONS_FETCHED',
      developerMessage: 'Saved locations fetched successfully',
    };
  }

  /**
   * Get a saved location by ID
   */
  @Get(':locationId')
  @Version('1')
  async getSavedLocation(
    @Request() req,
    @Param('locationId') locationId: string,
  ) {
    const { userId, userType } = req.user;

    if (!userId || userType !== UserType.USER) {
      throw new UnauthorizedException('Invalid user token');
    }

    const location = await this.savedLocationService.findOneForUser(
      locationId,
      userId,
    );

    return {
      result: location,
      userMessage: '',
      userMessageCode: 'LOCATION_FETCHED',
      developerMessage: 'Saved location fetched successfully',
    };
  }

  /**
   * Update a saved location
   */
  @Put(':locationId')
  @Version('1')
  async updateSavedLocation(
    @Request() req,
    @Param('locationId') locationId: string,
    @Body() updateDto: UpdateSavedLocationDto,
  ) {
    const { userId, userType } = req.user;

    if (!userId || userType !== UserType.USER) {
      throw new UnauthorizedException('Invalid user token');
    }

    const location = await this.savedLocationService.update(
      locationId,
      userId,
      updateDto,
    );

    return {
      result: {
        _id: location._id,
        locationName: location.locationName,
        location: location.location,
        type: location.type,
        alertConfig: location.alertConfig,
        updatedAt: location.updatedAt,
      },
      userMessage: 'Location updated successfully',
      userMessageCode: 'LOCATION_UPDATED',
      developerMessage: 'Saved location updated successfully',
    };
  }

  /**
   * Delete a saved location
   */
  @Delete(':locationId')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async deleteSavedLocation(
    @Request() req,
    @Param('locationId') locationId: string,
  ) {
    const { userId, userType } = req.user;

    if (!userId || userType !== UserType.USER) {
      throw new UnauthorizedException('Invalid user token');
    }

    await this.savedLocationService.delete(locationId, userId);

    return {
      userMessage: 'Location deleted successfully',
      userMessageCode: 'LOCATION_DELETED',
      developerMessage: 'Saved location deleted successfully',
    };
  }
}
