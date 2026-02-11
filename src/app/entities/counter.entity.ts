import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CounterDocument = Counter & Document;

@Schema({ collection: 'counters' })
export class Counter {
  @Prop({ required: true, unique: true })
  name: string; // e.g., 'truck'

  @Prop({ required: true, default: 0 })
  sequence: number;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);
