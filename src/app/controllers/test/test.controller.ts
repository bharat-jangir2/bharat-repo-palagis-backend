import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Version,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DriverStatusLogService } from '../../services/driver-status-log.service';
import { EmailService } from '../../services/email.service';
import { SendEmailDto } from '../../dtos/send-email.dto';
import { Public } from '../../decorators/public.decorator';

@Public()
@Controller('test')
export class TestController {
  constructor(
    private readonly driverStatusLogService: DriverStatusLogService,
    private readonly emailService: EmailService,
  ) {}

  @Get('active-hours/:driverId')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getTodaysActiveHours(@Param('driverId') driverId: string) {
    const result = await this.driverStatusLogService.getTodaysActiveHours(driverId);
    
    return {
      result,
      userMessage: 'Active hours fetched successfully',
      userMessageCode: 'ACTIVE_HOURS_FETCHED',
      developerMessage: `Active hours for driver ${driverId} fetched successfully`,
    };
  }

  @Post('send-email')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async sendTestEmail(@Body() sendEmailDto: SendEmailDto) {
    const result = await this.emailService.sendBulkEmails(
      sendEmailDto.emails,
      sendEmailDto.subject,
      sendEmailDto.text,
      sendEmailDto.html,
    );

    return {
      result,
      userMessage: `Emails sent. ${result.success.length} successful, ${result.failed.length} failed`,
      userMessageCode: 'EMAILS_SENT',
      developerMessage: 'Bulk email sending completed',
    };
  }
}
