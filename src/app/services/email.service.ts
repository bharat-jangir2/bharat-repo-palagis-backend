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
      // debug: true, // Enable debug output
      // logger: true, // Enable logging
    });

    // Verify SMTP connection on startup
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error(`❌ SMTP connection verification failed: ${error.message}`);
      } else {
        this.logger.log(`✅ SMTP connection verified successfully (host=${emailConfig.host}, port=${emailConfig.port})`);
      }
    });
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
        const toArray = Array.isArray(to) ? to : [to];
        this.logger.log(
          `[EMAIL DISABLED] Email sending is disabled. Would have sent to: ${toArray.join(', ')}, Subject: ${subject}`,
        );
        return true; // Return true so calling code doesn't break
      }

      // Normalize to arrays for Nodemailer (emails are already validated before enqueueing)
      const toArray = Array.isArray(to) ? to : [to];
      const ccArray = Array.isArray(cc) ? cc : cc ? [cc] : [];
      const bccArray = Array.isArray(bcc) ? bcc : bcc ? [bcc] : [];

      // Skip if no recipients
      if (toArray.length === 0 && ccArray.length === 0 && bccArray.length === 0) {
        this.logger.warn(`No recipients for email: ${subject}`);
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

      this.logger.log(`Sending email to: ${toArray.join(', ')}`);
      this.logger.log(`From: ${from}, Subject: ${subject}`);

      const mailOptions = {
        from,
        to: toArray.join(', '),
        cc: ccArray.length > 0 ? ccArray.join(', ') : undefined,
        bcc: bccArray.length > 0 ? bccArray.join(', ') : undefined,
        subject,
        text: text || html, // Fallback to HTML if no text
        html: html || text, // Fallback to text if no HTML
      };

      this.logger.debug('Mail options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        hasText: !!mailOptions.text,
        hasHtml: !!mailOptions.html,
      });

      const result = await this.transporter.sendMail(mailOptions);

      // Log full SMTP response for debugging
      this.logger.log(
        `Email sent successfully to: ${toArray.join(', ')} (Message ID: ${result.messageId})`,
      );
      this.logger.debug('SMTP Response:', {
        messageId: result.messageId,
        response: result.response,
        accepted: result.accepted,
        rejected: result.rejected,
        pending: result.pending,
        envelope: result.envelope,
      });

      // Check if email was actually accepted by SMTP server
      if (result.rejected && result.rejected.length > 0) {
        this.logger.error(
          `❌ Email was REJECTED by SMTP server for: ${result.rejected.join(', ')}`,
        );
        return false;
      }

      if (result.accepted && result.accepted.length === 0) {
        this.logger.warn(
          `⚠️ Email was not accepted by SMTP server (no accepted recipients)`,
        );
        return false;
      }

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
