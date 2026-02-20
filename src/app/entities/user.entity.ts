import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

// Settings sub-schema
export class UserSettings {
  notificationEnabled: boolean;
  locationEnabled: boolean;
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  deviceId: string;

  @Prop()
  deviceType?: string; // IOS, ANDROID, WEB

  // User settings
  @Prop({
    type: {
      notificationEnabled: { type: Boolean, default: false },
      locationEnabled: { type: Boolean, default: false },
    },
    default: {
      notificationEnabled: false,
      locationEnabled: false,
    },
    _id: false,
  })
  settings: UserSettings;

  @Prop({ default: false })
  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
// deviceId index is automatically created by unique: true
UserSchema.index({ isDeleted: 1 });
