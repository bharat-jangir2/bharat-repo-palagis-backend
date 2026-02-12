import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateTruckDto } from '../dtos/create-truck.dto';
import { UpdateTruckDto } from '../dtos/update-truck.dto';
import { Truck, TruckDocument } from '../entities/truck.entity';
import { Driver, DriverDocument } from '../entities/driver.entity';
import { CounterService } from './counter.service';

@Injectable()
export class TruckService {
  constructor(
    @InjectModel(Truck.name) private truckModel: Model<TruckDocument>,
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
    private counterService: CounterService,
  ) {}

  async create(createTruckDto: CreateTruckDto) {
    // Check if vehicle number already exists
    const existingTruckByVehicleNumber = await this.truckModel.findOne({
      vehicleNumber: createTruckDto.vehicleNumber,
      isDeleted: false,
    });

    if (existingTruckByVehicleNumber) {
      throw new ConflictException('Truck with this vehicle number already exists');
    }

    // Check if license plate already exists
    const existingTruckByLicense = await this.truckModel.findOne({
      licensePlate: createTruckDto.licensePlate,
      isDeleted: false,
    });

    if (existingTruckByLicense) {
      throw new ConflictException('Truck with this license plate already exists');
    }

    // Validate driver exists if driverId is provided
    if (createTruckDto.driverId) {
      const driver = await this.driverModel.findOne({
        _id: createTruckDto.driverId,
        isDeleted: false,
      }).exec();

      if (!driver) {
        throw new NotFoundException(`Driver with ID ${createTruckDto.driverId} not found`);
      }

      // Check if driver is already assigned to another truck
      const existingTruckForDriver = await this.truckModel.findOne({
        driverId: new Types.ObjectId(createTruckDto.driverId),
        isDeleted: false,
      }).exec();

      if (existingTruckForDriver) {
        throw new ConflictException('This driver is already assigned to another truck');
      }
    }

    // Generate auto-incrementing truck code
    const truckCode = await this.counterService.getNextTruckCode();

    const truckData: any = {
      truckCode,
      vehicleNumber: createTruckDto.vehicleNumber,
      licensePlate: createTruckDto.licensePlate,
      vehicleModel: createTruckDto.vehicleModel,
      truckName: createTruckDto.truckName,
      driverId: createTruckDto.driverId ? new Types.ObjectId(createTruckDto.driverId) : undefined,
      isActive: createTruckDto.isActive ?? true,
      isOnline: createTruckDto.isOnline ?? false,
      isDeleted: false,
    };

    // Add location only if coordinates provided
    if (createTruckDto.coordinates) {
      truckData.location = {
        type: 'Point',
        coordinates: createTruckDto.coordinates, // [longitude, latitude]
      };
    } else {
      truckData.location = {
        type: 'Point',
        coordinates: [0, 0], // Default location
      };
    }

    const createdTruck = await this.truckModel.create(truckData);
    
    const result = await this.truckModel.aggregate([
      { $match: { _id: createdTruck._id } },
      {
        $project: {
          _id: 0,
          id: { $toString: '$_id' },
          truckCode: 1,
          vehicleNumber: 1,
          truckName: 1,
          vehicleModel: 1,
          licensePlate: 1,
          driverId: { $toString: '$driverId' },
          location: 1,
          latitude: { $arrayElemAt: ['$location.coordinates', 1] },
          longitude: { $arrayElemAt: ['$location.coordinates', 0] },
          isActive: 1,
          isOnline: 1,
          isDeleted: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    return result[0];
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
  ) {
    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.max(1, Math.min(100, Number(limit) || 10)); // Max 100 items per page
    const skip = (pageNumber - 1) * limitNumber;

    const result = await this.truckModel.aggregate([
      { $match: { isDeleted: false } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limitNumber },
            {
              $project: {
                truckCode: 1,
                vehicleNumber: 1,
                truckName: 1,
                vehicleModel: 1,
                licensePlate: 1,
                driverId: { $toString: '$driverId' },
                location: 1,
                isActive: 1,
                isOnline: 1,
                isDeleted: 1,
                createdAt: 1,
                updatedAt: 1,
              },
            },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ]);

    const totalItems = result[0]?.total[0]?.count || 0;
    const totalPages = Math.ceil(totalItems / limitNumber);

    return {
      result: result[0]?.data || [],
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        totalItems,
        totalPages,
      },
    };
  }

  async findOne(id: string) {
    const result = await this.truckModel.aggregate([
      { $match: { _id: new Types.ObjectId(id), isDeleted: false } },
      {
        $project: {
          _id: 1,
          truckCode: 1,
          vehicleNumber: 1,
          truckName: 1,
          vehicleModel: 1,
          licensePlate: 1,
          driverId: { $toString: '$driverId' },
          location: 1,
          isActive: 1,
          isOnline: 1,
          isDeleted: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    if (!result || result.length === 0) {
      throw new NotFoundException(`Truck with ID ${id} not found`);
    }

    return result[0];
  }

  async update(id: string, updateTruckDto: UpdateTruckDto) {
    // Check if license plate is being updated and if it conflicts
    if (updateTruckDto.licensePlate) {
      const existingTruckByLicense = await this.truckModel.findOne({
        licensePlate: updateTruckDto.licensePlate,
        isDeleted: false,
        _id: { $ne: new Types.ObjectId(id) },
      }).exec();

      if (existingTruckByLicense) {
        throw new ConflictException('Truck with this license plate already exists');
      }
    }

    // Validate driver exists if driverId is being updated
    if (updateTruckDto.driverId !== undefined) {
      if (updateTruckDto.driverId) {
        const driver = await this.driverModel.findOne({
          _id: updateTruckDto.driverId,
          isDeleted: false,
        }).exec();

        if (!driver) {
          throw new NotFoundException(`Driver with ID ${updateTruckDto.driverId} not found`);
        }

        // Check if driver is already assigned to another truck (excluding current truck)
        const existingTruckForDriver = await this.truckModel.findOne({
          driverId: new Types.ObjectId(updateTruckDto.driverId),
          isDeleted: false,
          _id: { $ne: new Types.ObjectId(id) },
        }).exec();

        if (existingTruckForDriver) {
          throw new ConflictException('This driver is already assigned to another truck');
        }
      }
    }

    // Build update object, only including provided fields
    const updateData: any = {};
    if (updateTruckDto.vehicleNumber !== undefined) updateData.vehicleNumber = updateTruckDto.vehicleNumber;
    if (updateTruckDto.truckName !== undefined) updateData.truckName = updateTruckDto.truckName;
    if (updateTruckDto.vehicleModel !== undefined) updateData.vehicleModel = updateTruckDto.vehicleModel;
    if (updateTruckDto.licensePlate !== undefined) updateData.licensePlate = updateTruckDto.licensePlate;
    if (updateTruckDto.driverId !== undefined) {
      updateData.driverId = updateTruckDto.driverId ? new Types.ObjectId(updateTruckDto.driverId) : null;
    }
    if (updateTruckDto.isActive !== undefined) updateData.isActive = updateTruckDto.isActive;
    if (updateTruckDto.isOnline !== undefined) updateData.isOnline = updateTruckDto.isOnline;
    
    // Handle location update if coordinates provided
    if (updateTruckDto.coordinates) {
      updateData.location = {
        type: 'Point',
        coordinates: updateTruckDto.coordinates,
      };
    }

    const truck = await this.truckModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        updateData,
        {
          returnDocument: 'after',
          runValidators: true,
        },
      )
      .exec();

    if (!truck) {
      throw new NotFoundException(`Truck with ID ${id} not found`);
    }

    const result = await this.truckModel.aggregate([
      { $match: { _id: truck._id } },
      {
        $project: {
          _id: 1,
          truckCode: 1,
          vehicleNumber: 1,
          truckName: 1,
          vehicleModel: 1,
          licensePlate: 1,
          driverId: { $toString: '$driverId' },
          location: 1,
          isActive: 1,
          isOnline: 1,
          isDeleted: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    return result[0];
  }

  async remove(id: string): Promise<void> {
    const truck = await this.truckModel.findOne({ 
      _id: id, 
      isDeleted: false 
    }).exec();
    
    if (!truck) {
      throw new NotFoundException(`Truck with ID ${id} not found`);
    }

    // Soft delete - mark as deleted instead of removing
    await this.truckModel.findByIdAndUpdate(id, {
      isDeleted: true,
    }).exec();
  }

  // Find trucks near a location (for proximity queries)
  async findNear(longitude: number, latitude: number, maxDistance: number = 10000) {
    return this.truckModel.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          distanceField: 'distance',
          maxDistance: maxDistance,
          spherical: true,
        },
      },
      { $match: { isDeleted: false } },
      {
        $project: {
          _id: 1,
          truckCode: 1,
          vehicleNumber: 1,
          truckName: 1,
          vehicleModel: 1,
          licensePlate: 1,
          driverId: { $toString: '$driverId' },
          location: 1,
          isActive: 1,
          isOnline: 1,
          isDeleted: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);
  }
}
