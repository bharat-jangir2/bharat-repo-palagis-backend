import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../services/logger.service';
import { StandardResponse } from '../interfaces/standard-response.interface';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly loggerService: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const logId = (request as any).logId || '';

    // Determine status code and error details
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let userMessage = 'An unexpected error occurred';
    let userMessageCode = 'INTERNAL_ERROR';
    let developerMessage = 'Internal server error';
    let errorDetails: any = null;

    // Handle different exception types
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        userMessage = exceptionResponse;
        developerMessage = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        
        // Handle ValidationPipe errors
        if (Array.isArray(responseObj.message)) {
          userMessage = 'Validation failed';
          userMessageCode = 'VALIDATION_ERROR';
          developerMessage = responseObj.message.join(', ');
          errorDetails = responseObj.message;
        } else {
          userMessage = responseObj.message || userMessage;
          developerMessage = responseObj.error || developerMessage;
          errorDetails = responseObj;
        }
      }

      // Set specific message codes based on status
      if (statusCode === HttpStatus.BAD_REQUEST) {
        userMessageCode = 'BAD_REQUEST';
      } else if (statusCode === HttpStatus.UNAUTHORIZED) {
        userMessageCode = 'UNAUTHORIZED';
        userMessage = userMessage || 'Unauthorized access';
      } else if (statusCode === HttpStatus.FORBIDDEN) {
        userMessageCode = 'FORBIDDEN';
        userMessage = userMessage || 'Access forbidden';
      } else if (statusCode === HttpStatus.NOT_FOUND) {
        userMessageCode = 'NOT_FOUND';
        userMessage = userMessage || 'Resource not found';
      } else if (statusCode === HttpStatus.CONFLICT) {
        userMessageCode = 'CONFLICT';
        userMessage = userMessage || 'Resource conflict';
      } else if (statusCode === HttpStatus.UNPROCESSABLE_ENTITY) {
        userMessageCode = 'UNPROCESSABLE_ENTITY';
      }
    } else if (exception instanceof Error) {
      // Handle generic errors
      developerMessage = exception.message;
      
      // Handle MongoDB/Mongoose errors
      if (exception.name === 'MongoServerError' || (exception as any).code) {
        const mongoError = exception as any;
        
        if (mongoError.code === 11000) {
          // Duplicate key error
          statusCode = HttpStatus.CONFLICT;
          userMessage = 'Duplicate entry. This resource already exists';
          userMessageCode = 'DUPLICATE_ENTRY';
          developerMessage = `Duplicate key error: ${JSON.stringify(mongoError.keyValue)}`;
        } else if (mongoError.code === 11001) {
          statusCode = HttpStatus.CONFLICT;
          userMessage = 'Duplicate entry detected';
          userMessageCode = 'DUPLICATE_ENTRY';
        } else {
          statusCode = HttpStatus.BAD_REQUEST;
          userMessage = 'Database operation failed';
          userMessageCode = 'DATABASE_ERROR';
          developerMessage = mongoError.message;
        }
      } else if (exception.name === 'CastError' || exception.name === 'ValidationError') {
        // Mongoose validation/cast errors
        statusCode = HttpStatus.BAD_REQUEST;
        userMessage = 'Invalid data provided';
        userMessageCode = 'VALIDATION_ERROR';
        developerMessage = exception.message;
      } else {
        // Generic error
        developerMessage = exception.stack || exception.message;
      }
    }

    // Log the error - less verbose for 404 errors
    if (statusCode === HttpStatus.NOT_FOUND) {
      // Log 404 errors as warnings without stack trace
      this.logger.warn(`${request.method} ${request.url} - ${userMessage}`);
    } else {
      // Log other errors with full details
      this.logger.error(
        `Exception caught: ${developerMessage}`,
        exception instanceof Error ? exception.stack : undefined,
        `${request.method} ${request.url}`,
      );
    }

    // Update logger entry if logId exists
    if (logId) {
      this.loggerService
        .updateLog(logId, {
          statusCode,
          responseBody: {
            error: userMessage,
            details: errorDetails,
          },
          endTime: new Date(),
          error: exception instanceof Error ? exception.stack : String(exception),
        })
        .catch((err) => {
          this.logger.error('Failed to update log entry', err);
        });
    }

    // Build standard error response
    const errorResponse: StandardResponse = {
      logId,
      statusCode,
      success: false,
      userMessage,
      userMessageCode,
      developerMessage: process.env.NODE_ENV === 'production' 
        ? 'An error occurred while processing your request' 
        : developerMessage,
      data: errorDetails ? { result: { errors: errorDetails } } : undefined,
    };

    response.status(statusCode).json(errorResponse);
  }
}
