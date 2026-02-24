export default () => ({
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASSWORD || '',
    },
    from: process.env.SMTP_EMAIL_FROM || process.env.SMTP_USER || '',
    fromName: process.env.SMTP_FROM_NAME || '',
    logoUrl: process.env.EMAIL_LOGO_URL || '', // URL to the logo image (optional)
    enabled: process.env.ENABLE_EMAIL_SENDING !== 'false', // Default to true, set to 'false' to disable
  },
});
