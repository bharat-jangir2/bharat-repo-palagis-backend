import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { createFirebaseApp, FIREBASE_ADMIN } from './firebase.factory';

export const FIREBASE_MESSAGING = 'FIREBASE_MESSAGING';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: FIREBASE_ADMIN,
      useFactory: (configService: ConfigService): admin.app.App =>
        createFirebaseApp(configService),
      inject: [ConfigService],
    },
    {
      provide: FIREBASE_MESSAGING,
      useFactory: (app: admin.app.App) => app.messaging(),
      inject: [FIREBASE_ADMIN],
    },
  ],
  exports: [FIREBASE_MESSAGING],
})
export class FirebaseModule {}

