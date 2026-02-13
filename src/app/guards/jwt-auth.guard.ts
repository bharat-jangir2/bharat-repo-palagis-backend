import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // Store request in global for strategy to access
    const request = context.switchToHttp().getRequest();
    (global as any).currentRequest = request;

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const handlerName = handler.name;

    // For logout endpoints, allow the request to proceed even if authentication fails
    // This makes logout idempotent - it will succeed even if token is invalid/expired
    if (handlerName === 'logout') {
      // If authentication failed, set user to null/undefined but don't throw
      // The controller will handle this gracefully
      if (err || !user) {
        return null; // Allow logout to proceed without user
      }
      return user;
    }

    // For other endpoints, use default behavior (throw if auth fails)
    if (err || !user) {
      throw err || new Error('Unauthorized');
    }
    return user;
  }
}
