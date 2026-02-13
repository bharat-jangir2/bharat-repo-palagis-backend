import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Truck, TruckDocument } from '../entities/truck.entity';
// TODO: Add User entity when ready
// import { User, UserDocument } from '../entities/user.entity';
import { NotificationsService } from './notifications.service';

@Injectable()
export class TruckNotificationsCronService {
  private readonly logger = new Logger(TruckNotificationsCronService.name);

  // Radius in meters (e.g. 5 km = 5000 meters)
  private readonly NEARBY_RADIUS_METERS = 5000;

  constructor(
    @InjectModel(Truck.name) private readonly truckModel: Model<TruckDocument>,
    // TODO: Add User model injection when User entity is ready
    // @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Run every 5 minutes - adjust pattern as needed
  @Cron(CronExpression.EVERY_5_MINUTES)
  async sendNearbyTruckNotifications() {
    this.logger.log('Starting cron: sendNearbyTruckNotifications');

    try {
      // 1. Load active trucks that are not deleted
      const trucks = await this.truckModel.find({
        isDeleted: false,
        isActive: true,
      }).lean();

      if (!trucks || trucks.length === 0) {
        this.logger.log('No active trucks found for notifications');
        return;
      }

      this.logger.log(`Processing ${trucks.length} truck(s) for nearby notifications`);

      // 2. Process each truck
      for (const truck of trucks) {
        try {
          await this.processTruck(truck);
        } catch (error) {
          this.logger.error(
            `Error processing notifications for truck ${truck._id} (${truck.truckName})`,
            (error as any)?.stack || error,
          );
        }
      }

      this.logger.log('Completed cron: sendNearbyTruckNotifications');
    } catch (error) {
      this.logger.error('Error in sendNearbyTruckNotifications cron', (error as any)?.stack || error);
    }
  }

  private async processTruck(truck: any) {
    if (!truck.location || !Array.isArray(truck.location.coordinates)) {
      this.logger.warn(`Truck ${truck._id} has no valid location, skipping`);
      return;
    }

    const [longitude, latitude] = truck.location.coordinates;

    // TODO: Implement user fetching logic when User entity is ready
    // 3. Find nearby users using $nearSphere on 2dsphere index
    // const nearbyUsers = await this.userModel.find({
    //   isDeleted: false,
    //   isActive: true,
    //   location: {
    //     $nearSphere: {
    //       $geometry: {
    //         type: 'Point',
    //         coordinates: [longitude, latitude],
    //       },
    //       $maxDistance: this.NEARBY_RADIUS_METERS,
    //     },
    //   },
    // })
    //   .select({ fcmTokens: 1, email: 1, firstName: 1, lastName: 1 })
    //   .lean();

    // if (!nearbyUsers || nearbyUsers.length === 0) {
    //   this.logger.log(
    //     `No nearby users found for truck ${truck._id} (${truck.truckName})`,
    //   );
    //   return;
    // }

    // TODO: Collect FCM tokens from nearby users
    // 4. Collect FCM tokens (deduplicated)
    // const tokensSet = new Set<string>();
    // for (const user of nearbyUsers) {
    //   if (Array.isArray(user.fcmTokens)) {
    //     for (const token of user.fcmTokens) {
    //       if (token && token.trim()) {
    //         tokensSet.add(token.trim());
    //       }
    //     }
    //   }
    // }

    // const tokens = Array.from(tokensSet);

    // if (tokens.length === 0) {
    //   this.logger.log(
    //     `Nearby users for truck ${truck._id} have no FCM tokens, skipping`,
    //   );
    //   return;
    // }

    // Temporary: Skip notification until user fetching is implemented
    this.logger.log(
      `TODO: User fetching not implemented yet for truck ${truck._id} (${truck.truckName})`,
    );
    return;

    // TODO: Uncomment when user fetching is implemented
    // this.logger.log(
    //   `Sending notification for truck ${truck._id} (${truck.truckName}) to ${tokens.length} device(s)`,
    // );

    // // 5. Prepare notification content
    // const title = `Truck near you: ${truck.truckName}`;
    // const body = `A truck (${truck.vehicleNumber}) is currently near your location.`;
    // const data = {
    //   truckId: String(truck._id),
    //   truckCode: truck.truckCode || '',
    //   truckName: truck.truckName,
    //   vehicleNumber: truck.vehicleNumber,
    //   type: 'nearby_truck',
    // };

    // // 6. Send notification using existing NotificationsService (handles batching automatically)
    // const result = await this.notificationsService.sendPushNotification(
    //   tokens,
    //   title,
    //   body,
    //   data,
    // );

    // this.logger.log(
    //   `Notification sent for truck ${truck._id}: success=${result.successCount}, failure=${result.failureCount}`,
    // );
  }
}
