import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  Version,
  UseGuards,
  UnauthorizedException,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { TruckBookingService } from '../../services/truck-booking.service';
import { TruckBookingFilterDto } from '../../dtos/truck-booking-filter.dto';
import { UpdateBookingStatusDto } from '../../dtos/update-booking-status.dto';
import { UserType } from '../../entities/token.entity';

@Controller('super-admin/bookings')
@UseGuards(JwtAuthGuard)
export class AdminBookingController {
  constructor(private readonly truckBookingService: TruckBookingService) {}

  /**
   * Get all truck booking requests with filters and meta statistics
   */
  @Get()
  @Version('1')
  async getAllBookings(
    @Request() req,
    @Query() filterDto: TruckBookingFilterDto,
  ) {
    const { userType } = req.user;

    if (userType !== UserType.SUPER_ADMIN) {
      throw new UnauthorizedException('Invalid super admin token');
    }

    const bookings = await this.truckBookingService.getAllBookings(
      filterDto.page,
      filterDto.limit,
      filterDto.type,
      filterDto.status,
      filterDto.search,
    );

    return {
      ...bookings,
      userMessage: 'Bookings fetched successfully',
      userMessageCode: 'BOOKINGS_FETCHED',
      developerMessage: 'Truck bookings fetched successfully',
    };
  }

  /**
   * Update booking request status
   */
  @Post(':bookingId/update-status')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async updateBookingStatus(
    @Request() req,
    @Param('bookingId') bookingId: string,
    @Body() updateStatusDto: UpdateBookingStatusDto,
  ) {
    const { userType } = req.user;

    if (userType !== UserType.SUPER_ADMIN) {
      throw new UnauthorizedException('Invalid super admin token');
    }

    const booking = await this.truckBookingService.updateStatus(
      bookingId,
      updateStatusDto.status,
    );

    return {
      result: {
        _id: booking._id,
        requestId: booking.requestId,
        userId: booking.userId,
        deviceId: booking.deviceId,
        fullName: booking.fullName,
        phone: booking.phone,
        email: booking.email,
        type: booking.type,
        eventLocation: booking.eventLocation,
        bookingDate: booking.bookingDate,
        bookingTime: booking.bookingTime,
        bookingNote: booking.bookingNote,
        status: booking.status,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      },
      userMessage: 'Booking status updated successfully',
      userMessageCode: 'BOOKING_STATUS_UPDATED',
      developerMessage: `Booking status updated to ${updateStatusDto.status}`,
    };
  }
}
