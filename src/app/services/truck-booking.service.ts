import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  TruckBooking,
  TruckBookingDocument,
  TruckBookingStatus,
  TruckBookingType,
} from '../entities/truck-booking.entity';
import { CreateTruckBookingDto } from '../dtos/create-truck-booking.dto';
import { CounterService } from './counter.service';

@Injectable()
export class TruckBookingService {
  constructor(
    @InjectModel(TruckBooking.name)
    private truckBookingModel: Model<TruckBookingDocument>,
    private counterService: CounterService,
  ) {}

  /**
   * Create a new truck booking
   */
  async create(
    userId: string,
    deviceId: string,
    createDto: CreateTruckBookingDto,
  ): Promise<TruckBookingDocument> {
    // Generate request ID with year: REQ-2024-001
    const requestId = await this.counterService.getNextRequestId();

    const booking = await this.truckBookingModel.create({
      requestId,
      userId: new Types.ObjectId(userId),
      deviceId,
      fullName: createDto.fullName,
      phone: createDto.phone,
      email: createDto.email,
      type: createDto.type,
      eventLocation: {
        type: 'Point',
        coordinates: createDto.eventLocation.coordinates,
        address: createDto.eventLocation.address || '',
      },
      bookingDate: createDto.bookingDate,
      bookingTime: createDto.bookingTime,
      bookingNote: createDto.bookingNote,
      status: TruckBookingStatus.PENDING,
      isDeleted: false,
    });

    return booking;
  }

  /**
   * Find booking by ID
   */
  async findById(bookingId: string): Promise<TruckBookingDocument | null> {
    if (!Types.ObjectId.isValid(bookingId)) {
      throw new NotFoundException('Invalid booking ID');
    }
    return this.truckBookingModel.findOne({
      _id: bookingId,
      isDeleted: false,
    });
  }

  /**
   * Find all bookings for a user with pagination
   */
  async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 10,
    status?: TruckBookingStatus,
  ) {
    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.max(1, Math.min(50, Number(limit) || 10));
    const skip = (pageNumber - 1) * limitNumber;

    const matchConditions: any = {
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    };

    if (status) {
      matchConditions.status = status;
    }

    const [bookings, totalItems] = await Promise.all([
      this.truckBookingModel
        .find(matchConditions)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .select({
          requestId: 1,
          type: 1,
          fullName: 1,
          phone: 1,
          email: 1,
          eventLocation: 1,
          bookingDate: 1,
          bookingTime: 1,
          bookingNote: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .lean(),
      this.truckBookingModel.countDocuments(matchConditions),
    ]);

    const totalPages = Math.ceil(totalItems / limitNumber);

    return {
      result: bookings,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        totalItems,
        totalPages,
      },
    };
  }

  /**
   * Get booking details by ID (for user - only their own bookings)
   */
  async findOneForUser(
    bookingId: string,
    userId: string,
  ): Promise<TruckBookingDocument> {
    if (!Types.ObjectId.isValid(bookingId)) {
      throw new NotFoundException('Invalid booking ID');
    }

    const booking = await this.truckBookingModel.findOne({
      _id: bookingId,
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  /**
   * Get all truck bookings with filters and meta statistics
   */
  async getAllBookings(
    page: number = 1,
    limit: number = 10,
    type?: TruckBookingType,
    status?: TruckBookingStatus,
    search?: string,
  ) {
    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.max(1, Math.min(100, Number(limit) || 10));
    const skip = (pageNumber - 1) * limitNumber;

    // Base match conditions for result list - only non-deleted bookings
    const resultMatchConditions: any = {
      isDeleted: false,
    };

    // Add type filter if provided (for result list)
    if (type) {
      resultMatchConditions.type = type;
    }

    // Add status filter if provided (for result list)
    if (status) {
      resultMatchConditions.status = status;
    }

    // Add search filter if provided (searches across fullName, email, and eventLocation.address)
    if (search) {
      resultMatchConditions.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'eventLocation.address': { $regex: search, $options: 'i' } },
      ];
    }

    // Base match conditions for meta statistics - filtered by type if provided
    // NOTE: Meta stats are NOT filtered by search - they show overall statistics
    const metaMatchConditions: any = {
      isDeleted: false,
    };

    // Add type filter if provided (for meta statistics)
    if (type) {
      metaMatchConditions.type = type;
    }

    // Search filter is NOT applied to meta statistics - only to result list

    // Parallel queries for bookings and statistics
    const [
      bookings,
      totalItems,
      totalBookings,
      pendingCount,
      inProgressCount,
      completedCount,
    ] = await Promise.all([
      // Get paginated bookings (with type and status filters)
      this.truckBookingModel
        .find(resultMatchConditions)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .select({
          _id: 1,
          requestId: 1,
          userId: 1,
          deviceId: 1,
          fullName: 1,
          phone: 1,
          email: 1,
          type: 1,
          eventLocation: 1,
          bookingDate: 1,
          bookingTime: 1,
          bookingNote: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .lean(),
      // Total count with filters (for pagination)
      this.truckBookingModel.countDocuments(resultMatchConditions),
      // Total bookings count (filtered by type if provided)
      this.truckBookingModel.countDocuments(metaMatchConditions),
      // Pending bookings count (filtered by type if provided)
      this.truckBookingModel.countDocuments({
        ...metaMatchConditions,
        status: TruckBookingStatus.PENDING,
      }),
      // In progress bookings count (filtered by type if provided)
      this.truckBookingModel.countDocuments({
        ...metaMatchConditions,
        status: TruckBookingStatus.IN_PROGRESS,
      }),
      // Completed bookings count (filtered by type if provided)
      this.truckBookingModel.countDocuments({
        ...metaMatchConditions,
        status: TruckBookingStatus.COMPLETED,
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limitNumber);

    return {
      result: bookings,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        totalItems,
        totalPages,
      },
      meta: {
        totalBookings,
        pendingBookings: pendingCount,
        inProgressBookings: inProgressCount,
        completedBookings: completedCount,
      },
    };
  }

  /**
   * Update booking status
   */
  async updateStatus(
    bookingId: string,
    status: TruckBookingStatus,
  ): Promise<TruckBookingDocument> {
    if (!Types.ObjectId.isValid(bookingId)) {
      throw new NotFoundException('Invalid booking ID');
    }

    const booking = await this.truckBookingModel.findOneAndUpdate(
      {
        _id: bookingId,
        isDeleted: false,
      },
      {
        status,
      },
      {
        returnDocument: 'after',
        runValidators: true,
      },
    );

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }
}
