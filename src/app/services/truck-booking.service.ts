import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  TruckBooking,
  TruckBookingDocument,
  TruckBookingStatus,
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
      bookingDate: new Date(createDto.bookingDate),
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
}
