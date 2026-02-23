import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SavedLocation,
  SavedLocationDocument,
} from '../entities/saved-location.entity';
import { CreateSavedLocationDto } from '../dtos/create-saved-location.dto';
import { UpdateSavedLocationDto } from '../dtos/update-saved-location.dto';

@Injectable()
export class SavedLocationService {
  constructor(
    @InjectModel(SavedLocation.name)
    private savedLocationModel: Model<SavedLocationDocument>,
  ) {}

  /**
   * Create a new saved location
   */
  async create(
    userId: string,
    deviceId: string,
    createDto: CreateSavedLocationDto,
  ): Promise<SavedLocationDocument> {
    const savedLocation = await this.savedLocationModel.create({
      userId: new Types.ObjectId(userId),
      deviceId,
      locationName: createDto.locationName,
      location: {
        type: 'Point',
        coordinates: createDto.location.coordinates,
        address: createDto.location.address || '',
      },
      type: createDto.type,
      alertConfig: {
        alertRadius: createDto.alertConfig?.alertRadius ?? 500,
        alertEnabled: createDto.alertConfig?.alertEnabled ?? false,
      },
      isDeleted: false,
    });

    return savedLocation;
  }

  /**
   * Find all saved locations for a user
   */
  async findAllByUserId(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.max(1, Math.min(50, Number(limit) || 20));
    const skip = (pageNumber - 1) * limitNumber;

    const matchConditions = {
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    };

    const [locations, totalItems] = await Promise.all([
      this.savedLocationModel
        .find(matchConditions)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .select({
          locationName: 1,
          location: 1,
          type: 1,
          alertConfig: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .lean(),
      this.savedLocationModel.countDocuments(matchConditions),
    ]);

    const totalPages = Math.ceil(totalItems / limitNumber);

    return {
      result: locations,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        totalItems,
        totalPages,
      },
    };
  }

  /**
   * Find all saved locations with alerts enabled for a user
   */
  async findAlertsByUserId(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.max(1, Math.min(50, Number(limit) || 20));
    const skip = (pageNumber - 1) * limitNumber;

    const matchConditions = {
      userId: new Types.ObjectId(userId),
      isDeleted: false,
      'alertConfig.alertEnabled': true,
    };

    const [locations, totalItems] = await Promise.all([
      this.savedLocationModel
        .find(matchConditions)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .select({
          locationName: 1,
          location: 1,
          type: 1,
          alertConfig: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .lean(),
      this.savedLocationModel.countDocuments(matchConditions),
    ]);

    const totalPages = Math.ceil(totalItems / limitNumber);

    return {
      result: locations,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        totalItems,
        totalPages,
      },
    };
  }

  /**
   * Find a saved location by ID (only for the owner)
   */
  async findOneForUser(
    locationId: string,
    userId: string,
  ): Promise<SavedLocationDocument> {
    if (!Types.ObjectId.isValid(locationId)) {
      throw new NotFoundException('Invalid location ID');
    }

    const location = await this.savedLocationModel.findOne({
      _id: locationId,
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    });

    if (!location) {
      throw new NotFoundException('Saved location not found');
    }

    return location;
  }

  /**
   * Update a saved location
   */
  async update(
    locationId: string,
    userId: string,
    updateDto: UpdateSavedLocationDto,
  ): Promise<SavedLocationDocument> {
    if (!Types.ObjectId.isValid(locationId)) {
      throw new NotFoundException('Invalid location ID');
    }

    const updateData: any = {};

    if (updateDto.locationName !== undefined) {
      updateData.locationName = updateDto.locationName;
    }

    if (updateDto.location !== undefined) {
      updateData.location = {
        type: 'Point',
        coordinates: updateDto.location.coordinates,
        address: updateDto.location.address || '',
      };
    }

    if (updateDto.type !== undefined) {
      updateData.type = updateDto.type;
    }

    if (updateDto.alertConfig !== undefined) {
      if (updateDto.alertConfig.alertRadius !== undefined) {
        updateData['alertConfig.alertRadius'] = updateDto.alertConfig.alertRadius;
      }
      if (updateDto.alertConfig.alertEnabled !== undefined) {
        updateData['alertConfig.alertEnabled'] = updateDto.alertConfig.alertEnabled;
      }
    }

    const location = await this.savedLocationModel.findOneAndUpdate(
      {
        _id: locationId,
        userId: new Types.ObjectId(userId),
        isDeleted: false,
      },
      { $set: updateData },
      { new: true },
    );

    if (!location) {
      throw new NotFoundException('Saved location not found');
    }

    return location;
  }

  /**
   * Delete a saved location (soft delete)
   */
  async delete(locationId: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(locationId)) {
      throw new NotFoundException('Invalid location ID');
    }

    const result = await this.savedLocationModel.findOneAndUpdate(
      {
        _id: locationId,
        userId: new Types.ObjectId(userId),
        isDeleted: false,
      },
      { $set: { isDeleted: true } },
    );

    if (!result) {
      throw new NotFoundException('Saved location not found');
    }
  }
}
