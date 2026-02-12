import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TokenDocument = Token & Document;

export enum TokenType {
  ACCESS = 'ACCESS',
  REFRESH = 'REFRESH',
}

export enum DeviceType {
  IOS = 'IOS',
  ANDROID = 'ANDROID',
  WEB = 'WEB',
  UNKNOWN = 'UNKNOWN',
}

export enum UserType {
  SUPER_ADMIN = 'SUPER_ADMIN',
  DRIVER = 'DRIVER',
}

@Schema({ timestamps: true })
export class Token {
  @Prop({ required: true, unique: true, index: true })
  token: string; // JWT token string

  @Prop({ required: true, index: true })
  deviceId: string;

  @Prop({ type: String, enum: DeviceType, default: DeviceType.UNKNOWN })
  deviceType: DeviceType;

  @Prop({ type: String, enum: TokenType, required: true, index: true })
  tokenType: TokenType;

  @Prop({ required: true })
  expiresAt: Date;

  // Generic user identifier (SuperAdmin now, normal user later)
  @Prop({ type: String, required: false, index: true })
  userId?: string;

  // Type of user (e.g., SUPER_ADMIN, DRIVER)
  @Prop({ type: String, enum: UserType, required: false, index: true })
  userType?: UserType;

  createdAt: Date;
  updatedAt: Date;
}

export const TokenSchema = SchemaFactory.createForClass(Token);

// Compound indexes for efficient queries
TokenSchema.index({ deviceId: 1, tokenType: 1 });
TokenSchema.index({ deviceId: 1, deviceType: 1 });
TokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
TokenSchema.index({ userId: 1, deviceId: 1, tokenType: 1 });
TokenSchema.index({ userType: 1, userId: 1, deviceId: 1, tokenType: 1 });

