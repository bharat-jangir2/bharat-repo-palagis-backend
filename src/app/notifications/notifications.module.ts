import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FirebaseModule } from '../firebase/firebase.module';
import { NotificationsService } from './notifications.service';
import { TruckNotificationsCronService } from './truck-notifications-cron.service';
import { Truck, TruckSchema } from '../entities/truck.entity';
// TODO: Add User entity when ready
// import { User, UserSchema } from '../entities/user.entity';

@Module({
  imports: [
    FirebaseModule,
    MongooseModule.forFeature([
      { name: Truck.name, schema: TruckSchema },
      // TODO: Add User entity when ready
      // { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [NotificationsService, TruckNotificationsCronService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

