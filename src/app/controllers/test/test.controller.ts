import {
  Controller,
  Get,
  Param,
  Version,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DriverStatusLogService } from '../../services/driver-status-log.service';
import { Public } from '../../decorators/public.decorator';

@Public()
@Controller('test')
export class TestController {
  constructor(private readonly driverStatusLogService: DriverStatusLogService) {}

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
}
