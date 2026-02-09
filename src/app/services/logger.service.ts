import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LoggerEntity, LoggerDocument } from '../entities/logger.entity';

@Injectable()
export class LoggerService {
  constructor(
    @InjectModel(LoggerEntity.name)
    private loggerModel: Model<LoggerDocument>,
  ) {}

  async createLog(logData: Partial<LoggerEntity>): Promise<LoggerDocument> {
    const log = new this.loggerModel(logData);
    return log.save();
  }

  async updateLog(
    logId: string,
    updateData: Partial<LoggerEntity>,
  ): Promise<LoggerDocument | null> {
    return this.loggerModel.findByIdAndUpdate(logId, updateData, { new: true });
  }
}
