import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailQueueService } from './email-queue.service';
import { EmailProcessor } from './email.processor';
import { EmailService } from '../../app/services/email.service';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: 'emailQueue',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 10_000,
          },
          removeOnComplete: {
            age: 3600, // Keep completed jobs for 1 hour for debugging
            count: 1000, // Keep last 1000 completed jobs
          },
          removeOnFail: {
            age: 24 * 3600, // Keep failed jobs for 24 hours
          },
          priority: 1, // Higher priority
        },
      }),
    }),
  ],
  providers: [EmailQueueService, EmailProcessor, EmailService],
  exports: [EmailQueueService],
})
export class EmailQueueModule {}
