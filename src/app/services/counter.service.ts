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
    // Format: T-0001, T-0002, etc.
    const paddedNumber = sequence.toString().padStart(4, '0');
    return `T-${paddedNumber}`;
  }

  async getNextTruckCode(): Promise<string> {
    const sequence = await this.getNextSequence('truck');
    return this.formatTruckCode(sequence);
  }
}
