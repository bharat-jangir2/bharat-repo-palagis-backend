import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import databaseConfig from './app/config/database.config';
import firebaseConfig from './app/config/firebase.config';
import jwtConfig from './app/config/jwt.config';
import emailConfig from './app/config/email.config';
// User App Controllers
import { UserController } from './app/controllers/users/user.controller';
import { UserTruckController } from './app/controllers/users/user-truck.controller';
import { UserDriverController } from './app/controllers/users/user-driver.controller';
import { UserDeviceController } from './app/controllers/users/user-device.controller';
import { UserAuthController } from './app/controllers/users/user-auth.controller';
// Driver App Controllers
import { DriverAuthController } from './app/controllers/drivers/driver-auth.controller';
import { DriverTruckController } from './app/controllers/drivers/driver-truck.controller';
import { DriverProfileController } from './app/controllers/drivers/driver-profile.controller';
import { DriverStatusController } from './app/controllers/drivers/driver-status.controller';
import { DriverTruckLocationController } from './app/controllers/drivers/driver-truck-location.controller';
// Admin Controllers
import { AdminTruckController } from './app/controllers/admin/admin-truck.controller';
import { AdminDriverController } from './app/controllers/admin/admin-driver.controller';
import { AdminBookingController } from './app/controllers/admin/admin-booking.controller';
import { AppService } from './app/services/app.service';
import { TruckService } from './app/services/truck.service';
import { DriverService } from './app/services/driver.service';
import { LoggerService } from './app/services/logger.service';
import { Truck, TruckSchema } from './app/entities/truck.entity';
import { Driver, DriverSchema } from './app/entities/driver.entity';
import { TruckBooking, TruckBookingSchema } from './app/entities/truck-booking.entity';
import {
  LoggerEntity,
  LoggerSchema,
  LoggerCollectionName,
} from './app/entities/logger.entity';
import { Token, TokenSchema } from './app/entities/token.entity';
import { Counter, CounterSchema } from './app/entities/counter.entity';
import { LoggingInterceptor } from './app/interceptors/logging.interceptor';
import { ResponseTransformInterceptor } from './app/interceptors/response-transform.interceptor';
import { NotificationsModule } from './app/notifications/notifications.module';
import { JwtStrategy } from './app/strategies/jwt.strategy';
import { TokenService } from './app/services/token.service';
import { CounterService } from './app/services/counter.service';
import { JwtAuthGuard } from './app/guards/jwt-auth.guard';
import { DeviceHeadersGuard } from './app/guards/device-headers.guard';
import { Device, DeviceSchema } from './app/entities/device.entity';
import { DeviceService } from './app/services/device.service';
import {
  SuperAdmin,
  SuperAdminSchema,
} from './app/entities/super-admin.entity';
import { SuperAdminService } from './app/services/super-admin.service';
import { SuperAdminAuthService } from './app/services/super-admin-auth.service';
import { SuperAdminAuthController } from './app/controllers/admin/super-admin-auth.controller';
import { SuperAdminProfileController } from './app/controllers/admin/super-admin-profile.controller';
import { DriverAuthService } from './app/services/driver-auth.service';
import { DriverStatusLog, DriverStatusLogSchema } from './app/entities/driver-status-log.entity';
import { DriverStatusLogService } from './app/services/driver-status-log.service';
import { User, UserSchema } from './app/entities/user.entity';
import { UserService } from './app/services/user.service';
import { UserAuthService } from './app/services/user-auth.service';
import { UserProfileController } from './app/controllers/users/user-profile.controller';
import { UserBookingController } from './app/controllers/users/user-booking.controller';
import { UserSavedLocationController } from './app/controllers/users/user-saved-location.controller';
import { TruckBookingService } from './app/services/truck-booking.service';
import { SavedLocationService } from './app/services/saved-location.service';
import { EmailService } from './app/services/email.service';
import { SavedLocation, SavedLocationSchema } from './app/entities/saved-location.entity';
import { TestController } from './app/controllers/test/test.controller';

const logger = new Logger('Database');

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true, 
      load: [databaseConfig, firebaseConfig, jwtConfig, emailConfig],
      cache: true,
      // Use single .env file
      envFilePath: '.env',
      ignoreEnvFile: false,
    }),

    // Passport JWT Strategy
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Schedule Module for Cron Jobs
    ScheduleModule.forRoot(),

    // MongoDB connection - Async setup with ConfigService
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const dbConfig = configService.get('database');
        const uri = dbConfig.uri;
        
        // Use console.log here to avoid logger initialization issues
        console.log('[Database] Connecting to MongoDB...');
        
        return {
          uri,
          ...dbConfig.options,
        };
      },
      inject: [ConfigService],
    }),

    // MongoDB schemas - Register entities
    MongooseModule.forFeature([
      { name: Truck.name, schema: TruckSchema },
      { name: Driver.name, schema: DriverSchema },
      { name: TruckBooking.name, schema: TruckBookingSchema },
      {
        name: LoggerEntity.name,
        schema: LoggerSchema,
        collection: LoggerCollectionName,
      },
      { name: Token.name, schema: TokenSchema },
      { name: Counter.name, schema: CounterSchema },
      { name: Device.name, schema: DeviceSchema },
      { name: SuperAdmin.name, schema: SuperAdminSchema },
      { name: DriverStatusLog.name, schema: DriverStatusLogSchema },
      { name: User.name, schema: UserSchema },
      { name: SavedLocation.name, schema: SavedLocationSchema },
    ]),
    // Firebase / Notifications
    NotificationsModule,
  ],
  controllers: [
    // User App Controllers (User-facing mobile app)
    UserController,
    UserTruckController,
    UserDriverController,
    UserDeviceController,
    UserAuthController,
    UserProfileController,
    UserBookingController,
    UserSavedLocationController,
    // Driver App Controllers (Driver-facing mobile app)
    DriverAuthController,
    DriverTruckController,
    DriverProfileController,
    DriverStatusController,
    DriverTruckLocationController,
    // Admin Controllers (Admin Panel - Full CRUD)
    AdminTruckController,
    AdminDriverController,
    AdminBookingController,
    SuperAdminAuthController,
    SuperAdminProfileController,
    // Test Controllers
    TestController,
  ],
  providers: [
    AppService,
    TruckService,
    CounterService,
    DriverService,
    LoggerService,
    DeviceService,
    SuperAdminService,
    SuperAdminAuthService,
    DriverAuthService,
    DriverStatusLogService,
    UserService,
    UserAuthService,
    TruckBookingService,
    SavedLocationService,
    EmailService,
    // Auth providers
    JwtStrategy,
    TokenService,
    JwtAuthGuard,
    DeviceHeadersGuard,
    {
      provide: APP_GUARD,
      useClass: DeviceHeadersGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async onModuleInit() {
    // Set up connection event listeners
    this.connection.on('connected', () => {
      logger.log(`✅ Database connected successfully`);
      const dbName = this.connection.db?.databaseName || 'unknown';
      logger.log(`   Database: ${dbName}`);
      
    });

    this.connection.on('error', (err) => {
      logger.error(`❌ Database connection error: ${err.message}`);
    });

    this.connection.on('disconnected', () => {
      logger.warn(`⚠️  Database disconnected`);
    });

    // Check current connection status with retry logic
    const maxAttempts = 50; // 5 seconds max wait
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      if (this.connection.readyState === 1) {
        // Connected
        const dbName = this.connection.db?.databaseName || 'unknown';
        logger.log(`✅ Database connection verified and ready`);
        logger.log(`Database: ${dbName}`);
        return;
      } else if (this.connection.readyState === 2) {
        // Still connecting
        if (attempts === 0) {
          logger.log(`⏳ Waiting for database connection...`);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      } else if (this.connection.readyState === 0) {
        // Disconnected/Error
        logger.error(`❌ Database connection failed - state: ${this.getConnectionState()}`);
        return;
      } else {
        break;
      }
    }
    
    // If we get here, connection didn't complete in time
    logger.warn(`⚠️  Database connection timeout - state: ${this.getConnectionState()}`);
  }

  private getConnectionState(): string {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    return states[this.connection.readyState] || 'unknown';
  }
}