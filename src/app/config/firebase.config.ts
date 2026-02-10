import { registerAs } from '@nestjs/config';

// Firebase configuration loaded from environment variables
// This will be available via ConfigService.get('firebase')
export default registerAs('firebase', () => ({
  // Path to Firebase service account JSON file
  // Or use service account JSON directly from env
  serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    : null,
  // Project ID (optional, can be extracted from service account)
  projectId: process.env.FIREBASE_PROJECT_ID,
}));

