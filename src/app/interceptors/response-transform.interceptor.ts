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

        // Check if data contains custom messages
        let customUserMessage: string | undefined;
        let customUserMessageCode: string | undefined;
        let customDeveloperMessage: string | undefined;
        let dataWithoutMessages = data;

        if (data && typeof data === 'object' && !Array.isArray(data)) {
          // Extract custom messages if present (allow empty strings)
          if ('userMessage' in data) {
            customUserMessage = data.userMessage;
          }
          if ('userMessageCode' in data) {
            customUserMessageCode = data.userMessageCode;
          }
          if ('developerMessage' in data) {
            customDeveloperMessage = data.developerMessage;
          }

          // Remove custom message fields from data if they exist (even if empty string)
          if ('userMessage' in data || 'userMessageCode' in data || 'developerMessage' in data) {
            const { userMessage, userMessageCode, developerMessage, ...rest } = data;
            dataWithoutMessages = rest;
          }
        }

        // Use custom messages if provided (including empty strings), otherwise generate default
        const defaultMessages = this.getMessage(statusCode, request.method, data);
        const userMessage = customUserMessage !== undefined ? customUserMessage : defaultMessages.userMessage;
        const userMessageCode = customUserMessageCode !== undefined ? customUserMessageCode : defaultMessages.userMessageCode;
        const developerMessage = customDeveloperMessage !== undefined ? customDeveloperMessage : defaultMessages.developerMessage;

        const standardResponse: StandardResponse = {
          logId,
          statusCode,
          success,
          userMessage,
          userMessageCode,
          developerMessage,
        };

        if (dataWithoutMessages === null || dataWithoutMessages === undefined) {
          return standardResponse;
        }

        // Normalize result and optional pagination.
        // If the service already returned a `result` key, unwrap it to avoid `data.result.result`.
        let finalResult: any = dataWithoutMessages;

        if (
          dataWithoutMessages &&
          typeof dataWithoutMessages === 'object' &&
          'result' in dataWithoutMessages
        ) {
          finalResult = (dataWithoutMessages as any).result;
        }

        // Build the data block, attaching pagination and meta only if explicitly provided.
        standardResponse.data = {
          result: finalResult,
          ...(dataWithoutMessages &&
            (dataWithoutMessages as any).pagination && {
              pagination: (dataWithoutMessages as any).pagination,
            }),
          ...(dataWithoutMessages &&
            (dataWithoutMessages as any).meta && {
              meta: (dataWithoutMessages as any).meta,
            }),
        };

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
      } else if (method === 'DELETE') {
        userMessage = 'Resource deleted successfully';
        userMessageCode = 'DELETED';
        developerMessage = 'Resource has been deleted';
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
