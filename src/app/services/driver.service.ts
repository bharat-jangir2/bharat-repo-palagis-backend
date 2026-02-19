import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { CreateDriverDto } from '../dtos/create-driver.dto';
import { UpdateDriverDto } from '../dtos/update-driver.dto';
import { Driver, DriverDocument, AccountStatus, DutyStatus } from '../entities/driver.entity';
import { Truck, TruckDocument } from '../entities/truck.entity';
import { DriverStatusLogService } from './driver-status-log.service';
import { CounterService } from './counter.service';

@Injectable()
export class DriverService {
  constructor(
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
    @InjectModel(Truck.name) private truckModel: Model<TruckDocument>,
    private driverStatusLogService: DriverStatusLogService,
    private counterService: CounterService,
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

    // Generate driver code
    const driverCode = await this.counterService.getNextDriverCode();

    // Generate random 6-digit passcode
    const plainPasscode = this.generatePasscode();
    
    // Hash the passcode before storing
    const hashedPasscode = await bcrypt.hash(plainPasscode, 10);

    // Create driver
    const createdDriver = await this.driverModel.create({
      driverCode,
      fullName: createDriverDto.fullName,
      email: createDriverDto.email,
      phone: createDriverDto.phone,
      truckId: createDriverDto.truckId ? new Types.ObjectId(createDriverDto.truckId) : undefined,
      passcode: hashedPasscode,
      isActive: true, // Default to active
      accountStatus: createDriverDto.accountStatus,
      dutyStatus: createDriverDto.dutyStatus || DutyStatus.OFFDUTY, // Default to offduty
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
          driverCode: 1,
          fullName: 1,
          email: 1,
          phone: 1,
          licenseNumber: 1,
          address: 1,
          truckId: { $toString: '$truckId' },
          isActive: 1,
          accountStatus: 1,
          dutyStatus: 1,
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
    status?: string,
    search?: string,
  ) {
    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.max(1, Math.min(100, Number(limit) || 10)); // Max 100 items per page
    const skip = (pageNumber - 1) * limitNumber;

    // Build match conditions
    const matchConditions: any = { isDeleted: false };

    // Filter by status (active/inactive) - only if status is provided and not empty
    if (status && status.trim() === 'active') {
      matchConditions.isActive = true;
    } else if (status && status.trim() === 'inactive') {
      matchConditions.isActive = false;
    }

    // Build aggregation pipeline
    const pipeline: any[] = [
      { $match: matchConditions },
      // Always lookup truck
      {
        $lookup: {
          from: 'trucks',
          localField: 'truckId',
          foreignField: '_id',
          as: 'truck',
          pipeline: [
      { $match: { isDeleted: false } },
          ],
        },
      },
      // Unwind truck array to object (preserve null for drivers without trucks)
      {
        $unwind: {
          path: '$truck',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    // If search is provided, add search matching after lookup/unwind
    if (search && typeof search === 'string' && search.trim().length > 0) {
      // Additional sanitization - escape any remaining special characters
      const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = { $regex: sanitizedSearch, $options: 'i' };
      
      pipeline.push({
        $match: {
          $or: [
            { email: searchRegex },
            { phone: searchRegex },
            { fullName: searchRegex },
          ],
        },
      });
    }

    // Add pagination and projection
    pipeline.push({
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limitNumber },
            {
              $project: {
                _id: 1,
                driverCode: 1,
              fullName: 1,
                email: 1,
                phone: 1,
                licenseNumber: 1,
                address: 1,
              truck: {
                $cond: {
                  if: { $ifNull: ['$truck._id', false] },
                  then: {
                    _id: { $toString: '$truck._id' },
                    truckCode: '$truck.truckCode',
                    vehicleNumber: '$truck.vehicleNumber',
                    truckName: '$truck.truckName',
                    vehicleModel: '$truck.vehicleModel',
                    location: '$truck.location',
                    truckStatus: '$truck.truckStatus',
                    isActive: '$truck.isActive',
                  },
                  else: null,
                },
              },
                isActive: 1,
              accountStatus: 1,
                isDeleted: 1,
                createdAt: 1,
                updatedAt: 1, 
              },
            },
          ],
          total: [{ $count: 'count' }],
        },
    });

    const result = await this.driverModel.aggregate(pipeline);

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
      // Lookup truck
      {
        $lookup: {
          from: 'trucks',
          localField: 'truckId',
          foreignField: '_id',
          as: 'truck',
          pipeline: [
            { $match: { isDeleted: false } },
          ],
        },
      },
      // Unwind truck array to object
      {
        $unwind: {
          path: '$truck',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          driverCode: 1,
          fullName: 1,
          email: 1,
          phone: 1,
          licenseNumber: 1,
          address: 1,
          truck: {
            $cond: {
              if: { $ifNull: ['$truck._id', false] },
              then: {
                _id: { $toString: '$truck._id' },
                truckCode: '$truck.truckCode',
                vehicleNumber: '$truck.vehicleNumber',
                truckName: '$truck.truckName',
                vehicleModel: '$truck.vehicleModel',
                location: '$truck.location',
                truckStatus: '$truck.truckStatus',
                isActive: '$truck.isActive',
              },
              else: null,
            },
          },
          isActive: 1,
          accountStatus: 1,
          dutyStatus: 1,
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
    const oldAccountStatus = currentDriver.accountStatus; // Store old status

    // If truckId is being updated, validate it in parallel (only if provided)
    if (updateDriverDto.truckId !== undefined) {
      if (updateDriverDto.truckId) {
        // Parallel validation: check truck exists and if it's already assigned
        const [truck, existingDriverForTruck] = await Promise.all([
          this.truckModel.findOne({ 
            _id: updateDriverDto.truckId, 
            isDeleted: false 
          }).exec(),
          this.driverModel.findOne({
            truckId: new Types.ObjectId(updateDriverDto.truckId),
            isDeleted: false,
            _id: { $ne: new Types.ObjectId(id) }, // Exclude current driver
          }).exec(),
        ]);

        if (!truck) {
          throw new NotFoundException(`Truck with ID ${updateDriverDto.truckId} not found`);
        }

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
    if (updateDriverDto.accountStatus !== undefined) {
      updateData.accountStatus = updateDriverDto.accountStatus;
      // Log status change asynchronously if status actually changed (don't block on logging)
      if (updateDriverDto.accountStatus !== oldAccountStatus) {
        this.driverStatusLogService.logStatusChange(id, updateDriverDto.accountStatus).catch(() => {
          // Silently fail logging - don't block the update
        });
      }
    }
    if (updateDriverDto.dutyStatus !== undefined) {
      updateData.dutyStatus = updateDriverDto.dutyStatus;
    }
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

    // Sync: Update truck's driverId when driver's truckId changes (in parallel)
    if (updateDriverDto.truckId !== undefined) {
      const newTruckId = updateDriverDto.truckId;
      const truckSyncPromises: Promise<any>[] = [];
      
      // If old truck exists and is different from new truck, unassign it
      if (oldTruckId && oldTruckId !== newTruckId) {
        truckSyncPromises.push(
          this.truckModel.findByIdAndUpdate(
            oldTruckId,
            { driverId: null },
            { returnDocument: 'after' },
          ).exec()
        );
      }
      
      // If new truck is assigned and different from old truck, update its driverId
      if (newTruckId && newTruckId !== oldTruckId) {
        truckSyncPromises.push(
          this.truckModel.findByIdAndUpdate(
            newTruckId,
            { driverId: new Types.ObjectId(id) },
            { returnDocument: 'after' },
          ).exec()
        );
      }

      // Execute truck sync operations in parallel
      if (truckSyncPromises.length > 0) {
        await Promise.all(truckSyncPromises);
      }
    }

    const result = await this.driverModel.aggregate([
      { $match: { _id: driver._id } },
      // Lookup truck
      {
        $lookup: {
          from: 'trucks',
          localField: 'truckId',
          foreignField: '_id',
          as: 'truck',
          pipeline: [
            { $match: { isDeleted: false } },
          ],
        },
      },
      // Unwind truck array to object
      {
        $unwind: {
          path: '$truck',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          driverCode: 1,
          fullName: 1,
          email: 1,
          phone: 1,
          licenseNumber: 1,
          address: 1,
          truck: {
            $cond: {
              if: { $ifNull: ['$truck._id', false] },
              then: {
                _id: { $toString: '$truck._id' },
                truckCode: '$truck.truckCode',
                vehicleNumber: '$truck.vehicleNumber',
                truckName: '$truck.truckName',
                vehicleModel: '$truck.vehicleModel',
                location: '$truck.location',
                truckStatus: '$truck.truckStatus',
                isActive: '$truck.isActive',
              },
              else: null,
            },
          },
          isActive: 1,
          accountStatus: 1,
          dutyStatus: 1,
          isDeleted: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    return result[0];
  }

  async updateStatus(id: string, accountStatus: AccountStatus) {
    // Get current driver to check if status is changing
    const currentDriver = await this.driverModel.findOne({ _id: id, isDeleted: false }).exec();
    if (!currentDriver) {
      throw new NotFoundException(`Driver with ID ${id} not found`);
    }

    // Log status change if status actually changed
    if (accountStatus !== currentDriver.accountStatus) {
      await this.driverStatusLogService.logStatusChange(id, accountStatus);
    }

    const driver = await this.driverModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        { accountStatus },
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
      // Lookup truck
      {
        $lookup: {
          from: 'trucks',
          localField: 'truckId',
          foreignField: '_id',
          as: 'truck',
          pipeline: [
            { $match: { isDeleted: false } },
          ],
        },
      },
      // Unwind truck array to object
      {
        $unwind: {
          path: '$truck',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          driverCode: 1,
          fullName: 1,
          email: 1,
          phone: 1,
          licenseNumber: 1,
          address: 1,
          truck: {
            $cond: {
              if: { $ifNull: ['$truck._id', false] },
              then: {
                _id: { $toString: '$truck._id' },
                truckCode: '$truck.truckCode',
                vehicleNumber: '$truck.vehicleNumber',
                truckName: '$truck.truckName',
                vehicleModel: '$truck.vehicleModel',
                location: '$truck.location',
                truckStatus: '$truck.truckStatus',
                isActive: '$truck.isActive',
              },
              else: null,
            },
          },
          isActive: 1,
          accountStatus: 1,
          dutyStatus: 1,
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
    driverCode: string,
    passcode: string,
  ): Promise<DriverDocument> {
    // Find driver by driverCode
    const driver = await this.driverModel.findOne({
      driverCode,
      isDeleted: false,
    }).exec();

    if (!driver || !driver.isActive) {
      throw new UnauthorizedException('Invalid driver code or passcode');
    }

    // Compare provided passcode with stored hashed passcode
    const isValid = await bcrypt.compare(passcode, driver.passcode);
    if (!isValid) {
      throw new UnauthorizedException('Invalid driver code or passcode');
    }

    return driver;
  }

}
