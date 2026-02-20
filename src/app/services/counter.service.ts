import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Counter, CounterDocument } from '../entities/counter.entity';

@Injectable()
export class CounterService {
  constructor(
    @InjectModel(Counter.name) private counterModel: Model<CounterDocument>,
  ) {}

  async getNextSequence(name: string): Promise<number> {
    const counter = await this.counterModel
      .findOneAndUpdate(
        { name },
        { $inc: { sequence: 1 } },
        {
          upsert: true,
          returnDocument: 'after',
        },
      )
      .exec();

    return counter.sequence;
  }

  async formatTruckCode(sequence: number): Promise<string> {
    // Format: TRU-001, TRU-002, etc.
    const paddedNumber = sequence.toString().padStart(3, '0');
    return `TRU-${paddedNumber}`;
  }

  async getNextTruckCode(): Promise<string> {
    const sequence = await this.getNextSequence('truck');
    return this.formatTruckCode(sequence);
  }

  async formatDriverCode(sequence: number): Promise<string> {
    // Format: DRV-001, DRV-002, etc.
    const paddedNumber = sequence.toString().padStart(3, '0');
    return `DRV-${paddedNumber}`;
  }

  async getNextDriverCode(): Promise<string> {
    const sequence = await this.getNextSequence('driver');
    return this.formatDriverCode(sequence);
  }

  async formatRequestId(sequence: number, year: number): Promise<string> {
    // Format: REQ-2024-001, REQ-2024-002, etc.
    const paddedNumber = sequence.toString().padStart(3, '0');
    return `REQ-${year}-${paddedNumber}`;
  }

  async getNextRequestId(): Promise<string> {
    const currentYear = new Date().getFullYear();
    // Use year-specific counter to reset sequence each year
    const counterName = `request_${currentYear}`;
    const sequence = await this.getNextSequence(counterName);
    return this.formatRequestId(sequence, currentYear);
  }
}
