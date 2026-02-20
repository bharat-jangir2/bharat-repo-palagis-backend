import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../entities/user.entity';
import { DeviceType } from '../entities/token.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /**
   * Find user by deviceId or create a new one if not exists
   */
  async findOrCreateByDeviceId(deviceId: string, deviceType?: DeviceType): Promise<UserDocument> {
    let user = await this.userModel.findOne({ deviceId, isDeleted: false });

    if (!user) {
      // Auto-register new user with default settings
      user = await this.userModel.create({
        deviceId,
        deviceType,
        settings: {
          notificationEnabled: false,
          locationEnabled: false,
        },
        isDeleted: false,
      });
    }

    return user;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ _id: id, isDeleted: false });
  }

  /**
   * Find user by deviceId
   */
  async findByDeviceId(deviceId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ deviceId, isDeleted: false });
  }

  /**
   * Get user settings
   */
  async getSettings(userId: string) {
    const user = await this.userModel.findOne({ _id: userId, isDeleted: false });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      settings: user.settings,
    };
  }

  /**
   * Update user settings
   */
  async updateSettings(
    userId: string, 
    settings: { notificationEnabled?: boolean; locationEnabled?: boolean }
  ) {
    const user = await this.userModel.findOne({ _id: userId, isDeleted: false });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (settings.notificationEnabled !== undefined) {
      updateData['settings.notificationEnabled'] = settings.notificationEnabled;
    }
    if (settings.locationEnabled !== undefined) {
      updateData['settings.locationEnabled'] = settings.locationEnabled;
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { returnDocument: 'after' },
    );

    return {
      settings: updatedUser?.settings,
    };
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string) {
    const user = await this.userModel.findOne(
      { _id: userId, isDeleted: false },
      { deviceId: 1, deviceType: 1, settings: 1, createdAt: 1, updatedAt: 1 }
    );
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
