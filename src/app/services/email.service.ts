import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const emailConfig = this.configService.get('email');
    
    this.transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.auth.user,
        pass: emailConfig.auth.pass,
      },
    });
  }

  /**
   * Send emails to multiple recipients
   * @param emails Array of email addresses
   * @param subject Email subject
   * @param text Plain text content
   * @param html HTML content (optional)
   */
  async sendBulkEmails(
    emails: string[],
    subject: string,
    text: string,
    html?: string,
  ): Promise<{ success: string[]; failed: string[] }> {
    const emailConfig = this.configService.get('email');
    // Format from address: "Name <email>" or just "email"
    const from = emailConfig.fromName
      ? `${emailConfig.fromName} <${emailConfig.from}>`
      : emailConfig.from;

    const success: string[] = [];
    const failed: string[] = [];

    // Send emails in parallel
    const emailPromises = emails.map(async (email) => {
      try {
        await this.transporter.sendMail({
          from,
          to: email,
          subject,
          text,
          html: html || text,
        });
        success.push(email);
        this.logger.log(`Email sent successfully to ${email}`);
      } catch (error) {
        failed.push(email);
        this.logger.error(`Failed to send email to ${email}: ${error.message}`);
      }
    });

    await Promise.all(emailPromises);

    return { success, failed };
  }
}
