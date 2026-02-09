import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateDriverDto } from '../dtos/create-driver.dto';
import { UpdateDriverDto } from '../dtos/update-driver.dto';
import { Driver, DriverDocument } from '../entities/driver.entity';
import { DriverResponseDto } from '../dtos/driver-response.dto';
import { Truck, TruckDocument } from '../entities/truck.entity';

@Injectable()
export class DriverService {
  constructor(
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
    @InjectModel(Truck.name) private truckModel: Model<TruckDocument>,
  ) {}

  async create(createDriverDto: CreateDriverDto): Promise<DriverResponseDto> {
    // Check if driver with same email, phone, or license already exists
    const existingDriver = await this.driverModel.findOne({
      $or: [
        { email: createDriverDto.email },
        { phone: createDriverDto.phone },
        { licenseNumber: createDriverDto.licenseNumber },
      ],
      isDeleted: false,
    });

    if (existingDriver) {
      throw new ConflictException('Driver with this email, phone, or license number already exists');
    }

    // Validate truck exists (required)
    const truck = await this.truckModel.findOne({ 
      _id: createDriverDto.truckId, 
      isDeleted: false 
    }).exec();
    
    if (!truck) {
      throw new NotFoundException(`Truck with ID ${createDriverDto.truckId} not found`);
    }

    // Check if truck already has a driver assigned
    if (truck.currentDriver) {
      throw new ConflictException('This truck already has a driver assigned');
    }

    // Create driver
    const createdDriver = await this.driverModel.create({
      ...createDriverDto,
      truckId: new Types.ObjectId(createDriverDto.truckId),
      isDeleted: false,
    });

    // Update truck with current driver reference
    await this.truckModel.findByIdAndUpdate(createDriverDto.truckId, {
      currentDriver: createdDriver._id,
    }).exec();

    const result = await this.driverModel.aggregate([
      { $match: { _id: createdDriver._id } },
      {
        $project: {
          id: { $toString: '$_id' },
          firstName: 1,
          lastName: 1,
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

    return result[0] as DriverResponseDto;
  }

  async findAll(): Promise<DriverResponseDto[]> {
    return this.driverModel.aggregate([
      { $match: { isDeleted: false } },
      {
        $project: {
          id: { $toString: '$_id' },
          firstName: 1,
          lastName: 1,
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
  }

  async findOne(id: string): Promise<DriverResponseDto> {
    const result = await this.driverModel.aggregate([
      { $match: { _id: new Types.ObjectId(id), isDeleted: false } },
      {
        $project: {
          id: { $toString: '$_id' },
          firstName: 1,
          lastName: 1,
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

    return result[0] as DriverResponseDto;
  }

  async update(id: string, updateDriverDto: UpdateDriverDto): Promise<DriverResponseDto> {
    // If truckId is being updated, validate it
    if (updateDriverDto.truckId) {
      const truck = await this.truckModel.findOne({ 
        _id: updateDriverDto.truckId, 
        isDeleted: false 
      }).exec();
      if (!truck) {
        throw new NotFoundException(`Truck with ID ${updateDriverDto.truckId} not found`);
      }

      // Get current driver to update old truck
      const currentDriver = await this.driverModel.findOne({ 
        _id: id, 
        isDeleted: false 
      }).exec();
      if (currentDriver && currentDriver.truckId) {
        // Remove driver from old truck
        await this.truckModel.findByIdAndUpdate(currentDriver.truckId, {
          currentDriver: null,
        }).exec();
      }

      // Check if new truck already has a driver
      if (truck.currentDriver) {
        throw new ConflictException('This truck already has a driver assigned');
      }

      // Update new truck with driver reference
      await this.truckModel.findByIdAndUpdate(updateDriverDto.truckId, {
        currentDriver: new Types.ObjectId(id),
      }).exec();
    }

    const driver = await this.driverModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      {
        ...updateDriverDto,
        truckId: updateDriverDto.truckId ? new Types.ObjectId(updateDriverDto.truckId) : undefined,
      },
      { new: true, runValidators: true },
    ).exec();

    if (!driver) {
      throw new NotFoundException(`Driver with ID ${id} not found`);
    }

    const result = await this.driverModel.aggregate([
      { $match: { _id: driver._id } },
      {
        $project: {
          id: { $toString: '$_id' },
          firstName: 1,
          lastName: 1,
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

    return result[0] as DriverResponseDto;
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

    // Remove driver reference from truck
    if (driver.truckId) {
      await this.truckModel.findByIdAndUpdate(driver.truckId, {
        currentDriver: null,
      }).exec();
    }
  }

}
