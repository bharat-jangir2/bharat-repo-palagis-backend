import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateTruckDto } from '../dtos/create-truck.dto';
import { UpdateTruckDto } from '../dtos/update-truck.dto';
import { Truck, TruckDocument, TruckStatus } from '../entities/truck.entity';
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
      truckStatus: createTruckDto.truckStatus,
      statusUpdatedAt: new Date(), // Set statusUpdatedAt when truck is created
      isActive: true, // Default to active
      isDeleted: false,
      location: {
        type: 'Point',
        coordinates: [0, 0], // Default location
      },
    };

    // Optional fields
    if (createTruckDto.vehicleModel) {
      truckData.vehicleModel = createTruckDto.vehicleModel;
    }
    if (createTruckDto.driverId) {
      truckData.driverId = new Types.ObjectId(createTruckDto.driverId);
    }

    const createdTruck = await this.truckModel.create(truckData);
    
    // Sync: If driverId is set, update driver's truckId
    if (createTruckDto.driverId) {
      await this.driverModel.findByIdAndUpdate(
        createTruckDto.driverId,
        { truckId: createdTruck._id },
        { returnDocument: 'after' },
      ).exec();
    }
    
    const result = await this.truckModel.aggregate([
      { $match: { _id: createdTruck._id } },
      // Lookup driver
      {
        $lookup: {
          from: 'drivers',
          localField: 'driverId',
          foreignField: '_id',
          as: 'driver',
          pipeline: [
            { $match: { isDeleted: false } },
          ],
        },
      },
      // Unwind driver array to object
      {
        $unwind: {
          path: '$driver',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          id: { $toString: '$_id' },
          truckCode: 1,
          vehicleNumber: 1,
          vehicleModel: 1,
          licensePlate: 1,
          driver: {
            $cond: {
              if: { $ifNull: ['$driver._id', false] },
              then: {
                _id: { $toString: '$driver._id' },
                fullName: '$driver.fullName',
                email: '$driver.email',
                phone: '$driver.phone',
                licenseNumber: '$driver.licenseNumber',
                address: '$driver.address',
                isActive: '$driver.isActive',
                driverStatus: '$driver.driverStatus',
              },
              else: null,
            },
          },
          location: 1,
          latitude: { $arrayElemAt: ['$location.coordinates', 1] },
          longitude: { $arrayElemAt: ['$location.coordinates', 0] },
          isActive: 1,
          truckStatus: 1,
          statusUpdatedAt: 1,
          isDeleted: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    return result[0];
  }

  async findAllTrucks(
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
      // Always lookup driver
      {
        $lookup: {
          from: 'drivers',
          localField: 'driverId',
          foreignField: '_id',
          as: 'driver',
          pipeline: [
            { $match: { isDeleted: false } },
          ],
        },
      },
      // Unwind driver array to object (preserve null for trucks without drivers)
      {
        $unwind: {
          path: '$driver',
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
              { vehicleNumber: searchRegex },
              { licensePlate: searchRegex },
              { vehicleModel: searchRegex },
              { truckCode: searchRegex },
              { 'driver.email': searchRegex },
              { 'driver.phone': searchRegex },
              { 'driver.fullName': searchRegex },
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
              truckCode: 1,
              vehicleNumber: 1,
              truckName: 1,
              vehicleModel: 1,
              licensePlate: 1,
              driver: {
                $cond: {
                  if: { $ifNull: ['$driver._id', false] },
                  then: {
                    _id: { $toString: '$driver._id' },
                    fullName: '$driver.fullName',
                    email: '$driver.email',
                    phone: '$driver.phone',
                    licenseNumber: '$driver.licenseNumber',
                    address: '$driver.address',
                    isActive: '$driver.isActive',
                    driverStatus: '$driver.driverStatus',
                  },
                  else: null,
                },
              },
              location: 1,
              truckStatus: 1,
              statusUpdatedAt: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ],
        total: [{ $count: 'count' }],
      },
    });

    const result = await this.truckModel.aggregate(pipeline);

    const totalItems = result[0]?.total[0]?.count || 0;
    const totalPages = Math.ceil(totalItems / limitNumber);

    return {
      userMessage: '',
      userMessageCode: 'TRUCKS_FETCHED',
      developerMessage: 'Trucks fetched successfully',
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
      // Lookup driver
      {
        $lookup: {
          from: 'drivers',
          localField: 'driverId',
          foreignField: '_id',
          as: 'driver',
          pipeline: [
            { $match: { isDeleted: false } },
          ],
        },
      },
      // Unwind driver array to object
      {
        $unwind: {
          path: '$driver',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          truckCode: 1,
          vehicleNumber: 1,
          vehicleModel: 1,
          licensePlate: 1,
          driver: {
            $cond: {
              if: { $ifNull: ['$driver._id', false] },
              then: {
                _id: { $toString: '$driver._id' },
                fullName: '$driver.fullName',
                email: '$driver.email',
                phone: '$driver.phone',
                licenseNumber: '$driver.licenseNumber',
                address: '$driver.address',
                isActive: '$driver.isActive',
                driverStatus: '$driver.driverStatus',
              },
              else: null,
            },
          },
          location: 1,
          truckStatus: 1,
          statusUpdatedAt: 1,
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

    // Get current truck to find old driverId before update
    const currentTruck = await this.truckModel.findById(id).exec();
    if (!currentTruck) {
      throw new NotFoundException(`Truck with ID ${id} not found`);
    }
    const oldDriverId = currentTruck.driverId?.toString();
    const oldTruckStatus = currentTruck.truckStatus; // Store old status

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
    if (updateTruckDto.licensePlate !== undefined) updateData.licensePlate = updateTruckDto.licensePlate;
    if (updateTruckDto.truckStatus !== undefined) {
      updateData.truckStatus = updateTruckDto.truckStatus;
      // Update statusUpdatedAt when truckStatus changes
      if (updateTruckDto.truckStatus !== oldTruckStatus) {
        updateData.statusUpdatedAt = new Date();
      }
    }
    if (updateTruckDto.vehicleModel !== undefined) updateData.vehicleModel = updateTruckDto.vehicleModel;
    if (updateTruckDto.driverId !== undefined) {
      updateData.driverId = updateTruckDto.driverId ? new Types.ObjectId(updateTruckDto.driverId) : null;
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

    // Sync: Update driver's truckId when truck's driverId changes
    if (updateTruckDto.driverId !== undefined) {
      const newDriverId = updateTruckDto.driverId;
      
      // If old driver exists, unassign them (set their truckId to null)
      if (oldDriverId) {
        await this.driverModel.findByIdAndUpdate(
          oldDriverId,
          { truckId: null },
          { returnDocument: 'after' },
        ).exec();
      }
      
      // If new driver is assigned, update their truckId
      if (newDriverId) {
        await this.driverModel.findByIdAndUpdate(
          newDriverId,
          { truckId: new Types.ObjectId(id) },
          { returnDocument: 'after' },
        ).exec();
      }
    }

    const result = await this.truckModel.aggregate([
      { $match: { _id: truck._id } },
      // Lookup driver
      {
        $lookup: {
          from: 'drivers',
          localField: 'driverId',
          foreignField: '_id',
          as: 'driver',
          pipeline: [
            { $match: { isDeleted: false } },
          ],
        },
      },
      // Unwind driver array to object
      {
        $unwind: {
          path: '$driver',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          truckCode: 1,
          vehicleNumber: 1,
          vehicleModel: 1,
          licensePlate: 1,
          driver: {
            $cond: {
              if: { $ifNull: ['$driver._id', false] },
              then: {
                _id: { $toString: '$driver._id' },
                fullName: '$driver.fullName',
                email: '$driver.email',
                phone: '$driver.phone',
                licenseNumber: '$driver.licenseNumber',
                address: '$driver.address',
                isActive: '$driver.isActive',
                driverStatus: '$driver.driverStatus',
              },
              else: null,
            },
          },
          location: 1,
          truckStatus: 1,
          statusUpdatedAt: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    return result[0];
  }

  async updateTruckStatus(id: string, truckStatus: TruckStatus) {
    // Get current truck to check if status is changing
    const currentTruck = await this.truckModel.findOne({ _id: id, isDeleted: false }).exec();
    if (!currentTruck) {
      throw new NotFoundException(`Truck with ID ${id} not found`);
    }

    const updateData: any = { truckStatus };
    // Update statusUpdatedAt when truckStatus changes
    if (truckStatus !== currentTruck.truckStatus) {
      updateData.statusUpdatedAt = new Date();
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
      // Lookup driver
      {
        $lookup: {
          from: 'drivers',
          localField: 'driverId',
          foreignField: '_id',
          as: 'driver',
          pipeline: [
            { $match: { isDeleted: false } },
          ],
        },
      },
      // Unwind driver array to object
      {
        $unwind: {
          path: '$driver',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          truckCode: 1,
          vehicleNumber: 1,
          vehicleModel: 1,
          licensePlate: 1,
          driver: {
            $cond: {
              if: { $ifNull: ['$driver._id', false] },
              then: {
                _id: { $toString: '$driver._id' },
                fullName: '$driver.fullName',
                email: '$driver.email',
                phone: '$driver.phone',
                licenseNumber: '$driver.licenseNumber',
                address: '$driver.address',
                isActive: '$driver.isActive',
                driverStatus: '$driver.driverStatus',
              },
              else: null,
            },
          },
          location: 1,
          truckStatus: 1,
          statusUpdatedAt: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    return {
      userMessage: 'Truck status updated successfully',
      userMessageCode: 'TRUCK_STATUS_UPDATED',
      developerMessage: `Truck status updated to ${truckStatus}`,
      result: result[0],
    };
  }

  async deleteTruck(id: string): Promise<any> {
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
    return {
      userMessage: 'Truck deleted successfully',
      userMessageCode: 'TRUCK_DELETED',
      developerMessage: `Truck with ID ${id} deleted successfully`,
    }
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
          vehicleModel: 1,
          licensePlate: 1,
          driver: {
            $cond: {
              if: { $ifNull: ['$driver._id', false] },
              then: {
                _id: { $toString: '$driver._id' },
                fullName: '$driver.fullName',
                email: '$driver.email',
                phone: '$driver.phone',
                licenseNumber: '$driver.licenseNumber',
                address: '$driver.address',
                isActive: '$driver.isActive',
                driverStatus: '$driver.driverStatus',
              },
              else: null,
            },
          },
          location: 1,
          truckStatus: 1,
          statusUpdatedAt: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);
  }
}
