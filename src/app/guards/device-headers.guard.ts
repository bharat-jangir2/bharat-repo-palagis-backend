import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DeviceType } from '../entities/token.entity';
import { BYPASS_DEVICE_HEADERS_KEY } from '../decorators/bypass-device-headers.decorator';

@Injectable()
export class DeviceHeadersGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is marked to bypass device headers
    const bypassDeviceHeaders = this.reflector.getAllAndOverride<boolean>(
      BYPASS_DEVICE_HEADERS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Skip device header validation if bypass decorator is present
    if (bypassDeviceHeaders) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const deviceId = request.headers['x-device-id'];
    const deviceType = request.headers['x-device-type'];

    if (!deviceId || !deviceType) {
      throw new BadRequestException(
        'Device ID and Device Type are required in headers (x-device-id, x-device-type)',
      );
    }

    if (!Object.values(DeviceType).includes(deviceType as DeviceType)) {
      throw new BadRequestException(
        `Invalid device type. Must be one of: ${Object.values(DeviceType).join(', ')}`,
      );
    }

    return true;
  }
}
