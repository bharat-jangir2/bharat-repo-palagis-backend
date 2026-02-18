import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { sign } from 'jsonwebtoken';
import {
  Token,
  TokenDocument,
  TokenType,
  DeviceType,
  UserType,
} from '../entities/token.entity';

@Injectable()
export class TokenService {
  constructor(
    @InjectModel(Token.name) private tokenModel: Model<TokenDocument>,
    private configService: ConfigService,
  ) {}

  async generateAccessToken(
    deviceId: string,
    deviceType: DeviceType,
    userId?: string,
    userType?: UserType,
  ): Promise<string> {
    const payload: any = {
      deviceId,
      tokenType: TokenType.ACCESS,
      ...(userId ? { userId } : {}),
      ...(userType ? { userType } : {}),
    };

    const secret = this.configService.get<string>('jwt.accessSecret');
    const expiresIn = this.configService.get<number>('jwt.accessTokenTime');

    if (!secret || !expiresIn) {
      throw new Error('JWT access token configuration is missing');
    }

    const token = sign(payload, secret, { expiresIn });

    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const filter: any = { deviceId, tokenType: TokenType.ACCESS };
    if (userId) {
      filter.userId = userId;
    }
    if (userType) {
      filter.userType = userType;
    }

    await this.tokenModel.findOneAndUpdate(
      filter,
      {
        token,
        deviceId,
        deviceType,
        tokenType: TokenType.ACCESS,
        expiresAt,
        ...(userId ? { userId } : {}),
        ...(userType ? { userType } : {}),
      },
      {
        upsert: true,
        returnDocument: 'after',  //same as {new:true} in mongodb
        setDefaultsOnInsert: true,
      },
    );

    return token;
  }

  async generateRefreshToken(
    deviceId: string,
    deviceType: DeviceType,
    userId?: string,
    userType?: UserType,
  ): Promise<string> {
    const payload: any = {
      deviceId,
      tokenType: TokenType.REFRESH,
      ...(userId ? { userId } : {}),
      ...(userType ? { userType } : {}),
    };

    const secret = this.configService.get<string>('jwt.refreshSecret');
    const expiresIn = this.configService.get<number>('jwt.refreshTokenTime');

    if (!secret || !expiresIn) {
      throw new Error('JWT refresh token configuration is missing');
    }

    const token = sign(payload, secret, { expiresIn });

    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const filter: any = { deviceId, tokenType: TokenType.REFRESH };
    if (userId) {
      filter.userId = userId;
    }
    if (userType) {
      filter.userType = userType;
    }

    await this.tokenModel.findOneAndUpdate(
      filter,
      {
        token,
        deviceId,
        deviceType,
        tokenType: TokenType.REFRESH,
        expiresAt,
        ...(userId ? { userId } : {}),
        ...(userType ? { userType } : {}),
      },
      {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true,
      },
    );

    return token;
  }

  async hasValidTokenForDevice(
    deviceId: string,
    tokenType: TokenType,
  ): Promise<boolean> {
    const token = await this.tokenModel.findOne({
      deviceId,
      tokenType,
      expiresAt: { $gt: new Date() },
    });

    return !!token;
  }

  async invalidateToken(token: string): Promise<void> {
    await this.tokenModel.deleteOne({ token });
  }

  async invalidateDeviceTokens(deviceId: string): Promise<void> {
    await this.tokenModel.deleteMany({ deviceId });
  }

  async invalidateUserDeviceTokens(
    userId: string,
    deviceId: string,
  ): Promise<void> {
    await this.tokenModel.deleteMany({ userId, deviceId });
  }

  async invalidateAllUserTokens(userId: string): Promise<void> {
    await this.tokenModel.deleteMany({ userId });
  }

  async invalidateMobileTokens(deviceId: string, deviceType: DeviceType): Promise<void> {
    if (deviceType === DeviceType.IOS || deviceType === DeviceType.ANDROID) {
      await this.tokenModel.deleteMany({
        deviceId,
        deviceType: { $in: [DeviceType.IOS, DeviceType.ANDROID] },
      });
    }
  }

  async findToken(token: string, tokenType: TokenType): Promise<TokenDocument | null> {
    return this.tokenModel.findOne({
      token,
      tokenType,
      expiresAt: { $gt: new Date() },
    });
  }

  async registerOrUpdateFcmToken(
    deviceId: string,
    fcmToken: string,
    deviceType: DeviceType,
    userId?: string,
  ): Promise<TokenDocument> {
    // FCM tokens don't expire, so set a far future date (10 years)
    const expiresAt = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);

    const filter: any = { 
      deviceId, 
      tokenType: TokenType.FCM 
    };
    
    if (userId) {
      filter.userId = userId;
    }

    const token = await this.tokenModel.findOneAndUpdate(
      filter,
      {
        token: fcmToken, // Store FCM token in the token field
        deviceId,
        deviceType,
        tokenType: TokenType.FCM,
        expiresAt,
        ...(userId ? { userId } : {}),
      },
      {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true,
      },
    );

    return token;
  }

  async getFcmTokensForUser(userId: string): Promise<string[]> {
    const tokens = await this.tokenModel.find({
      userId,
      tokenType: TokenType.FCM,
      expiresAt: { $gt: new Date() },
    }).lean();

    return tokens.map(t => t.token).filter(Boolean);
  }

  async getFcmTokensForUsers(userIds: string[]): Promise<string[]> {
    const tokens = await this.tokenModel.find({
      userId: { $in: userIds },
      tokenType: TokenType.FCM,
      expiresAt: { $gt: new Date() },
    }).lean();

    return tokens.map(t => t.token).filter(Boolean);
  }

  async getAllActiveFcmTokens(): Promise<string[]> {
    const tokens = await this.tokenModel.find({
      tokenType: TokenType.FCM,
      expiresAt: { $gt: new Date() },
    }).lean();

    return tokens.map(t => t.token).filter(Boolean);
  }
}
