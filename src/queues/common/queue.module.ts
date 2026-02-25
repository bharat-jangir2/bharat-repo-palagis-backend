import { Global, Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

const queueLogger = new Logger('Queue');

@Global()
@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST', '127.0.0.1');
        const port = Number(configService.get<number>('REDIS_PORT', 6379));
        const password = configService.get<string>('REDIS_PASSWORD');

        queueLogger.log(
          `🔧 Configuring BullMQ with Redis (host=${host}, port=${port})`,
        );

        return {
          connection: {
            host,
            port,
            password,
            maxRetriesPerRequest: null,
            enableReadyCheck: true,
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 10_000, // 10 seconds
            },
            removeOnComplete: {
              age: 3600, // Keep completed jobs for 1 hour for debugging
              count: 1000, // Keep last 1000 completed jobs
            },
            removeOnFail: {
              age: 24 * 3600, // Keep failed jobs for 24 hours
            },
            priority: 1, // Higher priority (lower number = higher priority)
          },
        };
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
