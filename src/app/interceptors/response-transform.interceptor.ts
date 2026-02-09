import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { StandardResponse } from '../interfaces/standard-response.interface';

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const logId = (request as any).logId || '';

    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode || HttpStatus.OK;
        const success = statusCode >= 200 && statusCode < 300;

        const { userMessage, userMessageCode, developerMessage } =
          this.getMessage(statusCode, request.method, data);

        const standardResponse: StandardResponse = {
          logId,
          statusCode,
          success,
          userMessage,
          userMessageCode,
          developerMessage,
        };

        if (data === null || data === undefined) {
          return standardResponse;
        }

        // Handle pagination structure: page, limit, totalItems, totalPages
        if (Array.isArray(data)) {
          standardResponse.data = {
            result: data,
          };
        } else if (data && typeof data === 'object') {
          // If data has pagination info, extract it
          if (data.pagination || data.result) {
            standardResponse.data = {
              result: data.result || data,
              pagination: {
                page: data.pagination?.page || 1,
                limit: data.pagination?.limit || data.pagination?.perPage || 10,
                totalItems: data.pagination?.totalItems || data.pagination?.total || 0,
                totalPages: data.pagination?.totalPages || 
                  Math.ceil((data.pagination?.totalItems || data.pagination?.total || 0) / 
                           (data.pagination?.limit || data.pagination?.perPage || 10)),
              },
            };
          } else {
            standardResponse.data = {
              result: data,
            };
          }
        } else {
          standardResponse.data = {
            result: data,
          };
        }

        return standardResponse;
      }),
    );
  }

  private getMessage(
    statusCode: number,
    method: string,
    data: any,
  ): {
    userMessage: string;
    userMessageCode: string;
    developerMessage: string;
  } {
    let userMessage = 'Request processed successfully';
    let userMessageCode = 'SUCCESS';
    let developerMessage = 'Operation completed successfully';

    if (statusCode === HttpStatus.CREATED) {
      if (method === 'POST') {
        userMessage = 'Resource created successfully';
        userMessageCode = 'CREATED';
        developerMessage = 'New resource has been created';
      }
    } else if (statusCode === HttpStatus.NO_CONTENT) {
      userMessage = 'Resource deleted successfully';
      userMessageCode = 'DELETED';
      developerMessage = 'Resource has been deleted';
    } else if (statusCode === HttpStatus.OK) {
      if (method === 'PUT') {
        userMessage = 'Resource updated successfully';
        userMessageCode = 'UPDATED';
        developerMessage = 'Resource has been updated';
      } else if (method === 'GET') {
        if (Array.isArray(data)) {
          userMessage = 'Resources fetched successfully';
          developerMessage = 'Resources retrieved from database';
        } else {
          userMessage = 'Resource fetched successfully';
          developerMessage = 'Resource retrieved from database';
        }
      }
    }

    return { userMessage, userMessageCode, developerMessage };
  }
}
