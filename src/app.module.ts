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
import { AppController } from './app/controllers/app/app.controller';
import { AdminTruckController } from './app/controllers/admin/admin-truck.controller';
import { AdminDriverController } from './app/controllers/admin/admin-driver.controller';
import { AppTruckController } from './app/controllers/app/app-truck.controller';
import { AppDriverController } from './app/controllers/app/app-driver.controller';
import { AppDriverAuthController } from './app/controllers/app/app-driver-auth.controller';
import { AppService } from './app/services/app.service';
import { TruckService } from './app/services/truck.service';
import { DriverService } from './app/services/driver.service';
import { LoggerService } from './app/services/logger.service';
import { Truck, TruckSchema } from './app/entities/truck.entity';
import { Driver, DriverSchema } from './app/entities/driver.entity';
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
import { AuthService } from './app/services/auth.service';
import { TokenService } from './app/services/token.service';
import { CounterService } from './app/services/counter.service';
import { JwtAuthGuard } from './app/guards/jwt-auth.guard';
import { AuthController } from './app/controllers/auth.controller';
import { Device, DeviceSchema } from './app/entities/device.entity';
import { DeviceService } from './app/services/device.service';
import { AppDeviceController } from './app/controllers/app/app-device.controller';
import {
  SuperAdmin,
  SuperAdminSchema,
} from './app/entities/super-admin.entity';
import { SuperAdminService } from './app/services/super-admin.service';
import { SuperAdminAuthService } from './app/services/super-admin-auth.service';
import { SuperAdminAuthController } from './app/controllers/admin/super-admin-auth.controller';
import { DriverAuthService } from './app/services/driver-auth.service';

const logger = new Logger('Database');

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true, 
      load: [databaseConfig, firebaseConfig, jwtConfig],
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
      {
        name: LoggerEntity.name,
        schema: LoggerSchema,
        collection: LoggerCollectionName,
      },
      { name: Token.name, schema: TokenSchema },
      { name: Counter.name, schema: CounterSchema },
      { name: Device.name, schema: DeviceSchema },
      { name: SuperAdmin.name, schema: SuperAdminSchema },
    ]),
    // Firebase / Notifications
    NotificationsModule,
  ],
  controllers: [
    // Auth Controller
    AuthController,
    // App Controllers (Mobile App - Read-only)
    AppController,
    AppTruckController,
    AppDriverController,
    AppDriverAuthController,
    // Admin Controllers (Admin Panel - Full CRUD)
    AdminTruckController,
    AdminDriverController,
    AppDeviceController,
    SuperAdminAuthController,
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
    // Auth providers
    JwtStrategy,
    AuthService,
    TokenService,
    JwtAuthGuard,
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