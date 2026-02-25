export interface SendEmailJobPayload {
  correlationId?: string;
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject?: string; // Optional when using templateKey
  text?: string;
  html?: string;
  templateKey?: 'driver_registration' | 'driver_passcode_regenerated' | string;
  templateData?: Record<string, any>;
}

export interface SendPushJobPayload {
  correlationId?: string;
  deviceTokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

