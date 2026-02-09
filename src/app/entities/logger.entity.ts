import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type LoggerDocument = LoggerEntity & Document;

@Schema({ timestamps: true })
export class LoggerEntity {
  @Prop({ required: true })
  requestMethod: string;

  @Prop({ required: true })
  requestUrl: string;

  @Prop({ required: false, type: Object, default: null })
  requestHeaders?: Record<string, any>;

  @Prop({ required: false, type: Object, default: null })
  requestBody?: Record<string, any>;

  @Prop({ required: false })
  statusCode?: number;

  @Prop({ required: false, type: Object })
  responseBody?: Record<string, any>;

  @Prop({ required: false, type: SchemaTypes.Date })
  startTime?: Date;

  @Prop({ required: false, type: SchemaTypes.Date })
  endTime?: Date;

  @Prop({ required: false })
  executionTime?: number;

  @Prop({ required: false, default: '' })
  error?: string;
}

export const LoggerCollectionName = 'loggers';
export const LoggerSchema = SchemaFactory.createForClass(LoggerEntity);

// TTL Index: Automatically delete documents after 15 days
// MongoDB TTL index uses seconds, so 15 days = 15 * 24 * 60 * 60 = 1,296,000 seconds
LoggerSchema.index({ createdAt: 1 }, { expireAfterSeconds: 1296000 });
