import {
    Body,
    Controller,
    Headers,
    Post,
    Request,
    UnauthorizedException,
    UseGuards,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import { DriverAuthService } from '../../services/driver-auth.service';
  import { DriverLoginDto } from '../../dtos/driver-login.dto';
  import { RefreshTokenDto } from '../../dtos/refresh-token.dto';
  import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
  import { Public } from '../../decorators/public.decorator';
  import { DeviceType } from '../../entities/token.entity';
  
  @Controller('drivers')
  export class DriverController {
    constructor(
      private readonly driverAuthService: DriverAuthService,
    ) {}
  
    
   
  }
  