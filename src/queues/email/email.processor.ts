import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { SendEmailJobPayload } from '../common/job-payloads';
import { EmailService } from '../../app/services/email.service';
import { DriverRegistrationTemplate } from '../../app/templates/email/driver-registration.template';
import { DriverPasscodeRegeneratedTemplate } from '../../app/templates/email/driver-passcode-regenerated.template';

@Processor('emailQueue', {
  concurrency: Number(process.env.EMAIL_QUEUE_CONCURRENCY) || 15, // Increased to 15 for better throughput
  lockDuration: 120_000, // 2 minutes - prevents lock expiration during long SMTP calls
})
@Injectable()
export class EmailProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(EmailProcessor.name);
  private readonly concurrency: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {
    super();
    // Store concurrency for consistent logging
    this.concurrency = Number(process.env.EMAIL_QUEUE_CONCURRENCY) || 15;
  }

  onModuleInit() {
    // Set up worker event listeners for debugging
    this.worker.on('ready', () => {
      this.logger.log(
        `✅ Worker ready for queue "emailQueue" (concurrency: ${this.concurrency})`,
      );
    });

    this.worker.on('active', (job) => {
      this.logger.log(
        `🔄 Job started processing (jobId=${job.id}, name=${job.name}, attemptsMade=${job.attemptsMade})`,
      );
    });

    this.worker.on('completed', (job) => {
      this.logger.log(
        `✅ Job completed successfully (jobId=${job.id}, name=${job.name}, processedOn=${job.processedOn})`,
      );
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `❌ Job failed (jobId=${job?.id}, name=${job?.name}, attemptsMade=${job?.attemptsMade}): ${err.message}`,
        err.stack,
      );
    });

    this.worker.on('error', (error) => {
      this.logger.error(`❌ Worker error: ${error.message}`, error.stack);
    });

    this.worker.on('stalled', (jobId) => {
      this.logger.warn(`⚠️ Job stalled (jobId=${jobId})`);
    });

    this.logger.log(
      `✅ EmailProcessor initialized for queue "emailQueue" (concurrency: ${this.concurrency}, lockDuration: 120s)`,
    );
  }

  async process(job: Job<SendEmailJobPayload>): Promise<any> {
    const startTime = Date.now();
    const payload = job.data;

    this.logger.log(
      `📧 Processing email job (jobId=${job.id}, name=${job.name}, correlationId=${payload.correlationId}, templateKey=${payload.templateKey || 'none'}, attemptsMade=${job.attemptsMade})`,
    );

    try {
      // Validate payload
      if (!payload.to) {
        throw new Error('Missing recipient email address (to field)');
      }

      const emailConfig = this.configService.get('email');
      const logoUrl =
        emailConfig?.logoUrl ||
        'https://upload.wikimedia.org/wikipedia/commons/5/5f/Logo_Public.png';

      // Handle driver_registration template
      if (payload.templateKey === 'driver_registration') {
        const emailSent = await this.emailService.sendEmail({
          to: payload.to,
          subject: DriverRegistrationTemplate.getSubject(),
          text: DriverRegistrationTemplate.getText({
            driverName: String(payload.templateData?.driverName ?? ''),
            driverCode: String(payload.templateData?.driverCode ?? ''),
            passcode: String(payload.templateData?.passcode ?? ''),
          }),
          html: DriverRegistrationTemplate.getHtml({
            driverName: String(payload.templateData?.driverName ?? ''),
            driverCode: String(payload.templateData?.driverCode ?? ''),
            passcode: String(payload.templateData?.passcode ?? ''),
            logoUrl,
          }),
        });

        if (!emailSent) {
          throw new Error(
            `EmailService.sendEmail returned false for driver registration email to ${payload.to}`,
          );
        }

        const duration = Date.now() - startTime;
        this.logger.log(
          `✅ Driver registration email sent successfully (jobId=${job.id}, correlationId=${payload.correlationId}, duration=${duration}ms)`,
        );
        return { success: true, duration };
      }

      // Handle driver_passcode_regenerated template
      if (payload.templateKey === 'driver_passcode_regenerated') {
        const emailSent = await this.emailService.sendEmail({
          to: payload.to,
          subject: DriverPasscodeRegeneratedTemplate.getSubject(),
          text: DriverPasscodeRegeneratedTemplate.getText({
            driverName: String(payload.templateData?.driverName ?? ''),
            driverCode: String(payload.templateData?.driverCode ?? ''),
            passcode: String(payload.templateData?.passcode ?? ''),
          }),
          html: DriverPasscodeRegeneratedTemplate.getHtml({
            driverName: String(payload.templateData?.driverName ?? ''),
            driverCode: String(payload.templateData?.driverCode ?? ''),
            passcode: String(payload.templateData?.passcode ?? ''),
            logoUrl,
          }),
        });

        if (!emailSent) {
          throw new Error(
            `EmailService.sendEmail returned false for passcode regeneration email to ${payload.to}`,
          );
        }

        const duration = Date.now() - startTime;
        this.logger.log(
          `✅ Passcode regeneration email sent successfully (jobId=${job.id}, correlationId=${payload.correlationId}, duration=${duration}ms)`,
        );
        return { success: true, duration };
      }

      // Fallback: send using provided subject/text/html directly
      if (!payload.subject) {
        throw new Error('Missing email subject');
      }

      const emailSent = await this.emailService.sendEmail({
        to: payload.to,
        cc: payload.cc,
        bcc: payload.bcc,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      });

      if (!emailSent) {
        throw new Error(
          `EmailService.sendEmail returned false for email to ${payload.to}`,
        );
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ Email sent successfully (jobId=${job.id}, correlationId=${payload.correlationId}, duration=${duration}ms)`,
      );
      return { success: true, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `❌ Failed to send email (jobId=${job.id}, correlationId=${payload.correlationId}, attemptsMade=${job.attemptsMade}, duration=${duration}ms): ${error.message}`,
        error.stack,
      );

      // If this is the last attempt, log it clearly
      if (job.attemptsMade >= (job.opts.attempts || 3) - 1) {
        this.logger.error(
          `🚨 Email job FAILED permanently after ${job.attemptsMade + 1} attempts (jobId=${job.id}, correlationId=${payload.correlationId})`,
        );
      }

      throw error; // Re-throw to let BullMQ handle retry
    }
  }
}
