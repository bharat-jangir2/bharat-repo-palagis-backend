import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateDriverDto } from '../dtos/create-driver.dto';
import { UpdateDriverDto } from '../dtos/update-driver.dto';
import { Driver, DriverDocument } from '../entities/driver.entity';
import { Truck, TruckDocument } from '../entities/truck.entity';

@Injectable()
export class DriverService {
  constructor(
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
    @InjectModel(Truck.name) private truckModel: Model<TruckDocument>,
  ) {}

  async create(createDriverDto: CreateDriverDto) {
    // Check if driver with same email or phone already exists
    const existingDriver = await this.driverModel.findOne({
      $or: [
        { email: createDriverDto.email },
        { phone: createDriverDto.phone },
      ],
      isDeleted: false,
    });

    if (existingDriver) {
      throw new ConflictException('Driver with this email or phone already exists');
    }

    // Validate truck exists only if truckId is provided
    if (createDriverDto.truckId) {
      const truck = await this.truckModel.findOne({ 
        _id: createDriverDto.truckId, 
        isDeleted: false 
      }).exec();
      
      if (!truck) {
        throw new NotFoundException(`Truck with ID ${createDriverDto.truckId} not found`);
      }

      // Check if truck is already assigned to another non-deleted driver
      const existingDriverForTruck = await this.driverModel.findOne({
        truckId: new Types.ObjectId(createDriverDto.truckId),
        isDeleted: false,
      }).exec();

      if (existingDriverForTruck) {
        throw new ConflictException('This truck is already assigned to another driver');
      }
    }

    // Create driver
    const createdDriver = await this.driverModel.create({
      fullName: createDriverDto.fullName,
      email: createDriverDto.email,
      phone: createDriverDto.phone,
      licenseNumber: createDriverDto.licenseNumber,
      address: createDriverDto.address,
      truckId: createDriverDto.truckId ? new Types.ObjectId(createDriverDto.truckId) : undefined,
      isActive: createDriverDto.isActive ?? true,
      isDeleted: false,
    });

    const result = await this.driverModel.aggregate([
      { $match: { _id: createdDriver._id } },
      {
        $project: {
          _id: 1,
          fullName: 1,
          email: 1,
          phone: 1,
          licenseNumber: 1,
          address: 1,
          truckId: { $toString: '$truckId' },
          isActive: 1,
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

    const result = await this.driverModel.aggregate([
      { $match: { isDeleted: false } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limitNumber },
            {
              $project: {
                _id: 1,
                fullName: 1,
                email: 1,
                phone: 1,
                licenseNumber: 1,
                address: 1,
                truckId: { $toString: '$truckId' },
                isActive: 1,
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
    const result = await this.driverModel.aggregate([
      { $match: { _id: new Types.ObjectId(id), isDeleted: false } },
      {
        $project: {
          _id: 1,
          fullName: 1,
          email: 1,
          phone: 1,
          licenseNumber: 1,
          address: 1,
          truckId: { $toString: '$truckId' },
          isActive: 1,
          isDeleted: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    if (!result || result.length === 0) {
      throw new NotFoundException(`Driver with ID ${id} not found`);
    }

    return result[0];
  }

  async update(id: string, updateDriverDto: UpdateDriverDto) {
    // If truckId is being updated, validate it (only if provided)
    if (updateDriverDto.truckId) {
      const truck = await this.truckModel.findOne({ 
        _id: updateDriverDto.truckId, 
        isDeleted: false 
      }).exec();
      if (!truck) {
        throw new NotFoundException(`Truck with ID ${updateDriverDto.truckId} not found`);
      }

      // Check if new truck is already assigned to another non-deleted driver (excluding current driver)
      const existingDriverForTruck = await this.driverModel.findOne({
        truckId: new Types.ObjectId(updateDriverDto.truckId),
        isDeleted: false,
        _id: { $ne: new Types.ObjectId(id) }, // Exclude current driver
      }).exec();

      if (existingDriverForTruck) {
        throw new ConflictException('This truck is already assigned to another driver');
      }
    }

    // Build update object, only including provided fields
    const updateData: any = {};
    if (updateDriverDto.fullName !== undefined) updateData.fullName = updateDriverDto.fullName;
    if (updateDriverDto.email !== undefined) updateData.email = updateDriverDto.email;
    if (updateDriverDto.phone !== undefined) updateData.phone = updateDriverDto.phone;
    if (updateDriverDto.licenseNumber !== undefined) updateData.licenseNumber = updateDriverDto.licenseNumber;
    if (updateDriverDto.address !== undefined) updateData.address = updateDriverDto.address;
    if (updateDriverDto.truckId !== undefined) {
      updateData.truckId = updateDriverDto.truckId ? new Types.ObjectId(updateDriverDto.truckId) : null;
    }
    if (updateDriverDto.isActive !== undefined) updateData.isActive = updateDriverDto.isActive;

    const driver = await this.driverModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        updateData,
        {
          returnDocument: 'after',
          runValidators: true,
        },
      )
      .exec();

    if (!driver) {
      throw new NotFoundException(`Driver with ID ${id} not found`);
    }

    const result = await this.driverModel.aggregate([
      { $match: { _id: driver._id } },
      {
        $project: {
          _id: 1,
          fullName: 1,
          email: 1,
          phone: 1,
          licenseNumber: 1,
          address: 1,
          truckId: { $toString: '$truckId' },
          isActive: 1,
          isDeleted: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    return result[0];
  }

  async remove(id: string): Promise<void> {
    const driver = await this.driverModel.findOne({ 
      _id: id, 
      isDeleted: false 
    }).exec();
    
    if (!driver) {
      throw new NotFoundException(`Driver with ID ${id} not found`);
    }

    // Soft delete - mark as deleted
    await this.driverModel.findByIdAndUpdate(id, {
      isDeleted: true,
    }).exec();

  }

}
