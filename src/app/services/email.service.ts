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
   * Filter out suppressed or invalid email addresses
   * TODO: Implement email suppression logic if needed
   */
  private async filterValidRecipients(
    emails: string | string[] | undefined,
  ): Promise<string[]> {
    if (!emails) return [];
    
    const emailArray = Array.isArray(emails) ? emails : [emails];
    
    // Filter out empty strings and invalid emails
    return emailArray.filter(
      (email) => email && email.trim() && email.includes('@'),
    );
    
    // TODO: Add suppression list check here if needed
    // const suppressedEmails = await this.getSuppressedEmails();
    // return emailArray.filter(email => !suppressedEmails.includes(email));
  }

  /**
   * Send email with support for CC, BCC, and multiple recipients
   * @param options Email options
   * @returns Promise<boolean> - true if sent successfully, false otherwise
   */
  async sendEmail({
    to,
    cc = [],
    bcc = [],
    subject,
    text,
    html,
  }: {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    text?: string;
    html?: string;
  }): Promise<boolean> {
    try {
      const emailConfig = this.configService.get('email');
      
      // Check if email sending is enabled
      if (emailConfig.enabled === false) {
        const validTo = await this.filterValidRecipients(to);
        this.logger.log(
          `[EMAIL DISABLED] Email sending is disabled. Would have sent to: ${validTo.join(', ')}, Subject: ${subject}`,
        );
        return true; // Return true so calling code doesn't break
      }

      // Filter out invalid emails
      const validTo = await this.filterValidRecipients(to);
      const validCc = await this.filterValidRecipients(cc);
      const validBcc = await this.filterValidRecipients(bcc);

      // Skip if no valid recipients
      if (validTo.length === 0 && validCc.length === 0 && validBcc.length === 0) {
        this.logger.warn(`No valid recipients for email: ${subject}`);
        return false;
      }
      
      if (!emailConfig.from) {
        this.logger.error('SMTP_EMAIL_FROM is not configured');
        return false;
      }

      // Format from address
      const from = emailConfig.fromName
        ? `"${emailConfig.fromName}" <${emailConfig.from}>`
        : emailConfig.from;

      this.logger.log(`Sending email to: ${validTo.join(', ')}`);
      this.logger.debug(`From: ${from}, Subject: ${subject}`);

      const result = await this.transporter.sendMail({
        from,
        to: validTo.length > 0 ? validTo.join(', ') : undefined,
        cc: validCc.length > 0 ? validCc.join(', ') : undefined,
        bcc: validBcc.length > 0 ? validBcc.join(', ') : undefined,
        subject,
        text: text || html, // Fallback to HTML if no text
        html: html || text, // Fallback to text if no HTML
      });

      this.logger.log(
        `Email sent successfully to: ${validTo.join(', ')} (Message ID: ${result.messageId})`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send email (${subject}): ${error.message}`,
        error.stack,
      );
      this.logger.debug('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response,
      });
      return false; // Non-throwing, returns false on error
    }
  }

  /**
   * Send emails to multiple recipients (legacy method for backward compatibility)
   * @deprecated Use sendEmail with array of recipients instead
   */
  async sendBulkEmails(
    emails: string[],
    subject: string,
    text: string,
    html?: string,
  ): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    const emailPromises = emails.map(async (email) => {
      const sent = await this.sendEmail({
        to: email,
        subject,
        text,
        html,
      });
      
      if (sent) {
        success.push(email);
      } else {
        failed.push(email);
      }
    });

    await Promise.all(emailPromises);

    return { success, failed };
  }
}
