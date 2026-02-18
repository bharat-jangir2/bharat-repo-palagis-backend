import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { DeviceType } from '../entities/token.entity';

@Injectable()
export class DeviceHeadersGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
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
