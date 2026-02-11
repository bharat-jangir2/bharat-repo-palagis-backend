import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { sign } from 'jsonwebtoken';
import { Token, TokenDocument, TokenType, DeviceType } from '../entities/token.entity';

@Injectable()
export class TokenService {
  constructor(
    @InjectModel(Token.name) private tokenModel: Model<TokenDocument>,
    private configService: ConfigService,
  ) {}

  async generateAccessToken(deviceId: string, deviceType: DeviceType): Promise<string> {
    const payload = {
      deviceId,
      tokenType: TokenType.ACCESS,
    };

    const secret = this.configService.get<string>('jwt.accessSecret');
    const expiresIn = this.configService.get<number>('jwt.accessTokenTime');

    if (!secret || !expiresIn) {
      throw new Error('JWT access token configuration is missing');
    }

    const token = sign(payload, secret, { expiresIn });

    // Store in database
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    await this.tokenModel.create({
      token,
      deviceId,
      deviceType,
      tokenType: TokenType.ACCESS,
      expiresAt,
    });

    return token;
  }

  async generateRefreshToken(deviceId: string, deviceType: DeviceType): Promise<string> {
    const payload = {
      deviceId,
      tokenType: TokenType.REFRESH,
    };

    const secret = this.configService.get<string>('jwt.refreshSecret');
    const expiresIn = this.configService.get<number>('jwt.refreshTokenTime');

    if (!secret || !expiresIn) {
      throw new Error('JWT refresh token configuration is missing');
    }

    const token = sign(payload, secret, { expiresIn });

    // Store in database
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    await this.tokenModel.create({
      token,
      deviceId,
      deviceType,
      tokenType: TokenType.REFRESH,
      expiresAt,
    });

    return token;
  }

  async hasValidTokenForDevice(
    deviceId: string,
    tokenType: TokenType,
  ): Promise<boolean> {
    const token = await this.tokenModel.findOne({
      deviceId,
      tokenType,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });

    return !!token;
  }

  async invalidateToken(token: string): Promise<void> {
    await this.tokenModel.updateOne(
      { token },
      { $set: { isRevoked: true } },
    );
  }

  async invalidateDeviceTokens(deviceId: string): Promise<void> {
    await this.tokenModel.updateMany(
      { deviceId, isRevoked: false },
      { $set: { isRevoked: true } },
    );
  }

  async invalidateMobileTokens(deviceId: string, deviceType: DeviceType): Promise<void> {
    if (deviceType === DeviceType.IOS || deviceType === DeviceType.ANDROID) {
      // For mobile, invalidate all mobile tokens for this device
      await this.tokenModel.updateMany(
        {
          deviceId,
          deviceType: { $in: [DeviceType.IOS, DeviceType.ANDROID] },
          isRevoked: false,
        },
        { $set: { isRevoked: true } },
      );
    }
  }

  async findToken(token: string, tokenType: TokenType): Promise<TokenDocument | null> {
    return this.tokenModel.findOne({
      token,
      tokenType,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });
  }
}
