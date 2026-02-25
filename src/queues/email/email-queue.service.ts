import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { SendEmailJobPayload } from '../common/job-payloads';

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);

  constructor(
    @InjectQueue('emailQueue')
    private readonly queue: Queue<SendEmailJobPayload>,
  ) {}

  async enqueueEmail(payload: SendEmailJobPayload): Promise<void> {
    const correlationId = payload.correlationId ?? uuidv4();

    // Let BullMQ generate job ID automatically to prevent collisions
    // Job options are handled by defaultJobOptions in EmailQueueModule
    const job = await this.queue.add('sendEmail', {
      ...payload,
      correlationId,
    });

    this.logger.log(
      `📧 Email job enqueued (jobId=${job.id}, correlationId=${correlationId}, to=${Array.isArray(payload.to) ? payload.to.join(',') : payload.to}, subject=${payload.subject})`,
    );
  }
}
