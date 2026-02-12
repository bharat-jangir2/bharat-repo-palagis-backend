import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Device, DeviceDocument } from '../entities/device.entity';
import { RegisterDeviceDto } from '../dtos/register-device-dto';

@Injectable()
export class DeviceService {
  constructor(
    @InjectModel(Device.name) private readonly deviceModel: Model<DeviceDocument>,
  ) {}

  async registerOrUpdateDevice(dto: RegisterDeviceDto) {
    const { deviceId, fcmToken, platform, longitude, latitude, userId, isActive } = dto;

    const update: any = {
      fcmToken,
      platform,
    };

    if (typeof isActive === 'boolean') {
      update.isActive = isActive;
    }

    if (longitude != null && latitude != null) {
      update.lastLocation = {
        type: 'Point',
        coordinates: [longitude, latitude],
      };
    }

    if (userId) {
      update.userId = new Types.ObjectId(userId);
    }

    const device = await this.deviceModel
      .findOneAndUpdate(
        { deviceId },
        {
          $set: update,
          $setOnInsert: {
            deviceId,
          },
        },
        {
          upsert: true,
          returnDocument: 'after',
        },
      )
      .lean();

    return device;
  }
}