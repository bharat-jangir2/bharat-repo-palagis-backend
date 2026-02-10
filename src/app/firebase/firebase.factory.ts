import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

export const FIREBASE_ADMIN = 'FIREBASE_ADMIN';

const logger = new Logger('Firebase');

export function createFirebaseApp(configService: ConfigService): admin.app.App {
  if (admin.apps.length > 0) {
    const existingApp = admin.app();
    const projectId = (existingApp.options as any)?.projectId || 'unknown';
    logger.log(`✅ Firebase app already initialized (project: ${projectId})`);
    return existingApp;
  }

  logger.log('⏳ Initializing Firebase app...');

  const firebaseConfig = configService.get('firebase') as any;

  if (!firebaseConfig) {
    logger.error('❌ Firebase configuration not found (config key: "firebase")');
    throw new Error('Firebase configuration not found (config key: "firebase")');
  }

  let credential: admin.credential.Credential;

  if (firebaseConfig.serviceAccountJson) {
    logger.log('Using Firebase service account JSON from environment');
    credential = admin.credential.cert(firebaseConfig.serviceAccountJson);
  } else if (firebaseConfig.serviceAccountPath) {
    logger.log(`Using Firebase service account file at path: ${firebaseConfig.serviceAccountPath}`);
    credential = admin.credential.cert(firebaseConfig.serviceAccountPath);
  } else {
    const msg =
      'Firebase service account configuration not provided. ' +
      'Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH';
    logger.error(`❌ ${msg}`);
    throw new Error(msg);
  }

  const projectId =
    firebaseConfig.projectId ||
    firebaseConfig.serviceAccountJson?.project_id ||
    process.env.FIREBASE_PROJECT_ID ||
    'unknown';

  const app = admin.initializeApp({
    credential,
    projectId,
  });

  logger.log(`✅ Firebase app initialized successfully (project: ${projectId})`);

  return app;
}

