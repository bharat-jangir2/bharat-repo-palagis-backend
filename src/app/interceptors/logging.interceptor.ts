import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { LoggerService } from '../services/logger.service';
import { throwError } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(private readonly loggerService: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = new Date();

    // Extract request data
    const requestMethod = request.method;
    const requestUrl = request.originalUrl || request.url;
    const requestHeaders = { ...request.headers };
    // Remove sensitive headers
    delete requestHeaders.authorization;
    delete requestHeaders.cookie;

    const requestBody = request.body ? { ...request.body } : null;
    // Remove sensitive data from body if needed
    if (requestBody?.password) {
      requestBody.password = '***';
    }

    // Create log entry and convert promise to observable
    return from(
      this.loggerService.createLog({
        requestMethod,
        requestUrl,
        requestHeaders,
        requestBody,
        startTime,
      }),
    ).pipe(
      switchMap((log) => {
        // Store logId in request for later use
        (request as any).logId = log._id.toString();

        return next.handle().pipe(
          tap((data) => {
            // Success response
            const endTime = new Date();
            const executionTime = endTime.getTime() - startTime.getTime();

            // Log request and response together
            this.logger.log(`${requestMethod} ${requestUrl} ${response.statusCode} ${executionTime}ms`);

            this.loggerService.updateLog(log._id.toString(), {
              statusCode: response.statusCode,
              responseBody: data,
              endTime,
              executionTime,
            });
          }),
          catchError((error) => {
            // Error response
            const endTime = new Date();
            const executionTime = endTime.getTime() - startTime.getTime();
            const statusCode = error.status || 500;

            // Log request and error together
            this.logger.error(`${requestMethod} ${requestUrl} ${statusCode} ${executionTime}ms - ${error.message}`);

            this.loggerService.updateLog(log._id.toString(), {
              statusCode,
              responseBody: { error: error.message },
              endTime,
              executionTime,
              error: error.stack || error.message,
            });

            return throwError(() => error);
          }),
        );
      }),
      catchError((error) => {
        // If logging fails, still proceed with request
        console.error('Failed to create log entry:', error);
        return next.handle();
      }),
    );
  }
}
