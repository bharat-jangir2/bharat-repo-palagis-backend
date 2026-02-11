import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Token, TokenType } from '../entities/token.entity';

export interface JwtPayload {
  deviceId: string;
  tokenType: TokenType;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    @InjectModel(Token.name) private tokenModel: Model<Token>,
  ) {
    const secret = configService.get<string>('jwt.accessSecret');
    if (!secret) {
      throw new Error('JWT access secret is not configured');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    // Only accept ACCESS tokens in strategy
    if (payload.tokenType !== TokenType.ACCESS) {
      throw new UnauthorizedException('Invalid token type');
    }

    // Check if token exists and is valid in database
    // We need to get the token from the request header
    const request = this.getRequest();
    const authHeader = request?.headers?.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    const tokenDoc = await this.tokenModel.findOne({
      token,
      deviceId: payload.deviceId,
      tokenType: TokenType.ACCESS,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });

    if (!tokenDoc) {
      throw new UnauthorizedException('Token not found or invalidated');
    }

    return {
      deviceId: payload.deviceId,
    };
  }

  // Helper to get request - we'll need to pass it through
  private getRequest(): any {
    // This will be set by the guard
    return (global as any).currentRequest || null;
  }
}
