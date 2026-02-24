import { SetMetadata } from '@nestjs/common';

export const BYPASS_DEVICE_HEADERS_KEY = 'bypassDeviceHeaders';
export const BypassDeviceHeaders = () => SetMetadata(BYPASS_DEVICE_HEADERS_KEY, true);
