import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealthCheckMessage(): string {
    return 'The server is running smoothly.';
  }
}
