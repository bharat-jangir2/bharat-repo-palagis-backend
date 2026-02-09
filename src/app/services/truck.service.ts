import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateTruckDto } from '../dtos/create-truck.dto';
import { UpdateTruckDto } from '../dtos/update-truck.dto';
import { Truck, TruckDocument } from '../entities/truck.entity';

@Injectable()
export class TruckService {
  constructor(
    @InjectModel(Truck.name) private truckModel: Model<TruckDocument>,
  ) {}

  async create(createTruckDto: CreateTruckDto) {
    const existingTruck = await this.truckModel.findOne({
      vehicleNumber: createTruckDto.vehicleNumber,
      isDeleted: false,
    });

    if (existingTruck) {
      throw new ConflictException('Truck with this vehicle number already exists');
    }

    const truckData = {
      vehicleNumber: createTruckDto.vehicleNumber,
      truckName: createTruckDto.truckName,
      location: {
        type: 'Point',
        coordinates: createTruckDto.coordinates, // [longitude, latitude]
      },
      isOnline: createTruckDto.isOnline ?? false,
      isDeleted: false,
    };

    const createdTruck = await this.truckModel.create(truckData);
    
    const result = await this.truckModel.aggregate([
      { $match: { _id: createdTruck._id } },
      {
        $project: {
          _id: 0,
          id: { $toString: '$_id' },
          vehicleNumber: 1,
          truckName: 1,
          location: 1,
          latitude: { $arrayElemAt: ['$location.coordinates', 1] },
          longitude: { $arrayElemAt: ['$location.coordinates', 0] },
          isOnline: 1,
          currentDriver: { $ifNull: [{ $toString: '$currentDriver' }, null] },
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
                vehicleNumber: 1,
                truckName: 1,
                location: 1,
                isOnline: 1,
                currentDriver: { $ifNull: [{ $toString: '$currentDriver' }, null] },
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
          vehicleNumber: 1,
          truckName: 1,
          location: 1,
          isOnline: 1,
          currentDriver: { $ifNull: [{ $toString: '$currentDriver' }, null] },
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
    const updateData: any = { ...updateTruckDto };
    
    // Handle location update if coordinates provided
    if (updateTruckDto.coordinates) {
      updateData.location = {
        type: 'Point',
        coordinates: updateTruckDto.coordinates,
      };
      delete updateData.coordinates;
    }

    const truck = await this.truckModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      updateData,
      { new: true, runValidators: true },
    ).exec();

    if (!truck) {
      throw new NotFoundException(`Truck with ID ${id} not found`);
    }

    const result = await this.truckModel.aggregate([
      { $match: { _id: truck._id } },
      {
        $project: {
          _id: 1,
          vehicleNumber: 1,
          truckName: 1,
          location: 1,
          isOnline: 1,
          currentDriver: { $ifNull: [{ $toString: '$currentDriver' }, null] },
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
      currentDriver: null, // Clear driver reference when truck is deleted
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
          _id: 0,
          id: { $toString: '$_id' },
          vehicleNumber: 1,
          truckName: 1,
          location: 1,
          latitude: { $arrayElemAt: ['$location.coordinates', 1] },
          longitude: { $arrayElemAt: ['$location.coordinates', 0] },
          isOnline: 1,
          currentDriver: { $ifNull: [{ $toString: '$currentDriver' }, null] },
          isDeleted: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);
  }
}
