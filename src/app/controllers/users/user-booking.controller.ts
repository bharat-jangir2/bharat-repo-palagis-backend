import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  Headers,
  Version,
  UseGuards,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { TruckBookingService } from '../../services/truck-booking.service';
import { CreateTruckBookingDto } from '../../dtos/create-truck-booking.dto';
import { UserType } from '../../entities/token.entity';
import { TruckBookingStatus } from '../../entities/truck-booking.entity';

@Controller('users/bookings')
@UseGuards(JwtAuthGuard)
export class UserBookingController {
  constructor(private readonly truckBookingService: TruckBookingService) {}

  /**
   * Create a new truck booking
   */
  @Post()
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  async createBooking(
    @Request() req,
    @Headers('x-device-id') deviceId: string,
    @Body() createDto: CreateTruckBookingDto,
  ) {
    const { userId, userType } = req.user;

    if (!userId || userType !== UserType.USER) {
      throw new UnauthorizedException('Invalid user token');
    }

    const booking = await this.truckBookingService.create(userId, deviceId, createDto);

    return {
      result: {
        _id: booking._id,
        requestId: booking.requestId,
        type: booking.type,
        fullName: booking.fullName,
        phone: booking.phone,
        email: booking.email,
        eventLocation: booking.eventLocation,
        bookingDate: booking.bookingDate,
        bookingTime: booking.bookingTime,
        bookingNote: booking.bookingNote,
        status: booking.status,
        createdAt: booking.createdAt,
      },
      userMessage: 'Booking created successfully',
      userMessageCode: 'BOOKING_CREATED',
      developerMessage: 'Truck booking created successfully',
    };
  }

  /**
   * Get all bookings for the logged-in user
   */
  @Get()
  @Version('1')
  async getMyBookings(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: TruckBookingStatus,
  ) {
    const { userId, userType } = req.user;

    if (!userId || userType !== UserType.USER) {
      throw new UnauthorizedException('Invalid user token');
    }

    const bookings = await this.truckBookingService.findByUserId(
      userId,
      page,
      limit,
      status,
    );

    return {
      ...bookings,
      userMessage: '',
      userMessageCode: 'BOOKINGS_FETCHED',
      developerMessage: 'User bookings fetched successfully',
    };
  }

  /**
   * Get booking details by ID
   */
  @Get(':bookingId')
  @Version('1')
  async getBooking(@Request() req, @Param('bookingId') bookingId: string) {
    const { userId, userType } = req.user;

    if (!userId || userType !== UserType.USER) {
      throw new UnauthorizedException('Invalid user token');
    }

    const booking = await this.truckBookingService.findOneForUser(
      bookingId,
      userId,
    );

    return {
      result: booking,
      userMessage: '',
      userMessageCode: 'BOOKING_FETCHED',
      developerMessage: 'Booking details fetched successfully',
    };
  }
}
