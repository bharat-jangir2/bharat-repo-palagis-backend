import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { CreateDriverDto } from '../dtos/create-driver.dto';
import { UpdateDriverDto } from '../dtos/update-driver.dto';
import { Driver, DriverDocument, DriverStatus } from '../entities/driver.entity';
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

    // Generate random 6-digit passcode
    const plainPasscode = this.generatePasscode();
    
    // Hash the passcode before storing
    const hashedPasscode = await bcrypt.hash(plainPasscode, 10);

    // Create driver
    const createdDriver = await this.driverModel.create({
      fullName: createDriverDto.fullName,
      email: createDriverDto.email,
      phone: createDriverDto.phone,
      truckId: createDriverDto.truckId ? new Types.ObjectId(createDriverDto.truckId) : undefined,
      passcode: hashedPasscode,
      isActive: true, // Default to active
      driverStatus: createDriverDto.driverStatus,
      isDeleted: false,
    });

    // Sync: If truckId is set, update truck's driverId
    if (createDriverDto.truckId) {
      await this.truckModel.findByIdAndUpdate(
        createDriverDto.truckId,
        { driverId: createdDriver._id },
        { returnDocument: 'after' },
      ).exec();
    }

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
          driverStatus: 1,
          isDeleted: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    // Return result with plain passcode (only in create response, for admin to share with driver)
    // Note: passcode is stored hashed in DB, but we return plain text here since we have it before hashing
    return {
      ...result[0],
      passcode: plainPasscode, // Return plain passcode only on creation
    };
  }

  /**
   * Generate a random 6-digit passcode
   */
  private generatePasscode(): string {
    // Generate random number between 100000 and 999999
    const min = 100000;
    const max = 999999;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
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
          driverStatus: 1,
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
    // Get current driver to find old truckId before update
    const currentDriver = await this.driverModel.findById(id).exec();
    if (!currentDriver) {
      throw new NotFoundException(`Driver with ID ${id} not found`);
    }
    const oldTruckId = currentDriver.truckId?.toString();

    // If truckId is being updated, validate it (only if provided)
    if (updateDriverDto.truckId !== undefined) {
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
    }

    // Build update object, only including provided fields
    const updateData: any = {};
    if (updateDriverDto.fullName !== undefined) updateData.fullName = updateDriverDto.fullName;
    if (updateDriverDto.email !== undefined) updateData.email = updateDriverDto.email;
    if (updateDriverDto.phone !== undefined) updateData.phone = updateDriverDto.phone;
    if (updateDriverDto.driverStatus !== undefined) updateData.driverStatus = updateDriverDto.driverStatus;
    if (updateDriverDto.truckId !== undefined) {
      updateData.truckId = updateDriverDto.truckId ? new Types.ObjectId(updateDriverDto.truckId) : null;
    }

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

    // Sync: Update truck's driverId when driver's truckId changes
    if (updateDriverDto.truckId !== undefined) {
      const newTruckId = updateDriverDto.truckId;
      
      // If old truck exists, unassign it (set its driverId to null)
      if (oldTruckId) {
        await this.truckModel.findByIdAndUpdate(
          oldTruckId,
          { driverId: null },
          { returnDocument: 'after' },
        ).exec();
      }
      
      // If new truck is assigned, update its driverId
      if (newTruckId) {
        await this.truckModel.findByIdAndUpdate(
          newTruckId,
          { driverId: new Types.ObjectId(id) },
          { returnDocument: 'after' },
        ).exec();
      }
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
          driverStatus: 1,
          isDeleted: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    return result[0];
  }

  async updateStatus(id: string, driverStatus: DriverStatus) {
    const driver = await this.driverModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        { driverStatus },
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
          driverStatus: 1,
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

  /**
   * Validate driver credentials (phone/email + passcode)
   * Returns the driver document if valid, throws UnauthorizedException if invalid
   */
  async validateDriver(
    phoneOrEmail: string,
    passcode: string,
  ): Promise<DriverDocument> {
    // Find driver by phone or email
    const driver = await this.driverModel.findOne({
      $or: [
        { phone: phoneOrEmail },
        { email: phoneOrEmail },
      ],
      isDeleted: false,
    }).exec();

    if (!driver || !driver.isActive) {
      throw new UnauthorizedException('Invalid phone/email or passcode');
    }

    // Compare provided passcode with stored hashed passcode
    const isValid = await bcrypt.compare(passcode, driver.passcode);
    if (!isValid) {
      throw new UnauthorizedException('Invalid phone/email or passcode');
    }

    return driver;
  }

}
