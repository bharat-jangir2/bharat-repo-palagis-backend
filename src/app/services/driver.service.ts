import { Injectable, NotFoundException, ConflictException, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { CreateDriverDto } from '../dtos/create-driver.dto';
import { UpdateDriverDto } from '../dtos/update-driver.dto';
import { Driver, DriverDocument, AccountStatus, DutyStatus } from '../entities/driver.entity';
import { Truck, TruckDocument } from '../entities/truck.entity';
import { DriverStatusLogService } from './driver-status-log.service';
import { CounterService } from './counter.service';
import { TokenService } from './token.service';
import { EmailService } from './email.service';
import { DriverRegistrationTemplate } from '../templates/email/driver-registration.template';
import { EmailQueueService } from '../../queues/email/email-queue.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from "crypto";

@Injectable()
export class DriverService {
  private readonly logger = new Logger(DriverService.name);

  constructor(
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
    @InjectModel(Truck.name) private truckModel: Model<TruckDocument>,
    private driverStatusLogService: DriverStatusLogService,
    private counterService: CounterService,
    private tokenService: TokenService,
    private emailService: EmailService,
    private configService: ConfigService,
    private readonly emailQueueService: EmailQueueService,
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

    // Handle truckId: empty string means null (unassigned), otherwise validate if provided
    const truckIdValue = createDriverDto.truckId === '' ? null : createDriverDto.truckId;
    
    // Validate truck exists only if truckId is provided and not empty
    if (truckIdValue) {
      const truck = await this.truckModel.findOne({ 
        _id: truckIdValue, 
        isDeleted: false 
      }).exec();
      
      if (!truck) {
        throw new NotFoundException(`Truck with ID ${truckIdValue} not found`);
      }

      // Check if truck is already assigned to another non-deleted driver
      const existingDriverForTruck = await this.driverModel.findOne({
        truckId: new Types.ObjectId(truckIdValue),
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
    
    // Store passcode as plain text (no hashing)

    // Create driver
    const createdDriver = await this.driverModel.create({
      driverCode,
      fullName: createDriverDto.fullName,
      email: createDriverDto.email,
      phone: createDriverDto.phone,
      truckId: truckIdValue ? new Types.ObjectId(truckIdValue) : undefined,
      passcode: plainPasscode, // Store as plain text
      isActive: true, // Default to active
      accountStatus: createDriverDto.accountStatus,
      dutyStatus: createDriverDto.dutyStatus || DutyStatus.OFFDUTY, // Default to offduty
      isDeleted: false,
    });

    // Sync: If truckId is set, update truck's driverId
    if (truckIdValue) {
      await this.truckModel.findByIdAndUpdate(
        truckIdValue,
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

    // Enqueue welcome email to driver (non-blocking - don't fail if email queueing fails)
    try {
      const correlationId = uuidv4();

      await this.emailQueueService.enqueueEmail({
        correlationId,
        to: createdDriver.email,
        subject: DriverRegistrationTemplate.getSubject(),
        templateKey: 'driver_registration',
        templateData: {
          driverName: createdDriver.fullName,
          driverCode: createdDriver.driverCode,
          passcode: plainPasscode,
        },
      });

      this.logger.log(
        `Welcome email job enqueued for driver ${createdDriver.email} (correlationId=${correlationId})`,
      );
    } catch (error) {
      // Log error but don't fail driver creation if queueing fails
      this.logger.error(
        `Error enqueuing welcome email job for driver ${createdDriver.email}: ${error.message}`,
      );
    }

    // Return result without passcode (excluded from create response)
    return result[0];
  }

  /**
   * Shuffle the passcode to avoid predictable pattern
   * @param passcode Passcode to shuffle
   * @returns Shuffled passcode
   */
  private shufflePasscode = (passcode: string): string => {
    const charArray = passcode.split('');
  
    // Fisher–Yates using crypto
    for (let i = charArray.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1); // max is exclusive
      [charArray[i], charArray[j]] = [charArray[j], charArray[i]];
    }
  
    return charArray.join('');
  };
  

  /**
   * Generate a random 6-digit passcode
   */
  private generatePasscode(): string {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$&';
    const all = upper + lower + numbers + special;
  
    const getRandomChar = (chars: string): string =>
      chars[crypto.randomInt(0, chars.length)];
  
    // Ensure required characters
    let passcode =
      getRandomChar(upper) +
      getRandomChar(numbers) +
      getRandomChar(special);
  
    // Fill remaining characters to total length 8
    for (let i = passcode.length; i < 8; i++) {
      passcode += getRandomChar(all);
    }
  
    // Shuffle to remove predictable pattern
    return this.shufflePasscode(passcode);
  }

  /**
   * Regenerate passcode for a driver and send email notification
   * @param driverId Driver ID
   * @returns Updated driver document
   */
  async regeneratePasscode(driverId: string): Promise<DriverDocument> {
    if (!Types.ObjectId.isValid(driverId)) {
      throw new NotFoundException('Invalid driver ID');
    }

    // Find driver
    const driver = await this.driverModel.findOne({
      _id: driverId,
      isDeleted: false,
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Generate new passcode
    const newPasscode = this.generatePasscode();

    // Update driver with new passcode
    const updatedDriver = await this.driverModel.findByIdAndUpdate(
      driverId,
      { passcode: newPasscode },
      { returnDocument: 'after', runValidators: true },
    );

    if (!updatedDriver) {
      throw new NotFoundException('Driver not found after update');
    }

    // Send email with new passcode via queue (non-blocking)
    try {
      const correlationId = uuidv4();

      await this.emailQueueService.enqueueEmail({
        correlationId,
        to: updatedDriver.email,
        templateKey: 'driver_passcode_regenerated',
        templateData: {
          driverName: updatedDriver.fullName,
          driverCode: updatedDriver.driverCode,
          passcode: newPasscode,
        },
      });

      this.logger.log(
        `Passcode regeneration email job enqueued for driver ${updatedDriver.email} (correlationId=${correlationId})`,
      );
    } catch (error) {
      // Log error but don't fail passcode regeneration if queueing fails
      this.logger.error(
        `Error enqueuing passcode regeneration email job for driver ${updatedDriver.email}: ${error.message}`,
      );
    }

    return updatedDriver;
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

    // Build match conditions for filtering
    const matchConditions: any = { isDeleted: false };
    const statsMatchConditions: any = { isDeleted: false }; // For stats, don't apply status/search filters

    // Filter by status (active/inactive) using accountStatus - only if status is provided and not empty
    if (status && status.trim() === 'active') {
      matchConditions.accountStatus = AccountStatus.ACTIVE;
    } else if (status && status.trim() === 'inactive') {
      matchConditions.accountStatus = AccountStatus.INACTIVE;
    }

    // Calculate statistics in parallel (without filters for accurate counts)
    const [totalDrivers, activeDrivers, inactiveDrivers] = await Promise.all([
      this.driverModel.countDocuments(statsMatchConditions),
      this.driverModel.countDocuments({ ...statsMatchConditions, accountStatus: AccountStatus.ACTIVE }),
      this.driverModel.countDocuments({ ...statsMatchConditions, accountStatus: AccountStatus.INACTIVE }),
    ]);

    // If search is provided, add search matching to matchConditions
    if (search && typeof search === 'string' && search.trim().length > 0) {
      // We escape the dot so 'alex@gmail.com' searches for a literal '.'
      const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Use ^ to match from the start if you want more strictness, 
      // or leave as is for "contains" matching.
      const searchRegex = { $regex: sanitizedSearch, $options: 'i' };
      
      matchConditions.$or = [
        { email: searchRegex },
        { phone: searchRegex },
        { fullName: searchRegex },
      ];
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
              passcode: 1, // Include passcode in listing
              truck: {
                $cond: {
                  if: { $ifNull: ['$truck._id', false] },
                  then: {
                    _id: { $toString: '$truck._id' },
                    truckCode: '$truck.truckCode',
                    vehicleNumber: '$truck.vehicleNumber',
                    status: '$truck.truckStatus',
                  },
                  else: null,
                },
              },
              isActive: 1,
              accountStatus: 1,
              dutyStatus: 1,
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
      meta: {
        totalDrivers,
        activeDrivers,
        inactiveDrivers,
      },
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        totalItems,
        totalPages,
      },
    };
  }

  async findAllDriversForDropdown(
    page: number = 1,
    limit: number = 100,
    search?: string,
  ) {
    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.max(1, Math.min(100, Number(limit) || 100)); // Max 100 items per page
    const skip = (pageNumber - 1) * limitNumber;

    // Build match conditions - only show active, non-deleted drivers
    const matchConditions: any = { 
      isDeleted: false,
      accountStatus: AccountStatus.ACTIVE 
    };

    // If search is provided, add search matching for fullName
    if (search && typeof search === 'string' && search.trim().length > 0) {
      // Sanitize search input - escape special regex characters
      const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = { $regex: sanitizedSearch, $options: 'i' };
      
      matchConditions.fullName = searchRegex;
    }

    // Simple aggregation for dropdown - only _id and fullName
    const pipeline: any[] = [
      { $match: matchConditions },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limitNumber },
            {
              $project: {
                _id: 1,
                fullName: 1,
              },
            },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ];

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
    // Validate ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Driver with ID "${id}" not found`);
    }

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
          passcode: 1, // Include passcode in get by id
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

    // Handle truckId: empty string means null (unassigned), otherwise validate if provided
    let truckIdValue: string | null | undefined = undefined;
    if (updateDriverDto.truckId !== undefined) {
      truckIdValue = updateDriverDto.truckId === '' ? null : updateDriverDto.truckId;
      
      // If truckId is being updated and has a value, validate it in parallel
      if (truckIdValue) {
        // Parallel validation: check truck exists and if it's already assigned
        const [truck, existingDriverForTruck] = await Promise.all([
          this.truckModel.findOne({ 
            _id: truckIdValue, 
            isDeleted: false 
          }).exec(),
          this.driverModel.findOne({
            truckId: new Types.ObjectId(truckIdValue),
            isDeleted: false,
            _id: { $ne: new Types.ObjectId(id) }, // Exclude current driver
          }).exec(),
        ]);

        if (!truck) {
          throw new NotFoundException(`Truck with ID ${truckIdValue} not found`);
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
      updateData.truckId = truckIdValue ? new Types.ObjectId(truckIdValue) : null;
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
      const newTruckId = truckIdValue;
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

    const wasActive = currentDriver.accountStatus === AccountStatus.ACTIVE;
    const isBecomingInactive = accountStatus === AccountStatus.INACTIVE && wasActive;
    const assignedTruckId = currentDriver.truckId?.toString() || null;

    // Build update data
    const updateData: any = { accountStatus };

    // If driver is becoming INACTIVE, also clear truckId and set dutyStatus to OFFDUTY
    if (isBecomingInactive) {
      updateData.truckId = null;
      updateData.dutyStatus = DutyStatus.OFFDUTY;
    }

    // Log status change if status actually changed
    if (accountStatus !== currentDriver.accountStatus) {
      await this.driverStatusLogService.logStatusChange(id, accountStatus);
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

    // If driver became inactive, free the assigned truck and logout from all devices
    if (isBecomingInactive) {
      // Free the truck (clear driverId)
      if (assignedTruckId) {
        await this.truckModel.findByIdAndUpdate(
          assignedTruckId,
          { driverId: null },
          { returnDocument: 'after' },
        ).exec();
      }

      // Logout driver from all devices (invalidate all tokens)
      await this.tokenService.invalidateAllUserTokens(id);
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

    // Compare provided passcode with stored plain text passcode
    if (driver.passcode !== passcode) {
      throw new UnauthorizedException('Invalid driver code or passcode');
    }

    return driver;
  }

}
